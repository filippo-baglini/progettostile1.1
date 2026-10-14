# Run with: venv/bin/python test_chat_photos.py  (from backend/; loads the app, so CLIP too)
# A chat photo is uploaded only once its message can be saved, and removed if the save fails (S10).
import io
from unittest import mock

from PIL import Image

import app as backend
from db_manager import DBManager

client = backend.app.test_client()
TOKEN = '5f0c8a5e-1b0e-4c39-9a51-2a0d9d2f1c11'
REPLY = {'status': 'AWAITING_INPUT', 'prompt_to_user': 'Which occasion?'}

jpeg = io.BytesIO()
Image.new('RGB', (8, 8)).save(jpeg, 'JPEG')


def send(conv_id=None):
    form = {'message': 'Style this', 'image': (io.BytesIO(jpeg.getvalue()), 'shirt.jpg')}
    if conv_id:
        form['conv_id'] = conv_id
    return client.post('/api/messages/send', data=form, content_type='multipart/form-data')


with mock.patch.object(backend, 'upload_image', return_value='https://x/photo.jpg') as upload, \
     mock.patch.object(backend, 'delete_images') as delete, \
     mock.patch.object(backend, 'cleanup_guest_chats'), \
     mock.patch.object(backend, 'chat_title', return_value='Shirt'), \
     mock.patch.object(backend, 'outfit_recommendation_handler', return_value=REPLY) as ai, \
     mock.patch.object(backend, 'load_messages', return_value=([], {})), \
     mock.patch.object(DBManager, 'guest_conversation', side_effect=lambda token: (42, 'female') if token == TOKEN else None), \
     mock.patch.object(DBManager, 'create_conversation_with_message', return_value=42) as create, \
     mock.patch.object(DBManager, 'add_message_to_conversation', return_value=True) as add, \
     mock.patch.object(DBManager, 'add_simple_ai_response', return_value=7):
    # Rejected before the AI: no file
    assert send('temp_5f0c8a5e-0000-4c39-9a51-2a0d9d2f1c11').status_code == 404
    assert upload.call_count == 0

    # The AI failed: no file
    ai.side_effect = RuntimeError('timeout')
    assert send(f'temp_{TOKEN}').status_code == 500
    assert send().status_code == 500
    assert upload.call_count == 0 and add.call_count == 0 and create.call_count == 0
    ai.side_effect = None

    # Saved: uploaded under the id the AI saw and the message names
    r = send(f'temp_{TOKEN}')
    assert r.status_code == 200 and r.json['img_url'] == 'https://x/photo.jpg'
    image_id = ai.call_args.kwargs['image_data'][0]
    assert upload.call_args.args[0] == image_id == add.call_args.kwargs['image_id']
    assert send().status_code == 200 and create.call_args.kwargs['image_id'] == upload.call_args.args[0]
    assert delete.call_count == 0

    # The message couldn't be saved: the file goes again
    add.return_value = False
    assert send(f'temp_{TOKEN}').status_code == 500
    delete.assert_called_once_with([upload.call_args.args[0]])
    create.return_value = None
    assert send().status_code == 500
    assert delete.call_args.args[0] == [upload.call_args.args[0]] and delete.call_count == 2

    # The upload failed: no message pointing at a missing file
    add.reset_mock(); create.reset_mock()
    upload.return_value = None
    assert send(f'temp_{TOKEN}').status_code == 500
    assert send().status_code == 500
    assert add.call_count == 0 and create.call_count == 0
print("ok")
