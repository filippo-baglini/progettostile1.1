import os
import threading
import time

import psycopg2
import psycopg2.pool
from dotenv import load_dotenv
from flask import g
from psycopg2 import extras
from psycopg2.extras import RealDictCursor

from storage_manager import delete_images, get_image_url
from ai.src.wardrobe import wardrobe_candidate

# Environment variables from the .env file
load_dotenv()

USER_FIELDS = ("id", "name", "email", "gender", "username", "avatar_id", "auth_id")
USER_COLUMNS = ", ".join(USER_FIELDS)
WARDROBE_COLUMNS = "id, section, image_id, name, color, brand, main_category"
POOL_SIZE = 4             # connections kept open (see DBManager._pool)
IDLE_CHECK_SECONDS = 30   # idle longer than this: checked with SELECT 1 before use

# No fallbacks: a missing value should stop the start, not quietly try a default password
_missing = [k for k in ('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD') if not os.getenv(k)]
if _missing:
    raise RuntimeError(f"{', '.join(_missing)} missing from the environment / .env file.")

class DBManager:
    # PostgreSQL settings
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_HOST = os.getenv('DB_HOST')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME')

    _status = {"connected": False, "error": "Not checked yet"}

    @staticmethod
    def initialize_db_connection():
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()

            DBManager._status = {
                "connected": True,
                "error": None
            }
        except Exception as e:
            DBManager._status = {
                "connected": False,
                "error": str(e)
            }
    
    # Opening a connection to Supabase takes ~330 ms, so they're kept open between requests (P3).
    # minconn = maxconn: psycopg2's pool closes a returned connection once it holds minconn idle ones.
    # ponytail: one worker (C8); Supabase's session-mode pooler holds a DB connection for each of ours,
    # shared with every other dev server and script on the project, so keep it small.
    _pool = None
    _pool_lock = threading.Lock()
    _idle_since = {}  # id(connection) -> when it went back into the pool

    @staticmethod
    def _connect_args():
        return dict(host=DBManager.DB_HOST, port=DBManager.DB_PORT, database=DBManager.DB_NAME,
                    user=DBManager.DB_USER, password=DBManager.DB_PASSWORD)

    @staticmethod
    def _checkout():
        """(connection, pooled?): a pooled one when free, alive, else a connection of its own."""
        with DBManager._pool_lock:
            if DBManager._pool is None:
                DBManager._pool = psycopg2.pool.ThreadedConnectionPool(POOL_SIZE, POOL_SIZE, **DBManager._connect_args())
        try:
            for _ in range(POOL_SIZE + 1):
                conn = DBManager._pool.getconn()
                idle = time.monotonic() - DBManager._idle_since.pop(id(conn), time.monotonic())
                if not conn.closed and idle < IDLE_CHECK_SECONDS:
                    return conn, True
                try:  # Supabase drops connections left idle: check before use
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT 1")
                    conn.rollback()
                    return conn, True
                except psycopg2.Error:
                    DBManager._pool.putconn(conn, close=True)  # the pool opens a fresh one next time
        except psycopg2.pool.PoolError:
            pass  # all in use (long outfit requests hold theirs): no worse than before the pool
        return psycopg2.connect(**DBManager._connect_args()), False

    @staticmethod
    def get_db_connection():
        """This request's connection: the same one for all its queries, from the pool."""
        if 'db' not in g:
            g.db, g.db_pooled = DBManager._checkout()
        return g.db

    @staticmethod
    def check_db_connection():
        return DBManager._status

    @staticmethod
    def run_search(sql: str, params: dict) -> list[dict]:
        """Rows of a read-only search function (search_outfits_batch, search_wardrobe_batch).
        A failed search is rolled back, so the request can still save its messages afterwards."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def close_db_connection(e=None):
        """End of request: the connection goes back to the pool, never with a transaction still open."""
        conn = g.pop('db', None)
        pooled = g.pop('db_pooled', False)
        if conn is None:
            return
        if not pooled:
            conn.close()
            return
        try:
            conn.rollback()  # a failed or unfinished request must not hand its transaction to the next one
        except psycopg2.Error:
            DBManager._pool.putconn(conn, close=True)
            return
        DBManager._idle_since[id(conn)] = time.monotonic()
        DBManager._pool.putconn(conn)

    @staticmethod
    def get_user_preferences(user_id: int) -> dict:
        """The user's saved preferences by their DB name, e.g. {'Color': 'red', 'Brand': 'Nike, Zara'}."""

        query = """
                SELECT p.name, up.value
                FROM users u
                         INNER JOIN user_preference up ON u.id = up.user_id
                         INNER JOIN preferences p ON up.preference_id = p.id
                WHERE u.id = %s
                """

        # An error must not read as "no preferences": saving replaces them all, so a later save would wipe them
        conn = DBManager.get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(query, (user_id,))
            return {row[0]: row[1] for row in cursor.fetchall()}


    @staticmethod
    def update_user_profile(user_id: int, new_name: str, new_username: str) -> bool:
        """Updates name and username. A username already taken raises psycopg2.errors.UniqueViolation."""
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET name = %s, username = %s WHERE id = %s", (new_name, new_username, user_id))
            updated = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            return updated
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise

    @staticmethod
    def set_user_avatar(user_id: int, avatar_id: str):
        """Saves the new avatar and returns the previous one's id (to delete from storage), or None."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE users u SET avatar_id = %s FROM users old WHERE u.id = old.id AND u.id = %s RETURNING old.avatar_id",
                    (avatar_id, user_id)
                )
                row = cursor.fetchone()
            conn.commit()
            return row[0] if row else None
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def update_user_preferences(user_id: int, new_preferences: dict) -> bool:
        # Gender lives on users, not in user_preference.
        # A sentinel tells "not sent" apart from "sent empty" (which clears it)
        gender_not_provided = object()
        gender = new_preferences.pop("gender", gender_not_provided)

        # Empty values are left out: no empty preferences are saved
        values_list = [(user_id, k, str(v)) for k, v in new_preferences.items() if v and str(v).strip()]

        # Every preference is replaced: delete them all, then insert the new ones
        delete_query = "DELETE FROM user_preference WHERE user_id = %s"

        # No ON CONFLICT needed after the delete; the JOIN turns the preference name into its id
        insert_query = """
                       INSERT INTO user_preference (user_id, preference_id, value)
                       SELECT data.uid, p.id, data.p_val
                       FROM (VALUES %s) AS data (uid, p_name, p_val)
                                JOIN preferences p ON p.name = data.p_name \
                       """

        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            cursor.execute(delete_query, (user_id,))

            if values_list:
                psycopg2.extras.execute_values(
                    cursor,
                    insert_query,
                    values_list,
                    template=None,
                    page_size=100
                )

            # Gender only if it was sent; an empty one is stored as NULL
            if gender is not gender_not_provided:
                cursor.execute("UPDATE users SET gender = %s WHERE id = %s", (gender if gender else None, user_id))

            conn.commit()
            cursor.close()
            return True

        except Exception:
            if conn:
                conn.rollback()
            raise

    @staticmethod
    def get_user_by_id(user_id: int):
        """The user with this id as a dict of USER_FIELDS, or None."""
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT {USER_COLUMNS} FROM users WHERE id = %s LIMIT 1",
                (user_id,)
            )
            row = cursor.fetchone()
            cursor.close()
            if row:
                return dict(zip(USER_FIELDS, row))
            return None
        except Exception:
            raise


    @staticmethod
    def get_or_create_auth_user(auth_id: str, email: str, name: str):
        """The users row of a Supabase Auth account, created on its first request. A row from before Supabase
        Auth with the same email is taken over: Supabase only issues tokens for confirmed emails.
        None if the email already belongs to another account."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(f"SELECT {USER_COLUMNS} FROM users WHERE auth_id = %s", (auth_id,))
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        f"UPDATE users SET auth_id = %s WHERE lower(email) = lower(%s) AND auth_id IS NULL RETURNING {USER_COLUMNS}",
                        (auth_id, email))
                    row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        f"INSERT INTO users (name, email, auth_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING RETURNING {USER_COLUMNS}",
                        (name, email, auth_id))
                    row = cursor.fetchone()
                if not row:  # a parallel first request just created it (or the email is taken)
                    cursor.execute(f"SELECT {USER_COLUMNS} FROM users WHERE auth_id = %s", (auth_id,))
                    row = cursor.fetchone()
            conn.commit()
            return dict(zip(USER_FIELDS, row)) if row else None
        except Exception:
            conn.rollback()
            raise


    @staticmethod
    def get_user_conversations(user_id: int):
        """All of a user's conversations, as a list of dicts."""
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, title, created_at FROM conversations WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cursor.fetchall()
            cursor.close()
            conversations = []
            for row in rows:
                conversations.append({
                    "id": row[0],
                    "title": row[1],
                    "created_at": row[2]
                })
            return conversations
        except Exception:
            raise

    @staticmethod
    def get_chat_messages(user_id, conversation_id)->list[dict]:
        """The chat's messages in order; the AI's replies come with their full 'outfits'."""
        conn = DBManager.get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
                WITH chat_history AS (
                    -- 1. MESSAGGI UTENTE (Prompts)
                    SELECT
                        p.id AS message_id,
                        p.prompt AS text,
                        NULL AS explanation,
                        'user' AS role,
                        p.created_at,
                        '[]'::json AS outfits,
                        p.image_id,
                        NULL as status,
                        NULL::jsonb AS budget_options,
                        NULL::jsonb AS outfit_generation_options,
                        NULL::jsonb AS wardrobe_suggestion,
                        -- Wardrobe pieces the user picked for this message (deleted ones drop out)
                        (SELECT json_agg(json_build_object('id', wi.id, 'image_id', wi.image_id) ORDER BY wi.id)
                         FROM wardrobe_items wi
                         WHERE wi.id = ANY(p.wardrobe_item_ids) AND wi.user_id = c.user_id) AS wardrobe_items
                    FROM prompts p
                             JOIN conversations c ON p.conversation_id = c.id
                    WHERE p.conversation_id = %s AND c.user_id IS NOT DISTINCT FROM %s

                    UNION ALL

                    -- 2. MESSAGGI AI (AI Responses)
                    SELECT
                        ar.id AS message_id,
                        ar.short_message AS text,
                        ar.explanation AS explanation,
                        'model' AS role,
                        ar.created_at,
                        COALESCE(
                            (
                                SELECT json_agg(
                                    json_build_object(
                                        'outfit', items,
                                        'cost', cost,
                                        'budget', budget, -- Retrieve stored budget
                                        'explanation', (SELECT oe.explanation FROM outfit_explanations oe
                                                        WHERE oe.ai_response_id = ar.id AND oe.outfit_index = grouped_outfits.outfit_index)
                                    ) ORDER BY outfit_index
                                )
                                FROM (
                                    SELECT 
                                        os.outfit_index,
                                        json_agg(
                                            CASE WHEN os.wardrobe_item_id IS NOT NULL THEN
                                                -- The user's own piece: completed by wardrobe_candidate() below
                                                json_build_object(
                                                    'source', 'wardrobe',
                                                    'id', wi.id,
                                                    'section', wi.section,
                                                    'image_id', wi.image_id,
                                                    'name', wi.name,
                                                    'color', wi.color,
                                                    'brand', wi.brand,
                                                    'main_category', wi.main_category
                                                )
                                            ELSE json_build_object(
                                                'id', pd.id,
                                                'title', pd.title,
                                                'url', pd.url,
                                                'price', pd.price,
                                                'image_link', pd.image_link,
                                                'brand', pd.brand,
                                                'material', pd.material,
                                                'availability', pd.availability,
                                                'main_category', pd.main_category,
                                                'description', pd.schema_description
                                            ) END
                                        ) AS items,
                                        SUM(COALESCE(pd.price, 0)) as cost,
                                        MAX(os.budget) as budget -- Since budget is replicated for items in same outfit, MAX/MIN is fine
                                    FROM outfit_suggestion os
                                    LEFT JOIN product_data pd ON os.product_id = pd.id
                                    LEFT JOIN wardrobe_items wi ON os.wardrobe_item_id = wi.id
                                    WHERE os.ai_response_id = ar.id
                                    GROUP BY os.outfit_index
                                ) grouped_outfits
                            ),
                            '[]'::json
                        ) AS outfits,
                        NULL AS image_id,
                        ar.status as status,
                        ar.budget_options,
                        ar.outfit_generation_options,
                        ar.wardrobe_suggestion,
                        NULL::json AS wardrobe_items
                    FROM ai_responses ar
                             JOIN conversations c ON ar.conversation_id = c.id
                    WHERE ar.conversation_id = %s AND c.user_id IS NOT DISTINCT FROM %s
                )

                -- 3. ORDINAMENTO FINALE
                SELECT * FROM chat_history
                ORDER BY created_at; \
                """

        # The parameters for both halves of the UNION
        cursor.execute(query, (conversation_id, user_id, conversation_id, user_id))

        results = cursor.fetchall()
        cursor.close()

        last_user_photo = None  # the "Add to your wardrobe?" card shows the photo it answers
        for message in results:
            if message.get("role") == "user":
                del message['explanation'], message['outfits'], message['budget_options'], message['outfit_generation_options']
                del message['wardrobe_suggestion']
                if message['image_id']:
                    file_path = f"public/{message['image_id']}.jpg"
                    message['image_id'] = get_image_url(file_path)
                last_user_photo = message['image_id']
                message['wardrobe_items'] = [
                    {"id": piece['id'], "image_url": get_image_url(f"public/{piece['image_id']}.jpg", "wardrobe")}
                    for piece in message['wardrobe_items'] or []
                ]
            else:
                del message['wardrobe_items']
                if message['wardrobe_suggestion']:
                    message['wardrobe_suggestion'] = {**message['wardrobe_suggestion'], 'image_url': last_user_photo}
                for outfit in message['outfits']:
                    outfit['outfit'] = [wardrobe_candidate(item) if item.get('source') == 'wardrobe' else item
                                        for item in outfit['outfit']]

        return results

    @staticmethod
    def create_conversation_with_message(user_id: int | None, title: str, message_text: str, image_id = None, wardrobe_item_ids=None,
                                         guest_token: str | None = None, guest_gender: str | None = None):
        """Creates a conversation (a user's, or a guest's with guest_token) with its first message.
        Returns the new conversation's id, or None if saving failed."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                "INSERT INTO conversations (user_id, title, guest_token, guest_gender) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, title and title[:255], guest_token, guest_gender)  # VARCHAR(255)
            )
            conversation_id = cursor.fetchone()[0]

            cursor.execute(
                "INSERT INTO prompts (conversation_id, prompt, image_id, wardrobe_item_ids) VALUES (%s, %s, %s, %s)",
                (conversation_id, message_text, image_id, wardrobe_item_ids or None)
            )

            conn.commit()
            cursor.close()

            return conversation_id

        except Exception as e:
            if conn:
                conn.rollback()  # neither the conversation nor the message is kept
            print(f"Error creating the conversation: {e}")
            return None

    @staticmethod
    def add_ai_response(conversation_id, response_data, wardrobe_suggestion=None):
        """Saves the AI's reply and its outfits (one outfit_suggestion row per item). Returns the reply's id.
        response_data: the outfit pipeline's result ('message', 'outfits', ...)."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            short_message = response_data.get('message')
            if not short_message:
                short_message = "Here are your outfit options."
            
            explanation = response_data.get('explanation')
            
            # Handle new 'outfits' structure
            outfits_list = response_data.get('outfits')
            
            # Fallback for legacy single outfit
            if not outfits_list and response_data.get('outfit'):
                outfits_list = [{'outfit': response_data.get('outfit')}]

            if not outfits_list:
                # Just save message if no outfits
                pass

            insert_response_query = """
                                    INSERT INTO ai_responses (conversation_id, short_message, explanation, status, wardrobe_suggestion)
                                    VALUES (%s, %s, %s, 'COMPLETED', %s)
                                    RETURNING id; \
                                    """
            cursor.execute(insert_response_query, (conversation_id, short_message, explanation,
                                                   extras.Json(wardrobe_suggestion) if wardrobe_suggestion else None))
            new_ai_response_id = cursor.fetchone()[0]

            # 3. Gestisci i prodotti e i suggerimenti
            if outfits_list:
                for idx, outfit_obj in enumerate(outfits_list):
                    items = outfit_obj.get('outfit', [])
                    for item in items:
                        item_id = item.get('id')
                        if not item_id:
                            continue

                        # A catalogue product, or one of the user's wardrobe pieces ('w<id>')
                        if item.get('source') == 'wardrobe':
                            product_id, wardrobe_item_id = None, int(str(item_id).removeprefix('w'))
                        else:
                            product_id, wardrobe_item_id = item_id, None

                        # One row per item, with its outfit's index and budget
                        insert_suggestion_query = """
                                                  INSERT INTO outfit_suggestion (ai_response_id, product_id, wardrobe_item_id, outfit_index, budget)
                                                  VALUES (%s, %s, %s, %s, %s)
                                                  ON CONFLICT DO NOTHING; \
                                                  """
                        # Extract budget from the outfit object (passed from app.py/LLM)
                        # We use 0 as default if not present, similar to logic in app.py
                        outfit_budget = outfit_obj.get('budget', 0)
                        
                        cursor.execute(insert_suggestion_query, (new_ai_response_id, product_id, wardrobe_item_id, idx, outfit_budget))

            # Conferma le modifiche (Commit)
            conn.commit()
            cursor.close()
            return new_ai_response_id

        except psycopg2.Error as e:
            if conn:
                conn.rollback()  # nothing of the reply is kept
            print(f"Database error: {e}")
            raise e

    @staticmethod
    def add_simple_ai_response(conversation_id, message, status, budget_options=None, outfit_generation_options=None, wardrobe_suggestion=None):
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            insert_response_query = """
                                    INSERT INTO ai_responses (conversation_id, short_message, status, budget_options, outfit_generation_options, wardrobe_suggestion)
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                    RETURNING id; \
                                    """
            cursor.execute(insert_response_query, (
                conversation_id, message, status,
                extras.Json(budget_options) if budget_options else None,
                extras.Json(outfit_generation_options) if outfit_generation_options else None,
                extras.Json(wardrobe_suggestion) if wardrobe_suggestion else None,
            ))
            new_ai_response_id = cursor.fetchone()[0]

            # Conferma le modifiche (Commit)
            conn.commit()
            cursor.close()
            return new_ai_response_id

        except psycopg2.Error as e:
            if conn:
                conn.rollback()  # nothing of the reply is kept
            print(f"Database error: {e}")
            raise e


    @staticmethod
    def save_outfit_explanation(ai_response_id: int, outfit_index: int, explanation: str) -> None:
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO outfit_explanations (ai_response_id, outfit_index, explanation) VALUES (%s, %s, %s)"
                    " ON CONFLICT DO NOTHING",  # two clicks at once: the first one is kept
                    (ai_response_id, outfit_index, explanation))
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def guest_conversation(guest_token: str):
        """(conversation id, guest gender) of a guest's chat, or None."""
        conn = DBManager.get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, guest_gender FROM conversations WHERE guest_token = %s", (guest_token,))
            return cursor.fetchone()

    @staticmethod
    def delete_idle_guest_conversations(idle_hours: int) -> list[str]:
        """Deletes guest chats with no message for idle_hours. Returns their photos' ids, to delete from storage."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """WITH idle AS (
                           SELECT c.id FROM conversations c
                           WHERE c.guest_token IS NOT NULL
                             AND COALESCE((SELECT MAX(p.created_at) FROM prompts p WHERE p.conversation_id = c.id), c.created_at)
                                 < now() - make_interval(hours => %s)),
                       photos AS (SELECT p.image_id FROM prompts p JOIN idle ON p.conversation_id = idle.id WHERE p.image_id IS NOT NULL),
                       gone AS (DELETE FROM conversations WHERE id IN (SELECT id FROM idle))
                       SELECT image_id FROM photos""",
                    (idle_hours,))
                image_ids = [row[0] for row in cursor.fetchall()]
            conn.commit()
            return image_ids
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def delete_guest_conversation(conversation_id: int) -> list[str]:
        """Deletes a guest chat (never a user's). Returns its photos' ids, to delete from storage."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """WITH guest_chat AS (SELECT id FROM conversations WHERE id = %s AND guest_token IS NOT NULL),
                       photos AS (SELECT p.image_id FROM prompts p JOIN guest_chat g ON p.conversation_id = g.id WHERE p.image_id IS NOT NULL),
                       gone AS (DELETE FROM conversations WHERE id IN (SELECT id FROM guest_chat))
                       SELECT image_id FROM photos""",
                    (conversation_id,))
                image_ids = [row[0] for row in cursor.fetchall()]
            conn.commit()
            return image_ids
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def conversation_belongs_to(user_id: int, conversation_id) -> bool:
        conn = DBManager.get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM conversations WHERE id = %s AND user_id = %s", (conversation_id, user_id))
            return cursor.fetchone() is not None

    @staticmethod
    def add_message_to_conversation(conversation_id: int, text: str, image_id=None, wardrobe_item_ids=None):
        """Adds a user message to a conversation; the caller has checked it is theirs. False if saving failed."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                "INSERT INTO prompts (conversation_id, prompt, image_id, wardrobe_item_ids) VALUES (%s, %s, %s, %s)",
                (conversation_id, text, image_id, wardrobe_item_ids or None)
            )

            conn.commit()
            cursor.close()
            return True

        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Error saving the message: {e}")
            return False

    @staticmethod
    def delete_conversation(user_id: int, conversation_id: int) -> bool:
        """Deletes one of the user's conversations and its photos in storage.
        False if it doesn't exist or isn't theirs."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT p.image_id
                FROM prompts p
                         JOIN conversations c ON p.conversation_id = c.id
                WHERE c.id = %s AND c.user_id = %s AND p.image_id IS NOT NULL
                """,
                (conversation_id, user_id)
            )

            images_to_delete = [str(row[0]) for row in cursor.fetchall()]

            cursor.execute(
                "DELETE FROM conversations WHERE id = %s AND user_id = %s",
                (conversation_id, user_id)
            )

            deleted = cursor.rowcount > 0
            conn.commit()
            cursor.close()

            # Only after the commit: a failed delete must not leave rows pointing at deleted images
            if images_to_delete:
                delete_images(images_to_delete)

            return deleted

        except Exception as e:
            print(f"Error deleting the conversation: {e}")
            if conn:
                conn.rollback()
            raise

    @staticmethod
    def delete_all_user_conversations(user_id: int) -> int:
        """Deletes all of a user's conversations and their photos in storage. Returns how many were deleted."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            # 1. The photos of all the user's conversations
            cursor.execute(
                """
                SELECT p.image_id
                FROM prompts p
                         JOIN conversations c ON p.conversation_id = c.id
                WHERE c.user_id = %s AND p.image_id IS NOT NULL
                """,
                (user_id,)
            )

            images_to_delete = [str(row[0]) for row in cursor.fetchall()]

            # 2. The conversations (CASCADE deletes their prompts and replies)
            cursor.execute(
                "DELETE FROM conversations WHERE user_id = %s",
                (user_id,)
            )

            deleted_count = cursor.rowcount
            conn.commit()
            cursor.close()

            # 3. Only after the commit: the photos in storage
            if images_to_delete:
                delete_images(images_to_delete)

            return deleted_count

        except Exception as e:
            print(f"Error deleting all conversations: {e}")
            if conn:
                conn.rollback()
            raise

    @staticmethod
    def delete_user(user_id: int) -> bool:
        """Deletes a user and all their data, photos in storage included. False if not found."""
        conn = None
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()

            # 1. The photos of all the user's conversations (deleted from storage after the commit)
            cursor.execute(
                """
                SELECT p.image_id
                FROM prompts p
                         JOIN conversations c ON p.conversation_id = c.id
                WHERE c.user_id = %s AND p.image_id IS NOT NULL
                """,
                (user_id,)
            )
            images_to_delete = [str(row[0]) for row in cursor.fetchall()]
            cursor.execute("SELECT image_id FROM wardrobe_items WHERE user_id = %s", (user_id,))
            wardrobe_images = [row[0] for row in cursor.fetchall()]

            # 2. The user: ON DELETE CASCADE removes preferences, conversations, prompts, replies and wardrobe
            cursor.execute("DELETE FROM users WHERE id = %s RETURNING avatar_id", (user_id,))
            avatar = cursor.fetchone()

            deleted = cursor.rowcount > 0
            conn.commit()
            cursor.close()

            if images_to_delete:
                delete_images(images_to_delete)
            if avatar and avatar[0]:
                delete_images([avatar[0]], "avatars")
            if wardrobe_images:
                delete_images(wardrobe_images, "wardrobe")

            return deleted

        except Exception as e:
            print(f"Error deleting user {user_id}: {e}")
            if conn:
                conn.rollback()
            raise

    # --- Wardrobe: every query filters by user_id, so a user only ever touches their own pieces ---

    @staticmethod
    def get_wardrobe(user_id: int) -> list[dict]:
        conn = DBManager.get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(f"SELECT {WARDROBE_COLUMNS} FROM wardrobe_items WHERE user_id = %s ORDER BY created_at DESC, id DESC", (user_id,))
            return cursor.fetchall()

    @staticmethod
    def get_wardrobe_items(user_id: int, item_ids: list[int]) -> list[dict]:
        """The user's pieces among `item_ids`: ids of other users or deleted pieces are left out."""
        conn = DBManager.get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(f"SELECT {WARDROBE_COLUMNS} FROM wardrobe_items WHERE user_id = %s AND id = ANY(%s)", (user_id, list(item_ids)))
            return cursor.fetchall()

    @staticmethod
    def add_wardrobe_item(user_id: int, section: str, main_category: str, image_id: str, embedding: list[float], name, color, brand) -> dict:
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f"""INSERT INTO wardrobe_items (user_id, section, main_category, image_id, img_embedding, name, color, brand)
                        VALUES (%s, %s, %s, %s, %s::vector, %s, %s, %s) RETURNING {WARDROBE_COLUMNS}""",
                    (user_id, section, main_category, image_id, str(embedding), name, color, brand)
                )
                item = cursor.fetchone()
            conn.commit()
            return item
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def update_wardrobe_item(user_id: int, item_id: int, section: str, main_category: str, name, color, brand) -> dict | None:
        """The updated piece, or None if it doesn't exist or isn't the user's."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f"""UPDATE wardrobe_items SET section = %s, main_category = %s, name = %s, color = %s, brand = %s
                        WHERE id = %s AND user_id = %s RETURNING {WARDROBE_COLUMNS}""",
                    (section, main_category, name, color, brand, item_id, user_id)
                )
                item = cursor.fetchone()
            conn.commit()
            return item
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def delete_wardrobe_item(user_id: int, item_id: int) -> str | None:
        """The deleted piece's image_id (to remove from storage), or None if not found."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM wardrobe_items WHERE id = %s AND user_id = %s RETURNING image_id", (item_id, user_id))
                row = cursor.fetchone()
            conn.commit()
            return row[0] if row else None
        except Exception:
            conn.rollback()
            raise

    # --- "Add to your wardrobe?" on a reply to a photo of the user's own piece ---

    @staticmethod
    def get_chat_photo_for_response(user_id: int, ai_response_id: int) -> dict | None:
        """The user prompt an AI reply answered (its photo) and the reply's pending suggestion,
        or None if the reply doesn't exist or isn't in one of the user's conversations."""
        conn = DBManager.get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """SELECT p.id AS prompt_id, p.image_id, ar.wardrobe_suggestion
                   FROM ai_responses ar
                   JOIN conversations c ON c.id = ar.conversation_id
                   -- prompts are saved just before their reply
                   JOIN LATERAL (SELECT id, image_id FROM prompts
                                 WHERE conversation_id = ar.conversation_id AND created_at <= ar.created_at
                                 ORDER BY created_at DESC, id DESC LIMIT 1) p ON true
                   WHERE ar.id = %s AND c.user_id = %s""",
                (ai_response_id, user_id)
            )
            return cursor.fetchone()

    @staticmethod
    def add_piece_to_response(ai_response_id: int, prompt_id: int, wardrobe_item_id: int, one_per_outfit: bool) -> list[int]:
        """Puts a piece just added from a chat photo into the conversation, and clears the suggestion:
        - on the prompt, like a picked piece, so the next outfit is built around it;
        - in each outfit option the reply already shows, except options that already have a piece of a
          one-per-outfit category (`one_per_outfit`) like it.
        Returns the outfit indexes it was added to."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE prompts SET wardrobe_item_ids = array_append(COALESCE(wardrobe_item_ids, '{}'), %s) WHERE id = %s",
                    (wardrobe_item_id, prompt_id)
                )
                cursor.execute(
                    """INSERT INTO outfit_suggestion (ai_response_id, wardrobe_item_id, outfit_index, budget)
                       SELECT %(response)s, %(piece)s, os.outfit_index, MAX(os.budget)
                       FROM outfit_suggestion os
                       LEFT JOIN product_data pd ON pd.id = os.product_id
                       LEFT JOIN wardrobe_items wi ON wi.id = os.wardrobe_item_id
                       WHERE os.ai_response_id = %(response)s
                       GROUP BY os.outfit_index
                       HAVING NOT (%(one_per_outfit)s AND bool_or(COALESCE(pd.main_category, wi.main_category) =
                                   (SELECT main_category FROM wardrobe_items WHERE id = %(piece)s)))
                       RETURNING outfit_index""",
                    {"response": ai_response_id, "piece": wardrobe_item_id, "one_per_outfit": one_per_outfit}
                )
                outfit_indexes = sorted(row[0] for row in cursor.fetchall())
                cursor.execute("UPDATE ai_responses SET wardrobe_suggestion = NULL WHERE id = %s", (ai_response_id,))
            conn.commit()
            return outfit_indexes
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def claim_wardrobe_suggestion(ai_response_id: int) -> bool:
        """Clears a reply's pending suggestion if it still has one. The row lock makes this True for only one
        of two simultaneous requests (a double tap), so a piece is added once."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("UPDATE ai_responses SET wardrobe_suggestion = NULL WHERE id = %s AND wardrobe_suggestion IS NOT NULL",
                               (ai_response_id,))
                claimed = cursor.rowcount > 0
            conn.commit()
            return claimed
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def restore_wardrobe_suggestion(ai_response_id: int, suggestion: dict) -> None:
        """Puts back a suggestion claimed by a request that then failed, so the card can be tapped again."""
        conn = DBManager.get_db_connection()
        conn.rollback()  # the failure may have left the transaction aborted
        with conn.cursor() as cursor:
            cursor.execute("UPDATE ai_responses SET wardrobe_suggestion = %s WHERE id = %s", (extras.Json(suggestion), ai_response_id))
        conn.commit()

    @staticmethod
    def clear_wardrobe_suggestion(user_id: int, ai_response_id: int) -> bool:
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE ai_responses ar SET wardrobe_suggestion = NULL
                       FROM conversations c WHERE c.id = ar.conversation_id AND ar.id = %s AND c.user_id = %s""",
                    (ai_response_id, user_id)
                )
                updated = cursor.rowcount > 0
            conn.commit()
            return updated
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def rename_conversation(user_id: int, conversation_id: int, new_title: str) -> bool:
        """Renames one of the user's conversations. False if it doesn't exist or isn't theirs."""
        try:
            conn = DBManager.get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE conversations SET title = %s WHERE id = %s AND user_id = %s",
                (new_title[:255], conversation_id, user_id)  # VARCHAR(255)
            )
            updated = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            return updated
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def preferences():
        """Every preference with the values to choose from: {id: {"name": ..., "values": [...]}}.
        Values are filled in for brand, material and gender; the others (colour) are free text."""
        conn = DBManager.get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name FROM preferences")
            rows = cursor.fetchall()

            preferences = {}
            for row in rows:
                pref_id = row[0]
                pref_name = row[1]
                preferences[pref_id] = {
                    "name": pref_name,
                    "values": []
                }

            for pref_id, pref_data in preferences.items():
                match int(pref_id):
                    case 2: # Brand
                        cursor.execute("SELECT brand FROM product_data WHERE brand IS NOT NULL GROUP BY brand")
                        brands = [row[0] for row in cursor.fetchall()]
                        pref_data["values"] = brands

                    case 3: # Material
                        cursor.execute("SELECT name FROM materials")
                        materials = [row[0] for row in cursor.fetchall()]
                        pref_data["values"] = materials

                    case 4: # Gender ('Genere' in the DB)
                        pref_data["values"] = ["male", "female", "non-binary"]

            return preferences