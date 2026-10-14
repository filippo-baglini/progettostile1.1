# Run with: venv/bin/python test_guest_chats.py  (from backend/; loads the app and uses the real DB, cleaning up after itself)
import uuid
from unittest import mock

import app as backend
from db_manager import DBManager

with backend.app.test_request_context():  # a guest: nobody logged in
    token, other = str(uuid.uuid4()), str(uuid.uuid4())
    conv_id = DBManager.create_conversation_with_message(None, 'Test guest chat', 'hi', image_id='test-photo',
                                                         guest_token=token, guest_gender='female')
    try:
        assert backend.find_conversation(f'temp_{token}') == (conv_id, 'female')
        assert backend.find_conversation(f'temp_{uuid.uuid4()}') is None   # someone else's token
        assert backend.find_conversation(conv_id) is None                   # guests can't use DB ids
        assert DBManager.add_message_to_conversation(conv_id, 'second message')
        assert [m['text'] for m in DBManager.get_chat_messages(None, conv_id)] == ['hi', 'second message']
        assert DBManager.get_chat_messages(1, conv_id) == []                # not a user's chat

        # Active: kept. Two days idle: deleted, and its photo listed for removal from storage.
        # (The cleanup only touches chats idle for a day, which it would delete anyway: safe on the shared DB.)
        DBManager.delete_idle_guest_conversations(backend.GUEST_CHAT_IDLE_HOURS)
        assert DBManager.guest_conversation(token)
        conn = DBManager.get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE prompts SET created_at = now() - interval '2 days' WHERE conversation_id = %s", (conv_id,))
            cursor.execute("UPDATE conversations SET created_at = now() - interval '2 days' WHERE id = %s", (conv_id,))
        conn.commit()
        assert 'test-photo' in DBManager.delete_idle_guest_conversations(backend.GUEST_CHAT_IDLE_HOURS)
        assert DBManager.guest_conversation(token) is None
        # Leaving the chat deletes it at once (the page sends text/plain via sendBeacon)
        DBManager.create_conversation_with_message(None, 'Left chat', 'hi', guest_token=other)
        client = backend.app.test_client()
        assert client.post('/api/guest/chat/end', data=f'{{"conv_id": "temp_{uuid.uuid4()}"}}', content_type='text/plain').status_code == 200
        assert DBManager.guest_conversation(other)                                       # someone else's token: kept
        client.post('/api/guest/chat/end', data=f'{{"conv_id": "temp_{other}"}}', content_type='text/plain')
        assert DBManager.guest_conversation(other) is None
        assert client.post('/api/guest/chat/end', data='garbage', content_type='text/plain').status_code == 200
    finally:
        DBManager.get_db_connection().cursor().execute("DELETE FROM conversations WHERE guest_token IN (%s, %s)", (token, other))
        DBManager.get_db_connection().commit()

# Only the last 3 photos of a chat are downloaded and sent back to the AI
messages = [{'role': 'user', 'text': f'm{i}', 'image_id': f'https://x/public/p{i}.jpg', 'message_id': i} for i in range(5)]
with mock.patch.object(DBManager, 'get_chat_messages', return_value=messages), \
     mock.patch.object(backend, 'download_image', side_effect=lambda image_id: image_id.encode()) as download:
    history, past_images = backend.load_messages(1, None)
assert list(past_images) == ['p2', 'p3', 'p4'] and download.call_count == 3
assert 'image_id' not in history[0] and history[4]['image_id'] == 'p4'
print("ok")
