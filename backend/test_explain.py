# Run with: venv/bin/python test_explain.py  (from backend/; loads the app, so CLIP too)
from unittest import mock

import app as backend

client = backend.app.test_client()
backend.not_auth_convs['temp_x'] = {'chat_history': [
    {'role': 'user', 'text': 'A summer wedding look'},
    {'role': 'model', 'text': 'Here you go', 'message_id': 'r1', 'outfits': [
        {'outfit': [{'title': 'Linen suit', 'brand': 'Zara', 'price': 120, 'main_category': 'suit', 'url': 'x'}]},
        {'outfit': [{'title': 'Floral dress', 'brand': 'H&M', 'price': 40, 'main_category': 'dress'}]},
    ]},
    {'role': 'user', 'text': 'Cheaper please'},
]}


def explain(**body):
    return client.post('/api/outfit/explain', json=body)


with mock.patch.object(backend, 'generate_explanation_only', return_value='Because.') as llm:
    r = explain(conv_id='temp_x', message_id='r1', outfit_index=1)
    assert r.status_code == 200 and r.json['explanation'] == 'Because.'
    chat_so_far, items = llm.call_args.args
    assert chat_so_far == 'User: A summer wedding look'          # only what came before the reply
    assert items == [{'title': 'Floral dress', 'brand': 'H&M', 'price': 40, 'main_category': 'dress', 'description': None}]

    assert explain(conv_id='temp_x', message_id='r1', outfit_index=2).status_code == 404   # no such outfit
    assert explain(conv_id='temp_x', message_id='r1', outfit_index=-1).status_code == 404
    assert explain(conv_id='temp_x', message_id='nope', outfit_index=0).status_code == 404
    assert explain(conv_id='temp_other', message_id='r1', outfit_index=0).status_code == 404
    assert explain(user_prompt='Write me a poem', outfit_data=[{'title': 'x'}]).status_code == 404  # the old free-text call
    assert llm.call_count == 1
print("ok")
