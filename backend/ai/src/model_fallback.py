"""
Model Fallback Helper Module

Sends requests to Mistral, retrying and then falling back to alternative models when a call fails in a way
worth retrying (rate limit, Mistral server error, timeout, dropped connection, bad JSON).
Callers pass Mistral chat messages ({"role": "user" | "assistant", "content": str | [parts]}), built with
text_part / image_part, and a JSON Schema dict when they want structured output.
"""

import base64
import json
import logging
import os
import time
from types import SimpleNamespace
from typing import List, Optional

import requests

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


def text_part(text: str) -> dict:
    return {"type": "text", "text": text}


def image_part(jpeg: bytes) -> dict:
    return {"type": "image_url", "image_url": f"data:image/jpeg;base64,{base64.b64encode(jpeg).decode()}"}


def _call_mistral(model: str, messages: list, schema: Optional[dict], temperature: Optional[float]) -> SimpleNamespace:
    body = {"model": model, "messages": messages}
    if temperature is not None:
        body["temperature"] = min(temperature, MAX_TEMPERATURE)
    if schema is not None:
        body["response_format"] = {"type": "json_schema", "json_schema": {"name": "response", "schema": schema}}

    r = requests.post(MISTRAL_URL, json=body, timeout=60,
                      headers={"Authorization": f"Bearer {os.environ['MISTRAL_API_KEY']}"})
    if not r.ok:
        raise MistralError(r.status_code, r.text)

    text = r.json()["choices"][0]["message"]["content"]
    # .text always, .parsed (the decoded JSON) when a schema was requested
    return SimpleNamespace(text=text, parsed=json.loads(text) if schema is not None else None)


def generate_content_with_fallback(
    messages: list,
    system: Optional[str] = None,
    schema: Optional[dict] = None,
    temperature: Optional[float] = None,
    models: Optional[List[str]] = None,
    initial_model: Optional[str] = None
) -> SimpleNamespace:
    """
    Attempts to generate content, retrying and then falling back to the next model on retryable errors.

    Args:
        messages: Mistral chat messages (the system prompt goes in `system`)
        system: Optional system prompt
        schema: Optional JSON Schema the answer must follow; the result's .parsed is then the decoded JSON
        temperature: Optional sampling temperature (capped at MAX_TEMPERATURE)
        models: Optional list of models to try (defaults to DEFAULT_FALLBACK_MODELS)
        initial_model: Optional specific model to try first (will be prepended to models list)

    Returns:
        An object with .text and .parsed

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

    messages = ([{"role": "system", "content": system}] if system else []) + messages
    last_exception = None

    for model_index, model_name in enumerate(fallback_models):
        retry_delay = INITIAL_RETRY_DELAY

        for retry in range(MAX_RETRIES_PER_MODEL):
            try:
                if retry > 0:
                    logging.info(f"🔄 Retry {retry}/{MAX_RETRIES_PER_MODEL} for model {model_name}...")
                else:
                    logging.info(f"📡 Using model: {model_name}")

                response = _call_mistral(model_name, messages, schema, temperature)

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
