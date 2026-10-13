"""Logins live in Supabase Auth. The frontend sends the user's access token; it is verified here
with the project's public signing keys, so no request to Supabase is needed per API call."""
import os

import jwt
from dotenv import load_dotenv

from storage_manager import SUPABASE_CLIENT  # secret key: allowed to delete auth users

load_dotenv()

# Keys are fetched once and cached; a token signed with a new key triggers one refetch
_jwks = jwt.PyJWKClient(f"{os.environ['SUPABASE_URL']}/auth/v1/.well-known/jwks.json")


def verify_token(token: str) -> dict | None:
    """The token's claims if Supabase signed it for a logged-in user and it hasn't expired, else None."""
    try:
        key = _jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["ES256"], audience="authenticated")
    except jwt.PyJWTError:
        return None


def display_name(claims: dict) -> str:
    """Name given at signup, else Google's full name, else the part of the email before '@'."""
    meta = claims.get("user_metadata") or {}
    return meta.get("name") or meta.get("full_name") or claims["email"].split("@")[0]


def delete_auth_user(auth_id: str) -> None:
    SUPABASE_CLIENT.auth.admin.delete_user(auth_id)
