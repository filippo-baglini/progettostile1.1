import logging
import re
import time
import uuid
from urllib.parse import urlparse

from flask import Flask, request
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, current_user, login_required
from werkzeug.exceptions import HTTPException

from auth import verify_token, display_name, delete_auth_user
from db_manager import DBManager
import os
import title_generator

from ai.src.app import outfit_recommendation_handler, generate_explanation_only, MODEL, PROC, DEVICE
from ai.src.query_embedder import get_image_embedding_vector
from ai.src.wardrobe import WARDROBE_SECTIONS, wardrobe_candidate, check_wardrobe_piece
from ai.src.query_handler import SINGLE_ITEM_CATEGORIES
from ai.src import progress
from storage_manager import upload_image, compress_image, download_image, get_image_url, delete_images
import psycopg2.errors
from rate_limit import rate_limit

app = Flask(__name__)
# Signs Flask's session cookie. Logins no longer use it (Supabase tokens, see auth.py), but a guessable
# fallback would still be a trap if anything starts storing data in the session
if not os.getenv('SECRET_KEY'):
    raise RuntimeError("SECRET_KEY is missing from the environment / .env file.")
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
# Uploads bigger than this get a 413 before they reach PIL
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# CORS configuration for frontend
CORS(app, 
     origins=[
         "http://localhost:5173", 
         "http://localhost:5174",
         "http://127.0.0.1:5173",
         "http://127.0.0.1:5174"
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Request-Id"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.teardown_appcontext(DBManager.close_db_connection)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.unauthorized_handler
def unauthorized():
    return {"error": "Not authenticated"}, 401


# ponytail: in-memory guest chats (with image bytes), capped so guests can't grow it forever;
# oldest conversations are evicted first and everything is lost on restart.
# Guest chats are deleted when the guest leaves them (see end_guest_chat); this catches the ones whose
# goodbye never arrived (browser crashed, phone killed the tab), with their photos
GUEST_CHAT_IDLE_HOURS = 2
_last_guest_cleanup = 0.0


def cleanup_guest_chats():
    """Deletes idle guest chats. Called from guest requests and runs at most hourly: no guests, nothing to clean.
    ponytail: per process, so each worker runs it; harmless (idempotent). Move to a scheduled job if it ever slows a request."""
    global _last_guest_cleanup
    if time.monotonic() - _last_guest_cleanup < 3600:
        return
    _last_guest_cleanup = time.monotonic()
    try:
        image_ids = DBManager.delete_idle_guest_conversations(GUEST_CHAT_IDLE_HOURS)
        if image_ids:
            delete_images(image_ids)
    except Exception:
        logging.exception("Guest chat cleanup failed")  # retried in an hour; the request goes on


def find_conversation(conv_id):
    """(DB id, guest gender) of the chat conv_id names, if the caller owns it; else None.
    Users name their chats by DB id, guests by temp_<guest_token>, which only their browser knows."""
    if current_user.is_authenticated:
        try:
            db_id = int(conv_id)
        except (TypeError, ValueError):
            return None
        return (db_id, None) if DBManager.conversation_belongs_to(int(current_user.get_id()), db_id) else None
    token = str(conv_id or '').removeprefix('temp_')
    try:
        uuid.UUID(token)
    except ValueError:
        return None
    return DBManager.guest_conversation(token)



def server_error(e):
    """Log the full error server-side; never send internal details to the client."""
    if isinstance(e, HTTPException):  # e.g. 413 from MAX_CONTENT_LENGTH: keep its status, not a 500
        return {"error": e.description}, e.code
    logging.exception(e)
    return {"error": "Internal server error"}, 500


USERNAME_RE = re.compile(r'[a-z0-9._]{3,30}')


def chat_title(output, msg_text):
    """Title for a new chat; a blocked message never gets a title written from its own words."""
    if output.get('status') == 'Guardrail':
        # ponytail: tells the two guardrails apart by their fixed messages in query_handler.py
        message = (output.get('message') or '').lower()
        return "Offensive content" if 'offensive' in message or 'hate' in message else "Off-topic request"
    return output.get('conversation_title') or title_generator.generate_title(msg_text)


def user_payload(user):
    """The user as the frontend sees it: profile fields plus preferences (gender lives on users)."""
    preferences = DBManager.get_user_preferences(user['id'])
    if user.get('gender'):
        preferences['gender'] = user['gender']
    return {
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "username": user['username'],
        "avatar_url": get_image_url(f"public/{user['avatar_id']}.jpg", "avatars") if user['avatar_id'] else None,
        "preferences": preferences,
    }

class AppUser(UserMixin):
    def __init__(self, user_dict):
        self.id = user_dict['id']
        self.email = user_dict['email']
        self.gender = user_dict.get('gender')
        self.auth_id = str(user_dict['auth_id'])

    def get_id(self):  # type: ignore[override]
        return str(self.id)

@login_manager.request_loader
def load_user_from_request(req):
    """Logged-in requests carry a Supabase access token; anything else is a guest."""
    header = req.headers.get('Authorization', '')
    claims = verify_token(header.removeprefix('Bearer ')) if header.startswith('Bearer ') else None
    if not claims or not claims.get('email'):
        return None
    user = DBManager.get_or_create_auth_user(claims['sub'], claims['email'], display_name(claims))
    return AppUser(user) if user else None

with app.app_context():
    DBManager.initialize_db_connection()
    db_status = DBManager.check_db_connection()

@app.route('/')
def index():
    """Homepage che mostra lo stato della connessione al database."""
    if db_status["connected"]:
        return {
            "message": "Welcome to StyleFinderAI API",
            "status": "running",
            "database": "connected"
        }, 200
    else:
        return {
            "message": "Welcome to StyleFinderAI API",
            "status": "running",
            "database": "disconnected"
        }, 500


@app.route('/api/user/session', methods=['GET'])
@login_required
def check_session():
    """The logged-in user (from the Supabase token in the Authorization header).

    Risposte:
      - 401 se il token manca o non è valido
      - 200 se valido {success: true, user: {...}}
    """
    try:
        # Recupero completo utente dal DB se servono preferenze
        user_db = DBManager.get_user_by_id(int(current_user.get_id()))
        return {"success": True, "user": user_payload(user_db) if user_db else {}}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/user/delete', methods=['DELETE'])
@login_required
def delete_account():
    """Elimina l'account dell'utente autenticato.

    Non richiede parametri nel body (usa current_user).
    Risposte:
      - 401 se non autenticato
      - 200 con {success: true}
    """
    try:
        user_id = int(current_user.get_id())
        if not DBManager.delete_user(user_id):
            return {"error": "Utente non trovato"}, 404
        # After our data and photos are gone: the login itself goes last
        delete_auth_user(current_user.auth_id)
        return {"success": True}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/user/profile', methods=['PUT'])
@login_required
def update_profile():
    """
    Endpoint per aggiornare il profilo (nome e username).
    Richiede JSON: { "name": "...", "username": "..." } (username opzionale: se manca resta quello attuale)
    Ritorna: { "success": true, "user": {...} }, 409 se lo username è già preso
    """
    try:
        data = request.get_json() or {}
        new_name = (data.get('name') or '').strip()

        if not new_name:
            return {"error": "Nome mancante"}, 400

        user_id = int(current_user.get_id())
        user_db = DBManager.get_user_by_id(user_id)
        if not user_db:
            return {"error": "Utente non trovato"}, 404

        new_username = (data.get('username') or user_db['username']).strip().lower()
        # The generated default (with '-') is kept as is; a new one must follow the rules
        if new_username != user_db['username'] and not USERNAME_RE.fullmatch(new_username):
            return {"error": "Username must be 3-30 characters: letters, numbers, '.' or '_'"}, 400

        try:
            DBManager.update_user_profile(user_id, new_name, new_username)
        except psycopg2.errors.UniqueViolation:
            return {"error": "Username already taken"}, 409

        return {"success": True, "user": user_payload(DBManager.get_user_by_id(user_id))}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/user/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Carica la foto profilo (multipart, campo `image`) e ritorna l'utente aggiornato."""
    try:
        avatar_id, _, error = store_uploaded_image("avatars", (512, 512))
        if error:
            return error

        user_id = int(current_user.get_id())
        old_avatar_id = DBManager.set_user_avatar(user_id, avatar_id)
        if old_avatar_id:
            delete_images([old_avatar_id], "avatars")

        return {"success": True, "user": user_payload(DBManager.get_user_by_id(user_id))}, 200
    except Exception as e:
        return server_error(e)


def store_uploaded_image(bucket, max_size):
    """Compress the request's `image` file and upload it. Returns (image_id, jpeg bytes, None) or (None, None, error response)."""
    image_uploaded = request.files.get('image')
    if not image_uploaded:
        return None, None, ({"error": "Immagine mancante"}, 400)
    try:
        image = compress_image(image_uploaded.read(), max_size=max_size)
    except Exception:
        return None, None, ({"error": "Not a valid image"}, 400)

    image_id = str(uuid.uuid4())
    if not upload_image(image_id, image, bucket):
        return None, None, ({"error": "Upload failed"}, 502)
    return image_id, image, None



def wardrobe_details(data):
    """Optional name/color/brand from a form or JSON body: trimmed, blank -> None, capped to the column sizes."""
    return [(data.get(field) or '').strip()[:limit] or None for field, limit in (('name', 255), ('color', 100), ('brand', 255))]


def wardrobe_payload(item):
    return {
        "id": item['id'],
        "section": item['section'],
        "image_url": get_image_url(f"public/{item['image_id']}.jpg", "wardrobe"),
        "name": item['name'],
        "color": item['color'],
        "brand": item['brand'],
    }


@app.route('/api/wardrobe', methods=['GET'])
@login_required
def get_wardrobe():
    try:
        items = DBManager.get_wardrobe(int(current_user.get_id()))
        return {"success": True, "items": [wardrobe_payload(item) for item in items]}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/wardrobe', methods=['POST'])
@login_required
def add_wardrobe_item():
    """Multipart: `image`, `section`, opzionali `name`, `color`, `brand`. Ritorna il capo creato."""
    try:
        section = request.form.get('section')
        if section not in WARDROBE_SECTIONS:
            return {"error": "Unknown wardrobe section"}, 400

        image_id, image, error = store_uploaded_image("wardrobe", (1024, 1024))
        if error:
            return error

        item, error = save_wardrobe_piece(int(current_user.get_id()), image_id, image, section, wardrobe_details(request.form))
        if error:
            return error
        return {"success": True, "item": wardrobe_payload(item)}, 201
    except Exception as e:
        return server_error(e)


def save_wardrobe_piece(user_id, image_id, image, section, details):
    """Saves a photo already in the wardrobe bucket as a piece, with its FashionCLIP embedding (same space as
    the catalogue, so the outfit AI can search the wardrobe). Returns (item, None) or (None, error response)
    when the piece is refused. Removes the photo if it is refused or saving fails."""
    try:
        rejection = check_wardrobe_piece(image, details)
        if rejection:
            delete_images([image_id], "wardrobe")
            return None, ({"error": rejection}, 400)
        embedding = get_image_embedding_vector(MODEL, PROC, DEVICE, image).tolist()
        return DBManager.add_wardrobe_item(user_id, section, WARDROBE_SECTIONS[section], image_id, embedding, *details), None
    except Exception:
        delete_images([image_id], "wardrobe")  # don't leave an orphan photo in storage
        raise


@app.route('/api/wardrobe/from-chat/<int:ai_response_id>', methods=['POST'])
@login_required
def add_wardrobe_item_from_chat(ai_response_id):
    """The "Add to your wardrobe?" card: copies the photo the reply answered into a new piece and puts the
    piece in the conversation's outfit. JSON: `section`, `name`, `color`, `brand` (the AI's guess, maybe edited)."""
    try:
        data = request.get_json() or {}
        section = data.get('section')
        if section not in WARDROBE_SECTIONS:
            return {"error": "Unknown wardrobe section"}, 400

        user_id = int(current_user.get_id())
        chat = DBManager.get_chat_photo_for_response(user_id, ai_response_id)
        if not chat or not chat['image_id']:
            return {"error": "Photo not found"}, 404
        if not chat['wardrobe_suggestion']:
            return {"error": "Already added to your wardrobe"}, 409  # a double tap doesn't add it twice

        photo = download_image(chat['image_id'])
        if not photo:
            return {"error": "Photo not found"}, 404
        # A copy in the wardrobe bucket: deleting the chat never deletes the piece
        image = compress_image(photo, max_size=(1024, 1024))
        image_id = str(uuid.uuid4())
        if not upload_image(image_id, image, "wardrobe"):
            return {"error": "Upload failed"}, 502
        item, error = save_wardrobe_piece(user_id, image_id, image, section, wardrobe_details(data))
        if error:
            return error

        outfit_indexes = DBManager.add_piece_to_response(
            ai_response_id, chat['prompt_id'], item['id'], item['main_category'] in SINGLE_ITEM_CATEGORIES)
        return {
            "success": True,
            "item": wardrobe_payload(item),
            "outfit_piece": wardrobe_candidate(item),  # what the outfits it joined now show
            "outfit_indexes": outfit_indexes,
        }, 201
    except Exception as e:
        return server_error(e)


@app.route('/api/wardrobe/from-chat/<int:ai_response_id>', methods=['DELETE'])
@login_required
def dismiss_wardrobe_suggestion(ai_response_id):
    try:
        if not DBManager.clear_wardrobe_suggestion(int(current_user.get_id()), ai_response_id):
            return {"error": "Reply not found"}, 404
        return {"success": True}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/wardrobe/<int:item_id>', methods=['PUT'])
@login_required
def update_wardrobe_item(item_id):
    """JSON: `section`, `name`, `color`, `brand` (i dettagli mancanti vengono svuotati)."""
    try:
        data = request.get_json() or {}
        section = data.get('section')
        if section not in WARDROBE_SECTIONS:
            return {"error": "Unknown wardrobe section"}, 400

        details = wardrobe_details(data)
        rejection = check_wardrobe_piece(None, details)
        if rejection:
            return {"error": rejection}, 400
        item = DBManager.update_wardrobe_item(int(current_user.get_id()), item_id, section, WARDROBE_SECTIONS[section], *details)
        if not item:
            return {"error": "Item not found"}, 404
        return {"success": True, "item": wardrobe_payload(item)}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/wardrobe/<int:item_id>', methods=['DELETE'])
@login_required
def delete_wardrobe_item(item_id):
    try:
        image_id = DBManager.delete_wardrobe_item(int(current_user.get_id()), item_id)
        if not image_id:
            return {"error": "Item not found"}, 404
        delete_images([image_id], "wardrobe")
        return {"success": True}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/preferences', methods=['PUT', 'POST'])
@login_required
def update_user_preferences():
    try:
        data = request.get_json() or {}

        user_id = int(current_user.get_id())
        DBManager.update_user_preferences(user_id, data)
        return {"success": True}, 200
    except Exception as e:
        return server_error(e)


@app.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    """Recupera tutte le conversazioni dell'utente autenticato.

    Non richiede parametri nel body (usa current_user).
    Risposte:
      - 401 se non autenticato
      - 200 con {success: true, conversations: [...]}
    """
    try:
        user_id = int(current_user.get_id())
        conversations = DBManager.get_user_conversations(user_id)

        return {"success": True, "conversations" : conversations}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/chat', methods=['GET', 'POST'])
@login_required
def get_messages():
    """Recupera tutte le conversazioni dell'utente autenticato.

    Non richiede parametri nel body (usa current_user).
    Risposte:
      - 401 se non autenticato
      - 200 con {success: true, conversations: [...]}
    """
    try:
        data = request.get_json() or {}

        user_id = int(current_user.get_id())
        chat_id = data.get('conv_id')

        messages = DBManager.get_chat_messages(user_id, chat_id)

        return messages, 200

    except Exception as e:
        return server_error(e)

@app.route('/api/messages/progress/<request_id>', methods=['GET'])
def message_progress(request_id):
    # Polled by the browser while a message is being answered
    return {"generating": progress.is_generating(request_id)}, 200


# The chat's gender picker offers these; the planner needs one and the catalogue search filters by it
GENDERS = ('male', 'female', 'non-binary')


def upload_chat_photo(image_id, image):
    """The photo's public URL, or None if there is no photo or the upload failed."""
    return upload_image(image_id, image) if image_id else None


def drop_chat_photo(image_id):
    """Its message couldn't be saved: nothing in the DB points at the file, so nothing else would ever delete it."""
    if image_id:
        delete_images([image_id])


@app.route('/api/messages/send', methods=['POST', 'PUT'])
@rate_limit(per_minute=10)
def send_message():
    is_authenticated = current_user.is_authenticated
    user_id = int(current_user.get_id()) if is_authenticated else None
    progress.current_request.set(request.headers.get('X-Request-Id'))
    
    try:
        image = None
        selected_outfit_index = None
        guest_gender = None  # Gender for non-authenticated users
        
        if request.is_json:
            data = request.get_json() or {}
            msg_text = data.get('message')
            conv_id = data.get('conv_id')
            selected_outfit_index = data.get('selected_outfit_index')
            selected_message_id = data.get('selected_message_id') # Extract from JSON
            guest_gender = data.get('gender')  # Get gender from request body
            wardrobe_item_ids = data.get('wardrobe_item_ids') or []
            only_wardrobe = data.get('only_wardrobe') is True
        else:
            msg_text = request.form.get('message')
            conv_id = request.form.get('conv_id')
            selected_outfit_index = request.form.get('selected_outfit_index')
            selected_message_id = request.form.get('selected_message_id') # Extract from FormData
            guest_gender = request.form.get('gender')  # Get gender from form data
            wardrobe_item_ids = request.form.getlist('wardrobe_item_ids')
            only_wardrobe = request.form.get('only_wardrobe') == 'true'
            image_uploaded = request.files.get('image')
            if image_uploaded:
                try:
                    image = compress_image(image_uploaded.read(), max_size=(1024, 1024))
                except Exception:
                    return {"error": "Not a valid image"}, 400

        # Convert selected_outfit_index to int if present
        if selected_outfit_index is not None:
            try:
                selected_outfit_index = int(selected_outfit_index)
            except ValueError:
                selected_outfit_index = None

        # The AI gets the bytes; the file is uploaded only right before its message is saved (S10)
        image_id = str(uuid.uuid4()) if image else None
        image_url = None
        image_data = (image_id, image) if image_id else None

        # Wardrobe pieces the user picked (only their own) and the "only my clothes" toggle: logged-in users only
        picked_items = []
        if is_authenticated and wardrobe_item_ids:
            try:
                picked_items = load_picked_items(user_id, [int(i) for i in wardrobe_item_ids][:10])
            except (TypeError, ValueError):
                return {"error": "Invalid wardrobe item ids"}, 400
        only_wardrobe = is_authenticated and only_wardrobe
        picked_ids = [piece['id'] for piece in picked_items]  # saved with this message

        if is_authenticated:
            guest_gender = None  # the planner uses the user's own
        else:
            cleanup_guest_chats()

        if not conv_id:
            if (current_user.gender if is_authenticated else guest_gender) not in GENDERS:
                return {"error": "Choose a gender first"}, 400
            # First message: the AI answers first, so a failure leaves no empty conversation behind
            chat_history = []
            past_images = {}
            output = outfit_recommendation_handler(msg_text, chat_history, user_id, image_data=image_data, past_images=past_images, selected_outfit_index=selected_outfit_index, guest_gender=guest_gender, picked_items=picked_items, only_wardrobe=only_wardrobe)

            conv_title = chat_title(output, msg_text)
            guest_token = None if is_authenticated else str(uuid.uuid4())
            image_url = upload_chat_photo(image_id, image)
            if image_id and not image_url:
                return {"error": "Unable to save the photo"}, 500
            db_conv_id = DBManager.create_conversation_with_message(user_id, conv_title, msg_text, image_id=image_id, wardrobe_item_ids=picked_ids,
                                                                    guest_token=guest_token, guest_gender=guest_gender)
            if db_conv_id is None:
                drop_chat_photo(image_id)
                return {"error": "Error while creating a new conversation"}, 500
            conv_id = db_conv_id if is_authenticated else f"temp_{guest_token}"

        else:
            conv_title = None
            owned = find_conversation(conv_id)
            if not owned:
                return {"error": "Conversation not found"}, 404
            db_conv_id, saved_gender = owned
            if (current_user.gender if is_authenticated else saved_gender or guest_gender) not in GENDERS:
                return {"error": "Choose a gender first"}, 400

            chat_history, past_images = load_messages(db_conv_id, user_id)

            # Pieces picked before the AI's follow-up questions still count until it builds an outfit
            if is_authenticated and not picked_items:
                for msg in reversed(chat_history):
                    if msg.get('outfits'):
                        break
                    if msg.get('wardrobe_item_ids'):
                        picked_items = load_picked_items(user_id, msg['wardrobe_item_ids'])
                        break

            output = outfit_recommendation_handler(msg_text, chat_history, user_id, image_data=image_data, past_images=past_images, selected_outfit_index=selected_outfit_index, selected_message_id=selected_message_id, guest_gender=saved_gender or guest_gender, picked_items=picked_items, only_wardrobe=only_wardrobe)

            # Saved only after the AI call: a failure no longer leaves a prompt without a reply
            image_url = upload_chat_photo(image_id, image)
            if image_id and not image_url:
                return {"error": "Unable to save the photo"}, 500
            if not DBManager.add_message_to_conversation(db_conv_id, msg_text, image_id=image_id, wardrobe_item_ids=picked_ids):
                drop_chat_photo(image_id)
                return {"error": "Unable to save the message"}, 500

        status = output.get('status')
        if not status:
            raise Exception("Error while generating recommendations")

        # A piece the user owns in this message's photo: the reply offers to add it to their wardrobe
        wardrobe_suggestion = output.get('owned_piece') if is_authenticated and image_id else None

        if status == "COMPLETED" or status == "READY_TO_GENERATE":
            text = output.get("message")
            new_ai_response_id = DBManager.add_ai_response(db_conv_id, output, wardrobe_suggestion)
        else:
            # AWAITING_INPUT, Guardrail and Error: every saved prompt gets a saved reply
            text = output.get("prompt_to_user", output.get("message"))
            new_ai_response_id = DBManager.add_simple_ai_response(
                db_conv_id, text, status, output.get("budget_options"), output.get("outfit_generation_options"),
                wardrobe_suggestion)

        response = {
            "status" : status,
            "conv_id": conv_id,
            "img_url" : image_url,
            "content" : {
                "outfit" : output.get("outfit", []),
                "outfits" : output.get("outfits", []),
                "message" : text,
                "explanation": output.get("explanation"),
                "budget_options": output.get("budget_options"),
                "outfit_generation_options": output.get("outfit_generation_options"),
                "wardrobe_suggestion": {**wardrobe_suggestion, "image_url": image_url} if wardrobe_suggestion and new_ai_response_id else None,
            },
            "message_id": new_ai_response_id
        }
        if conv_title:
            response['conv_title'] = conv_title

        return response, 200

    except Exception as e:
        return server_error(e)

@app.route('/api/guest/chat/end', methods=['POST'])
def end_guest_chat():
    """A guest left their chat (new chat, login, closed tab): it can't be reopened, so it goes now, photos too.
    Sent with navigator.sendBeacon as text/plain (no CORS preflight, so it gets out while the page closes),
    hence get_json(force=True). Always 200: there is nothing for the closing page to do with an error."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        owned = None if current_user.is_authenticated else find_conversation(data.get('conv_id'))
        if owned:
            image_ids = DBManager.delete_guest_conversation(owned[0])
            if image_ids:
                delete_images(image_ids)
    except Exception as e:
        logging.exception(e)  # the idle cleanup gets it later
    return {"success": True}, 200


@app.route('/api/outfit/explain', methods=['POST'])
@rate_limit(per_minute=20)
def explain_outfit():
    """
    Explains one outfit the AI suggested in a chat, for logged-in users and guests.
    JSON: { "conv_id": ..., "message_id": ..., "outfit_index": 0 }
    The request and the outfit come from the stored chat, never from the client,
    so this can't be used as a general-purpose LLM.
    """
    try:
        data = request.get_json() or {}
        conv_id, message_id, outfit_index = data.get('conv_id'), data.get('message_id'), data.get('outfit_index', 0)

        owned = find_conversation(conv_id)
        if not owned:
            return {"error": "Conversation not found"}, 404
        user_id = int(current_user.get_id()) if current_user.is_authenticated else None
        history = DBManager.get_chat_messages(user_id, owned[0])

        reply_index = next((i for i, msg in enumerate(history)
                            if msg.get('role') == 'model' and str(msg.get('message_id')) == str(message_id)), None)
        outfits = history[reply_index].get('outfits') or [] if reply_index is not None else []
        if not isinstance(outfit_index, int) or not 0 <= outfit_index < len(outfits):
            return {"error": "Outfit not found"}, 404

        outfit = outfits[outfit_index]
        if outfit.get('explanation'):  # asked before: no new model call
            return {"success": True, "explanation": outfit['explanation']}, 200

        chat_so_far = "\n".join(f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['text']}"
                                for msg in history[:reply_index] if msg.get('text'))
        items = [{field: item.get(field) for field in ('title', 'brand', 'price', 'main_category', 'description')}
                 for item in outfit.get('outfit', [])]
        explanation = generate_explanation_only(chat_so_far, items)
        if not explanation:
            return {"error": "Couldn't explain this outfit right now. Please try again."}, 502

        # Saved, so reopening the chat shows it
        DBManager.save_outfit_explanation(int(message_id), outfit_index, explanation)
        return {"success": True, "explanation": explanation}, 200

    except Exception as e:
        return server_error(e)


def load_picked_items(user_id, item_ids):
    """The user's own wardrobe pieces among item_ids, with their photo for the outfit planner."""
    pieces = DBManager.get_wardrobe_items(user_id, item_ids)
    for piece in pieces:
        piece['image_bytes'] = download_image(piece['image_id'], "wardrobe")
    return pieces


# Only the chat's latest photos go back to the AI with each message: the rest would make every request
# slower and costlier (and hit the model's image limit), and users refer to their latest photos
PAST_PHOTOS_SENT = 3


def load_messages(conv_id, user_id):
    """The chat as the outfit planner reads it, and the bytes of its last PAST_PHOTOS_SENT photos.
    user_id None: a guest chat the caller has checked."""
    messages = DBManager.get_chat_messages(user_id, conv_id)
    with_photo = [m for m in messages if m.get("role") == "user" and m.get("image_id")]
    recent_photos = {id(m) for m in with_photo[-PAST_PHOTOS_SENT:]}

    chat_history = []
    past_images = dict()

    for message in messages:
        simple_message = {
            "role": message.get("role"),
            "text": message.get("text"),
            "message_id": message.get("message_id")
        }

        if message.get("outfit"):
            simple_message["outfit"] = message["outfit"]
        
        if message.get("outfits"):
            simple_message["outfits"] = message["outfits"]

        if message.get("wardrobe_items"):
            simple_message["wardrobe_item_ids"] = [piece['id'] for piece in message["wardrobe_items"]]

        raw_url = message.get("image_id")

        if id(message) in recent_photos:
            try:
                parsed_path = urlparse(raw_url).path
                filename = os.path.basename(parsed_path)
                message_image_id = os.path.splitext(filename)[0]
                simple_message["image_id"] = message_image_id

                image_bytes = download_image(message_image_id)
                if image_bytes:
                    past_images[message_image_id] = image_bytes
                else:
                    print("Error while retrieving bytes from past images")

            except Exception as e:
                print(e)

        chat_history.append(simple_message)
    return chat_history, past_images


@app.route('/api/conversations/rename', methods=['PUT', 'POST'])
@login_required
def rename_conversation():
    """Rinomina una conversazione dell'utente autenticato.

    Body JSON: {"title": "Nuovo titolo"}
    Risposte:
      - 401 se non autenticato
      - 400 se manca il titolo
      - 404 se conversazione non trovata o non appartiene all'utente
      - 200 con {success: true}
    """
    try:
        data = request.get_json() or {}
        new_title = data.get('title')
        conversation_id = data.get("conv_id")

        if not new_title:
            return {"error": "Titolo mancante"}, 400

        user_id = int(current_user.get_id())
        updated = DBManager.rename_conversation(user_id, conversation_id, new_title)

        if not updated:
            return {"error": "Conversazione non trovata"}, 404

        return {"success": True}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/conversations/delete', methods=['DELETE'])
@login_required
def delete_conversation():
    """Elimina una conversazione dell'utente autenticato.

    Risposte:
      - 401 se non autenticato
      - 404 se conversazione non trovata o non appartiene all'utente
      - 200 con {success: true}
    """
    try:
        data = request.get_json() or {}
        user_id = int(current_user.get_id())
        conversation_id = int(data.get("conv_id"))
        deleted = DBManager.delete_conversation(user_id, conversation_id)

        if not deleted:
            return {"error": "Conversazione non trovata"}, 404

        return {"success": True}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/conversations/delete-all', methods=['DELETE'])
@login_required
def delete_all_conversations():
    """Elimina tutte le conversazioni dell'utente autenticato.

    Risposte:
      - 401 se non autenticato
      - 200 con {success: true, deleted_count: N}
    """
    try:
        user_id = int(current_user.get_id())
        deleted_count = DBManager.delete_all_user_conversations(user_id)

        return {"success": True, "deleted_count": deleted_count}, 200
    except Exception as e:
        return server_error(e)

@app.route('/api/preferences/all', methods=['GET'])
@login_required
def preferences_all():
    try:
        return DBManager.preferences()
    except Exception as e:
        return server_error(e)


if __name__ == '__main__':
    # Restarts the server when a .py file changes (dev only). ponytail: the watcher process imports
    # app.py too, so the CLIP model is loaded twice (~850 MB extra); fine for development.
    app.run(port=5000, use_reloader=True)