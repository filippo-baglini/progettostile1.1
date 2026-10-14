# Run with: venv/bin/python -m ai.test_model_fallback  (from backend/)
# Which Mistral failures are retried (then handed to the next model) and which are raised straight away (B11).
import json
from unittest import mock

import requests
from google.genai import types

from ai.src import model_fallback as mf

config = types.GenerateContentConfig()
ok = mf.SimpleNamespace(text='hi', parsed=None)


def run(*outcomes):
    """Calls generate_content_with_fallback with _call_mistral failing or answering as listed; returns (result, models tried)."""
    calls = []
    def call(model, contents, config):
        calls.append(model)
        outcome = outcomes[len(calls) - 1]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome
    with mock.patch.object(mf, '_call_mistral', side_effect=call), mock.patch.object(mf.time, 'sleep'):
        try:
            return mf.generate_content_with_fallback('hello', config), calls
        except Exception as e:
            return e, calls


# Retried on the same model, then the next one
for failure in (mf.MistralError(429, 'rate limit'), mf.MistralError(503, 'unavailable'), mf.MistralError(500, 'oops'),
                requests.Timeout(), requests.ConnectionError(), json.JSONDecodeError('bad', '', 0)):
    result, calls = run(failure, ok)
    assert result is ok and calls == ['ministral-14b-latest'] * 2, failure
    result, calls = run(failure, failure, ok)
    assert result is ok and calls == ['ministral-14b-latest'] * 2 + ['ministral-8b-latest'], failure

# Everything fails: the last error comes out after both models' tries
result, calls = run(*[mf.MistralError(503, 'down')] * 4)
assert isinstance(result, mf.MistralError) and len(calls) == 4

# Would fail again: raised at once
for failure in (mf.MistralError(400, 'bad request'), mf.MistralError(401, 'bad key'), KeyError('choices')):
    result, calls = run(failure, ok)
    assert result is failure and len(calls) == 1, failure
print("ok")
