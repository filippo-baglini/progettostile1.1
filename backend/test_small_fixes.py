# Run with: venv/bin/python test_small_fixes.py  (from backend/; loads the app, so CLIP too)
# The B10 request checks and the C4 profile checks. Everything is mocked: no DB, storage or Mistral calls.
import io
from unittest import mock

from PIL import Image

import app as backend
import rate_limit
from db_manager import DBManager

client = backend.app.test_client()
USER = {'Authorization': 'Bearer t'}
TOKEN = '5f0c8a5e-1b0e-4c39-9a51-2a0d9d2f1c11'


def send(**body):
    rate_limit._recent_requests.clear()
    return client.post('/api/messages/send', json={'gender': 'female', **body})


with mock.patch.object(backend, 'verify_token', side_effect=lambda t: {'sub': 'u', 'email': 'a@b.co'} if t == 't' else None), \
     mock.patch.object(DBManager, 'get_or_create_auth_user', return_value={'id': 3, 'email': 'a@b.co', 'gender': 'male', 'auth_id': 'u'}), \
     mock.patch.object(backend, 'cleanup_guest_chats'), \
     mock.patch.object(backend, 'outfit_recommendation_handler', return_value={'status': 'AWAITING_INPUT', 'prompt_to_user': 'Budget?'}) as ai, \
     mock.patch.object(backend, 'load_messages', return_value=([], {})), \
     mock.patch.object(DBManager, 'guest_conversation', side_effect=lambda token: (42, 'female') if token == TOKEN else None), \
     mock.patch.object(DBManager, 'add_message_to_conversation', return_value=True), \
     mock.patch.object(DBManager, 'add_simple_ai_response', return_value=7):
    # No message, photo or wardrobe piece: refused before the AI
    assert send().status_code == 400
    assert send(message='   ').status_code == 400
    assert send(message=['not', 'text']).status_code == 400
    assert ai.call_count == 0

    # A negative outfit index would pick an outfit counting from the end
    assert send(conv_id=f'temp_{TOKEN}', message='cheaper', selected_outfit_index=-1).status_code == 200
    assert ai.call_args.kwargs['selected_outfit_index'] is None
    assert send(conv_id=f'temp_{TOKEN}', message='cheaper', selected_outfit_index=1).status_code == 200
    assert ai.call_args.kwargs['selected_outfit_index'] == 1

    # Deleting or renaming without what's needed: 400, not a 500
    assert client.delete('/api/conversations/delete', json={}, headers=USER).status_code == 400
    assert client.put('/api/conversations/rename', json={'conv_id': 1, 'title': 123}, headers=USER).status_code == 400
    assert client.put('/api/conversations/rename', json={'conv_id': 1, 'title': '  '}, headers=USER).status_code == 400

    # The chat is read with POST only
    assert client.get('/api/chat', headers=USER).status_code == 405

    # "Add to wardrobe": only one of two taps gets the suggestion; a failure gives it back
    chat = {'prompt_id': 5, 'image_id': 'img', 'wardrobe_suggestion': {'section': 'shirts'}}
    with mock.patch.object(DBManager, 'get_chat_photo_for_response', return_value=chat), \
         mock.patch.object(DBManager, 'claim_wardrobe_suggestion', side_effect=[True, False]), \
         mock.patch.object(DBManager, 'restore_wardrobe_suggestion') as restore, \
         mock.patch.object(backend, 'download_image', return_value=None):
        first = client.post('/api/wardrobe/from-chat/9', json={'section': 'shirts'}, headers=USER)
        second = client.post('/api/wardrobe/from-chat/9', json={'section': 'shirts'}, headers=USER)
        assert first.status_code == 404 and second.status_code == 409   # the photo was gone; the second tap lost the race
        restore.assert_called_once_with(9, {'section': 'shirts'})

    # C4: avatars and names are checked like wardrobe pieces; a refused photo never reaches storage
    jpeg = io.BytesIO()
    Image.new('RGB', (8, 8)).save(jpeg, 'JPEG')
    me = {'id': 3, 'name': 'Filippo', 'username': 'filippo', 'email': 'a@b.co', 'avatar_id': None}
    with mock.patch.object(backend, 'check_profile', return_value='Refused') as check, \
         mock.patch.object(backend, 'upload_image') as upload, \
         mock.patch.object(DBManager, 'get_user_by_id', return_value=me), \
         mock.patch.object(DBManager, 'update_user_profile') as save:
        r = client.post('/api/user/avatar', data={'image': (io.BytesIO(jpeg.getvalue()), 'me.jpg')},
                        content_type='multipart/form-data', headers=USER)
        assert r.status_code == 400 and r.json['error'] == 'Refused' and upload.call_count == 0
        r = client.put('/api/user/profile', json={'name': 'Bad Name', 'username': 'filippo'}, headers=USER)
        assert r.status_code == 400 and save.call_count == 0
        assert check.call_args.kwargs == {'name': 'Bad Name', 'username': 'filippo'}
        check.reset_mock()
        with mock.patch.object(backend, 'user_payload', return_value={}):
            assert client.put('/api/user/profile', json={'name': 'Filippo'}, headers=USER).status_code == 200
        assert check.call_count == 0 and save.call_count == 1   # nothing changed: no model call
print("ok")
