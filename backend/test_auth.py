# Run with: venv/bin/python test_auth.py  (from backend/)
import time

import jwt
from cryptography.hazmat.primitives.asymmetric import ec

import auth

key = ec.generate_private_key(ec.SECP256R1())


class FakeJWKS:
    """Stands in for the project's JWKS endpoint: always hands out our test key."""
    def get_signing_key_from_jwt(self, token):
        jwt.get_unverified_header(token)  # garbage raises DecodeError, like the real client
        return type("Key", (), {"key": key.public_key()})()


auth._jwks = FakeJWKS()


def token(signing_key=key, algorithm="ES256", **claims):
    base = {"sub": "4f1c-uuid", "email": "a@b.co", "aud": "authenticated", "exp": int(time.time()) + 60}
    return jwt.encode({**base, **claims}, signing_key, algorithm=algorithm)


assert auth.verify_token(token())["sub"] == "4f1c-uuid"
assert auth.verify_token(token(aud="anon")) is None                       # not a logged-in user's token
assert auth.verify_token(token(exp=int(time.time()) - 60)) is None        # expired (past the 30 s leeway)
assert auth.verify_token(token(iat=int(time.time()) + 2))["sub"] == "4f1c-uuid"  # this clock a little behind Supabase's
assert auth.verify_token(token(signing_key=ec.generate_private_key(ec.SECP256R1()))) is None  # someone else's key
assert auth.verify_token(token(signing_key="a-secret-long-enough-for-hs256-0123456789", algorithm="HS256")) is None  # algorithm swap
assert auth.verify_token("garbage") is None

assert auth.display_name({"email": "mario@x.it", "user_metadata": {"name": "Mario"}}) == "Mario"
assert auth.display_name({"email": "mario@x.it", "user_metadata": {"full_name": "Mario Rossi"}}) == "Mario Rossi"  # Google
assert auth.display_name({"email": "mario@x.it"}) == "mario"
print("ok")
