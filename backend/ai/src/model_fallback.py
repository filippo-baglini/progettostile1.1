"""
Model Fallback Helper Module

Sends requests to Mistral, retrying and then falling back to alternative models when a call fails in a way
worth retrying (rate limit, Mistral server error, timeout, dropped connection, bad JSON).
Callers still build requests with Gemini types (contents, GenerateContentConfig); they are translated here.
"""

import base64
import json
import logging
import os
import time
from types import SimpleNamespace
from typing import Any, List, Optional

import requests
from google.genai import types

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

# Default fallback model sequence (both accept images). Mistral's free plan allows
# only the Ministral models (14B: 30 req/min, 8B: 188 req/min); larger ones return 429.
DEFAULT_FALLBACK_MODELS = [
    "ministral-14b-latest",     # Primary model
    "ministral-8b-latest",      # Fallback 1: smaller, higher rate limit
]

# Retry configuration
MAX_RETRIES_PER_MODEL = 2  # Number of retries before switching to next model
INITIAL_RETRY_DELAY = 1.0  # Seconds to wait before first retry
BACKOFF_MULTIPLIER = 2.0   # Multiply delay for each retry
MAX_TEMPERATURE = 1.0      # ponytail: callers ask up to 1.5 (tuned for Gemini); Mistral output degrades above ~1


class MistralError(Exception):
    """Mistral answered with an error status."""
    def __init__(self, status: int, text: str):
        super().__init__(f"Mistral error {status}: {text[:500]}")
        self.status = status


def is_retryable(exception: Exception) -> bool:
    """Worth another try: rate limits (429), Mistral's own failures (5xx), timeouts, dropped connections and
    bad JSON. Anything else (a bad request, a wrong key) would fail again, so it is raised straight away."""
    if isinstance(exception, MistralError):
        return exception.status == 429 or exception.status >= 500
    return isinstance(exception, (requests.Timeout, requests.ConnectionError, json.JSONDecodeError))


def _to_mistral_content(parts: list) -> list:
    """Converts Gemini parts (types.Part or {"text": ...} dicts) to Mistral content chunks."""
    content = []
    for part in parts:
        if isinstance(part, dict):
            part = types.Part(**part)
        if part.text is not None:
            content.append({"type": "text", "text": part.text})
        elif part.inline_data is not None:
            b64 = base64.b64encode(part.inline_data.data).decode()
            content.append({"type": "image_url", "image_url": f"data:{part.inline_data.mime_type};base64,{b64}"})
    return content


def _to_mistral_messages(contents: Any, system_instruction: Optional[str]) -> list:
    """Converts Gemini `contents` (a string, a list of strings, or a list of {"role", "parts"} dicts)."""
    messages = [{"role": "system", "content": system_instruction}] if system_instruction else []
    for item in contents if isinstance(contents, list) else [contents]:
        if isinstance(item, str):
            messages.append({"role": "user", "content": item})
        else:
            role = "assistant" if item["role"] == "model" else "user"
            messages.append({"role": role, "content": _to_mistral_content(item["parts"])})
    return messages


def _call_mistral(model: str, contents: Any, config: types.GenerateContentConfig) -> SimpleNamespace:
    body = {"model": model, "messages": _to_mistral_messages(contents, config.system_instruction)}
    if config.temperature is not None:
        body["temperature"] = min(config.temperature, MAX_TEMPERATURE)
    if config.response_schema is not None:
        schema = config.response_schema.json_schema.model_dump(mode="json", exclude_none=True)
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": "response", "schema": schema}}

    r = requests.post(MISTRAL_URL, json=body, timeout=60,
                      headers={"Authorization": f"Bearer {os.environ['MISTRAL_API_KEY']}"})
    if not r.ok:
        raise MistralError(r.status_code, r.text)

    text = r.json()["choices"][0]["message"]["content"]
    # Same shape as a Gemini response: .text always, .parsed when a schema was requested
    return SimpleNamespace(text=text, parsed=json.loads(text) if config.response_schema is not None else None)


def generate_content_with_fallback(
    contents: Any,
    config: types.GenerateContentConfig,
    models: Optional[List[str]] = None,
    initial_model: Optional[str] = None
) -> Any:
    """
    Attempts to generate content, retrying and then falling back to the next model on retryable errors.

    Args:
        contents: The content to send to the model (Gemini format)
        config: GenerateContentConfig for the request
        models: Optional list of models to try (defaults to DEFAULT_FALLBACK_MODELS)
        initial_model: Optional specific model to try first (will be prepended to models list)

    Returns:
        An object with .text and .parsed, like a Gemini response

    Raises:
        Exception: If all models fail
    """
    fallback_models = models or DEFAULT_FALLBACK_MODELS.copy()

    # If an initial model is specified, ensure it's tried first
    if initial_model and initial_model not in fallback_models:
        fallback_models = [initial_model] + fallback_models
    elif initial_model and initial_model in fallback_models:
        # Move initial_model to the front
        fallback_models.remove(initial_model)
        fallback_models = [initial_model] + fallback_models

    last_exception = None

    for model_index, model_name in enumerate(fallback_models):
        retry_delay = INITIAL_RETRY_DELAY

        for retry in range(MAX_RETRIES_PER_MODEL):
            try:
                if retry > 0:
                    logging.info(f"🔄 Retry {retry}/{MAX_RETRIES_PER_MODEL} for model {model_name}...")
                else:
                    logging.info(f"📡 Using model: {model_name}")

                response = _call_mistral(model_name, contents, config)

                # Success!
                if model_index > 0:
                    logging.info(f"✅ Successfully used fallback model: {model_name}")
                return response

            except Exception as e:
                last_exception = e

                if not is_retryable(e):
                    logging.error(f"❌ Error on {model_name}, not retrying: {e}")
                    raise e

                # Mistral's JSON mode now and then degenerates (e.g. runs of blank lines): one more try usually works
                logging.warning(f"⚠️ {model_name} failed ({type(e).__name__}): {e}")
                if retry < MAX_RETRIES_PER_MODEL - 1:
                    logging.info(f"⏳ Waiting {retry_delay:.1f}s before retry...")
                    time.sleep(retry_delay)
                    retry_delay *= BACKOFF_MULTIPLIER
                elif model_index < len(fallback_models) - 1:
                    logging.info(f"🔀 Switching to fallback model: {fallback_models[model_index + 1]}")

    # All models exhausted
    logging.error(f"❌ All models exhausted. Last error: {last_exception}")
    raise last_exception or Exception("All fallback models failed")
