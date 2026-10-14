# Run with: venv/bin/python test_explain.py  (from backend/; loads the app, so CLIP too)
from unittest import mock

import psycopg2

import app as backend
from db_manager import DBManager

client = backend.app.test_client()
TOKEN = '5f0c8a5e-1b0e-4c39-9a51-2a0d9d2f1c11'
history = [
    {'role': 'user', 'text': 'A summer wedding look'},
    {'role': 'model', 'text': 'Here you go', 'message_id': 7, 'outfits': [
        {'outfit': [{'title': 'Linen suit', 'brand': 'Zara', 'price': 120, 'main_category': 'suit', 'url': 'x'}], 'explanation': None},
        {'outfit': [{'title': 'Floral dress', 'brand': 'H&M', 'price': 40, 'main_category': 'dress'}], 'explanation': 'Saved before.'},
    ]},
    {'role': 'user', 'text': 'Cheaper please'},
]


def explain(**body):
    return client.post('/api/outfit/explain', json=body)


with mock.patch.object(DBManager, 'guest_conversation', side_effect=lambda token: (42, 'female') if token == TOKEN else None), \
     mock.patch.object(DBManager, 'get_chat_messages', return_value=history) as read_chat, \
     mock.patch.object(DBManager, 'save_outfit_explanation') as save, \
     mock.patch.object(backend, 'generate_explanation_only', return_value='Because.') as llm:
    r = explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=0)
    assert r.status_code == 200 and r.json['explanation'] == 'Because.'
    read_chat.assert_called_with(None, 42)                       # the guest's own chat
    chat_so_far, items = llm.call_args.args
    assert chat_so_far == 'User: A summer wedding look'          # only what came before the reply
    assert items == [{'title': 'Linen suit', 'brand': 'Zara', 'price': 120, 'main_category': 'suit', 'description': None}]
    save.assert_called_once_with(7, 0, 'Because.')

    # Explained before: the saved text, no model call
    assert explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=1).json['explanation'] == 'Saved before.'
    assert llm.call_count == 1

    assert explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=2).status_code == 404   # no such outfit
    assert explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=-1).status_code == 404
    assert explain(conv_id=f'temp_{TOKEN}', message_id='8', outfit_index=0).status_code == 404
    assert explain(conv_id='temp_5f0c8a5e-0000-4c39-9a51-2a0d9d2f1c11', message_id='7', outfit_index=0).status_code == 404
    assert explain(conv_id='temp_not-a-uuid', message_id='7', outfit_index=0).status_code == 404
    assert explain(conv_id=42, message_id='7', outfit_index=0).status_code == 404               # a guest can't use DB ids
    assert explain(user_prompt='Write me a poem', outfit_data=[{'title': 'x'}]).status_code == 404  # the old free-text call
    assert llm.call_count == 1

    # The model call failed: an error the user can retry, and nothing saved
    llm.return_value = None
    assert explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=0).status_code == 502
    assert save.call_count == 1

    # The chat couldn't be read: an error, not an answer without the history (B7)
    read_chat.side_effect = psycopg2.OperationalError('connection lost')
    assert explain(conv_id=f'temp_{TOKEN}', message_id='7', outfit_index=0).status_code == 500
print("ok")
