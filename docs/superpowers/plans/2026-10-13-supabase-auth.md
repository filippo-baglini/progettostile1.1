# Supabase Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move StyleFinder's logins (email/password, Google, logout, password change) from Flask-Login sessions and our own password hashes to Supabase Auth, adding email confirmation and "forgot password".

**Architecture:** The frontend signs users in with `supabase-js` and sends the Supabase access token as `Authorization: Bearer <token>` on every API call. Flask verifies the token locally against the project's public signing keys (JWKS, ES256), using a Flask-Login `request_loader`. That keeps `@login_required` and `current_user` working unchanged across `app.py`. Each Supabase account maps to our `users` row through a new `users.auth_id` column. The row is created on the account's first request. The one existing row (from before the migration) is taken over by email.

**Tech Stack:** Flask + Flask-Login (request loader only), PyJWT 2.10 (already installed, as a dependency of `supabase`), psycopg2; React 19 + `@supabase/supabase-js` v2, axios, vitest.

**Spec:** The conversation decision of 2026-10-13 and `AUDIT_TODO.md` (this plan replaces the small S1/S2 patches and covers S1, S2, S3, S3b, S4, S7 and B2).

## Global Constraints

- Logged-in API requests authenticate **only** with the bearer token. No login cookie, no `login_user()`, no password hashes in our DB.
- Guests keep working exactly as today: no token means anonymous.
- Supabase **"Confirm email" must stay ON.** The email takeover in `get_or_create_auth_user` relies on Supabase only issuing tokens for confirmed emails.
- Tokens are checked with `algorithms=["ES256"]` and `audience="authenticated"`; any verification failure means anonymous, never an error page.
- New SQL goes in a new file in `backend/migrations/`, never in `schema.sql`.
- Do not use `git stash` while the dev servers run (the Flask reloader serves stale code). Work on a branch: `git switch -c supabase-auth`.
- Password rule (set in Supabase, mirrored in the UI by `src/utils/password.ts`): at least 8 characters with a lowercase letter, an uppercase letter, a digit and a symbol. When Supabase rejects a password, show its message, never a generic "failed".
- Backend checks are plain `assert` scripts that print `ok` (see `backend/ai/test_clean_constraints.py`); frontend tests use vitest.

---

### Task 0: Supabase and Google setup (manual, done by Filippo in the dashboards)

No code. Everything after this needs it.

- [x] **Step 1: Email provider.** Supabase dashboard → Authentication → Sign In / Providers: **Confirm email ON**. Email panel: enabled; Secure password change ON; Require current password when updating ON; minimum password length **8**; password requirements **lowercase, uppercase, digits and symbols**.
- [x] **Step 2: URLs.** Authentication → URL Configuration: Site URL `http://localhost:5173`; Redirect URLs: add `http://localhost:5173/**`.
- [x] **Step 3: Google.** In Google Cloud Console, open the OAuth client whose ID is in `backend/.env` as `GOOGLE_CLIENT_ID`. Add the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` (the exact URI is shown in Supabase → Providers → Google). Copy the client ID and client **secret** into Supabase → Providers → Google, and enable it.
- [x] **Step 4: Frontend keys.** Supabase → Project Settings → API Keys: copy the **publishable** key (`sb_publishable_...`). In `frontend/.env` set:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

and delete the old `VITE_SUPABASE_ANON_KEY` and `VITE_GOOGLE_CLIENT_ID` lines.

- [x] **Step 5: Note on email.** The built-in sender only delivers to the project's team members and at a low hourly rate. That's fine for testing with Filippo's own address; production needs custom SMTP (tracked as S2b).

---

### Task 1: Backend token verification (`backend/auth.py`)

**Files:**
- Create: `backend/auth.py`
- Test: `backend/test_auth.py`
- Modify: `backend/requirements.txt`

**Interfaces:**
- Produces: `verify_token(token: str) -> dict | None` (the token's claims or None), `display_name(claims: dict) -> str`, `delete_auth_user(auth_id: str) -> None`.

- [x] **Step 1: Write the failing check**

`backend/test_auth.py`:

```python
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
    base = {"sub": "4f1c...-uuid", "email": "a@b.co", "aud": "authenticated", "exp": int(time.time()) + 60}
    return jwt.encode({**base, **claims}, signing_key, algorithm=algorithm)


assert auth.verify_token(token())["sub"] == "4f1c...-uuid"
assert auth.verify_token(token(aud="anon")) is None                       # not a logged-in user's token
assert auth.verify_token(token(exp=int(time.time()) - 10)) is None        # expired
assert auth.verify_token(token(signing_key=ec.generate_private_key(ec.SECP256R1()))) is None  # someone else's key
assert auth.verify_token(token(signing_key="secret", algorithm="HS256")) is None               # algorithm swap
assert auth.verify_token("garbage") is None

assert auth.display_name({"email": "mario@x.it", "user_metadata": {"name": "Mario"}}) == "Mario"
assert auth.display_name({"email": "mario@x.it", "user_metadata": {"full_name": "Mario Rossi"}}) == "Mario Rossi"  # Google
assert auth.display_name({"email": "mario@x.it"}) == "mario"
print("ok")
```

- [x] **Step 2: Run it to verify it fails**

Run: `cd backend && venv/bin/python test_auth.py`
Expected: `ModuleNotFoundError: No module named 'auth'`

- [x] **Step 3: Write the implementation**

`backend/auth.py`:

```python
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
```

In `backend/requirements.txt`, replace the line `google-auth` with `pyjwt[crypto]`.

- [x] **Step 4: Run it to verify it passes**

Run: `cd backend && venv/bin/python test_auth.py`
Expected: `ok`

- [x] **Step 5: Commit**

```bash
git add backend/auth.py backend/test_auth.py backend/requirements.txt
git commit -m "Verify Supabase Auth tokens on the backend"
```

---

### Task 2: Backend switches to Supabase tokens

**Files:**
- Create: `backend/migrations/2026-10-13_supabase_auth.sql`
- Modify: `backend/db_manager.py` (`USER_FIELDS` line 15; delete `email_exists`, `create_user`, `get_user_by_google_id`, `create_google_user`, `link_google_account`, `get_user_by_email`, `update_user_credentials`; add `get_or_create_auth_user`)
- Modify: `backend/app.py` (imports lines 9-12; `AppUser` and `load_user` lines 94-109; delete `signup`, `login`, `google_login`, `logout`, `change_password` lines 132-280 and 321-347; `delete_account` lines 299-319)

**Interfaces:**
- Consumes: `verify_token`, `display_name`, `delete_auth_user` from Task 1.
- Produces: `DBManager.get_or_create_auth_user(auth_id: str, email: str, name: str) -> dict | None`. API: `GET /api/user/session` (unchanged shape), `DELETE /api/user/delete` (now also deletes the Supabase account). Removed: `POST /api/user/`, `/api/user/login`, `/api/user/google-login`, `GET /api/user/logout`, `POST /api/user/change-password`.

- [x] **Step 1: Migration**

`backend/migrations/2026-10-13_supabase_auth.sql`:

```sql
-- Logins move to Supabase Auth. Each users row links to its auth.users account through auth_id, set on
-- that account's first API request (DBManager.get_or_create_auth_user). Passwords and Google ids now live
-- in Supabase. Run once in the Supabase SQL editor (safe to re-run), together with the backend change.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
```

- [x] **Step 2: `db_manager.py`**

Line 15 becomes:

```python
USER_FIELDS = ("id", "name", "email", "gender", "username", "avatar_id", "auth_id")
```

Delete the seven methods listed above. Add after `get_user_by_id`:

```python
    @staticmethod
    def get_or_create_auth_user(auth_id: str, email: str, name: str):
        """The users row of a Supabase Auth account, created on its first request. A row from before Supabase
        Auth with the same email is taken over: Supabase only issues tokens for confirmed emails.
        None if the email already belongs to another account."""
        conn = DBManager.get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(f"SELECT {USER_COLUMNS} FROM users WHERE auth_id = %s", (auth_id,))
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        f"UPDATE users SET auth_id = %s WHERE lower(email) = lower(%s) AND auth_id IS NULL RETURNING {USER_COLUMNS}",
                        (auth_id, email))
                    row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        f"INSERT INTO users (name, email, auth_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING RETURNING {USER_COLUMNS}",
                        (name, email, auth_id))
                    row = cursor.fetchone()
                if not row:  # a parallel first request just created it (or the email is taken)
                    cursor.execute(f"SELECT {USER_COLUMNS} FROM users WHERE auth_id = %s", (auth_id,))
                    row = cursor.fetchone()
            conn.commit()
            return dict(zip(USER_FIELDS, row)) if row else None
        except Exception:
            conn.rollback()
            raise
```

- [x] **Step 3: `app.py`**

Imports: line 9 becomes `from flask_login import LoginManager, UserMixin, current_user, login_required`. Delete lines 10-12 (werkzeug, google). Add `from auth import verify_token, display_name, delete_auth_user`.

Replace `AppUser` and `load_user` (lines 94-109) with:

```python
class AppUser(UserMixin):
    def __init__(self, user_dict):
        self.id = user_dict['id']
        self.email = user_dict['email']
        self.gender = user_dict.get('gender')
        self.auth_id = str(user_dict['auth_id'])

    def get_id(self):  # type: ignore[override]
        return str(self.id)

@login_manager.request_loader
def load_user_from_request(req):
    """Logged-in requests carry a Supabase access token; anything else is a guest."""
    header = req.headers.get('Authorization', '')
    claims = verify_token(header.removeprefix('Bearer ')) if header.startswith('Bearer ') else None
    if not claims or not claims.get('email'):
        return None
    user = DBManager.get_or_create_auth_user(claims['sub'], claims['email'], display_name(claims))
    return AppUser(user) if user else None
```

Delete the routes `signup`, `login`, `google_login`, `logout` and `change_password`. In `delete_account`, replace the body of the `try` with:

```python
        user_id = int(current_user.get_id())
        if not DBManager.delete_user(user_id):
            return {"error": "Utente non trovato"}, 404
        # After our data and photos are gone: the login itself goes last
        delete_auth_user(current_user.auth_id)
        return {"success": True}, 200
```

- [x] **Step 4: Check nothing else uses the removed names**

Run: `cd backend && grep -rn "login_user\|logout_user\|get_user_by_email\|google_id\|check_password_hash\|update_user_credentials\|create_user\b\|email_exists" --include=*.py . | grep -v venv`
Expected: no output.

- [x] **Step 5: Apply the migration and smoke-test**

Run the migration in the Supabase SQL editor. Restart the backend (`venv/bin/python app.py`), then:

Run: `curl -s localhost:5000/api/user/session -H "Authorization: Bearer garbage"`
Expected: `{"error": "Not authenticated"}` (401)

Run: `curl -s localhost:5000/api/conversations`
Expected: `{"error": "Not authenticated"}` (401)

Run: `cd backend && venv/bin/python test_auth.py && venv/bin/python -c "import app; print('app ok')"`
Expected: `ok`, then `app ok` (loading CLIP takes a while)

- [x] **Step 6: Commit**

```bash
git add backend/migrations/2026-10-13_supabase_auth.sql backend/db_manager.py backend/app.py
git commit -m "Authenticate API requests with Supabase Auth tokens instead of login cookies"
```

---

### Task 3: Frontend Supabase client and token on API calls

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Modify: `frontend/src/services/api.ts`, `frontend/vitest.config.ts`, `frontend/package.json` (via npm)

**Interfaces:**
- Produces: `supabase` (a `SupabaseClient`) exported from `src/lib/supabase.ts`. Every axios request from `api` carries `Authorization: Bearer <access_token>` when a session exists.

- [x] **Step 1: Install**

Run: `cd frontend && npm install @supabase/supabase-js@^2 && npm uninstall @react-oauth/google`

(`@react-oauth/google` is still imported by `App.tsx` and `GoogleLoginButton.tsx` until Task 5, so the build is broken between this step and Task 5. Do Tasks 3-5 in one sitting.)

- [x] **Step 2: Client**

`frontend/src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

// Logins (email/password, Google, password reset) go through Supabase Auth; the backend checks its tokens
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
```

`frontend/vitest.config.ts`: inside `test: { ... }` add

```ts
        env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key' },
```

- [x] **Step 3: Write the failing test**

Add to `frontend/src/services/api.test.ts` (create the file if it doesn't exist):

```ts
import { describe, it, expect, vi } from 'vitest';
import api from './api';
import { supabase } from '../lib/supabase';

describe('api', () => {
    it('sends the Supabase access token when logged in', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null } as never);
        const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
        await api.get('/x', { adapter });
        expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer tok');
    });

    it('sends no token for guests', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null } as never);
        const adapter = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });
        await api.get('/x', { adapter });
        expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });
});
```

Run: `cd frontend && npx vitest run src/services/api.test.ts`
Expected: FAIL (`Authorization` is undefined in the first test)

- [x] **Step 4: Implement**

In `frontend/src/services/api.ts`: add `import { supabase } from '../lib/supabase';`, delete the `withCredentials: true` line, and add before the response interceptor:

```ts
// Logged-in requests carry the Supabase access token (supabase-js refreshes it before it expires)
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  return config;
});
```

Update the header comment ("Backend uses Flask-Login with cookie-based sessions") to: `// Logged-in requests are authenticated with a Supabase Auth token (see the request interceptor)`.

- [x] **Step 5: Run it to verify it passes**

Run: `cd frontend && npx vitest run src/services/api.test.ts`
Expected: PASS (2 tests)

- [x] **Step 6: Commit** (together with Task 4 and 5 if the build must stay green on every commit)

```bash
git add frontend/src/lib/supabase.ts frontend/src/services/api.ts frontend/src/services/api.test.ts frontend/vitest.config.ts frontend/package.json frontend/package-lock.json
git commit -m "Send the Supabase access token with API requests"
```

---

### Task 4: `authService` and `AuthContext` on Supabase Auth

**Files:**
- Modify: `frontend/src/services/authService.ts`, `frontend/src/context/AuthContext.tsx`
- Test: `frontend/src/services/authService.test.ts`, `frontend/src/context/AuthContext.test.tsx` (rewrite the login/signUp/logout/Google cases; keep the profile/avatar/delete cases)

**Interfaces:**
- Consumes: `supabase` (Task 3).
- Produces (`authService`):
  - `login({email, password}): Promise<User>`
  - `signUp({name, email, password}): Promise<User | null>` (null: a confirmation email was sent)
  - `logout(): Promise<void>`
  - `loginWithGoogle(): Promise<void>` (leaves the page)
  - `changePassword({current, new}): Promise<void>`
  - `requestPasswordReset(email: string): Promise<void>`
  - `setNewPassword(password: string): Promise<void>`
  - `getCurrentUser(): Promise<User>`, `updateProfile`, `uploadAvatar` unchanged
  - `deleteAccount(): Promise<boolean>`
- Produces (`useAuth()`): `user`, `isLoading`, `isAuthenticated`, `login(email, password): Promise<void>`, `signUp(name, email, password): Promise<boolean>` (true when logged in straight away), `loginWithGoogle(): Promise<void>`, `logout()`, `updateUser(user)`.

- [x] **Step 1: Write the failing tests**

In `authService.test.ts`, replace the `login`, `signUp`, `logout`, `changePassword` and `loginWithGoogle` cases with:

```ts
import { supabase } from '../lib/supabase';

const backendUser = { id: 1, name: 'Test User', email: 'test@example.com', username: 'test-1', avatar_url: null, preferences: {} };

it('login signs in with Supabase, then loads the user from the backend', async () => {
    const signIn = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: null } as never);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, user: backendUser } });
    const user = await authService.login({ email: 'test@example.com', password: 'pw' });
    expect(signIn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pw' });
    expect(user.id).toBe('1');
});

it('login throws the Supabase error', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: new Error('Email not confirmed') } as never);
    await expect(authService.login({ email: 'a@b.co', password: 'pw' })).rejects.toThrow('Email not confirmed');
});

it('signUp returns null when Supabase sent a confirmation email', async () => {
    const signUp = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({ data: { session: null }, error: null } as never);
    expect(await authService.signUp({ name: 'New', email: 'new@example.com', password: 'pw' })).toBeNull();
    expect(signUp).toHaveBeenCalledWith({
        email: 'new@example.com', password: 'pw',
        options: { data: { name: 'New' }, emailRedirectTo: `${window.location.origin}/chat` },
    });
});

it('changePassword checks the current password first', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { user: { email: 'a@b.co' } } }, error: null } as never);
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') } as never);
    const update = vi.spyOn(supabase.auth, 'updateUser');
    await expect(authService.changePassword({ current: 'wrong', new: 'newpw1' })).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
});

it('logout signs out of Supabase', async () => {
    const signOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    await authService.logout();
    expect(signOut).toHaveBeenCalled();
});
```

In `AuthContext.test.tsx`, mock the client so the test drives auth events, and replace the session/login/signUp cases:

```tsx
const { listeners } = vi.hoisted(() => ({ listeners: [] as ((event: string, session: unknown) => void)[] }));
vi.mock('../lib/supabase', () => ({
    supabase: { auth: { onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    } } },
}));
const emit = (session: unknown) => act(() => listeners.forEach((cb) => cb('INITIAL_SESSION', session)));

it('loads the backend user when Supabase has a session', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: '1', name: 'Test User' } as any);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await emit({ user: { id: 'auth-1' } });
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Test User'));
});

it('is a guest without a session', async () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await emit(null);
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
});

it('does not reload the user on a token refresh', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: '1', name: 'Test User' } as any);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    await emit({ user: { id: 'auth-1' } });
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Test User'));
    await emit({ user: { id: 'auth-1' } });
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
});
```

Change the `TestComponent`'s SignUp button to show the result: `onClick={async () => setResult(String(await signUp('New User', 'new@example.com', 'password')))}`, with `const [result, setResult] = useState('')` and `<div data-testid="signup-result">{result}</div>`. Add a test that `authService.signUp` resolving `null` gives `signup-result` = `false` and stays `Not Authenticated`. Import `act` from `@testing-library/react` and `useState` from `react`.

Run: `cd frontend && npx vitest run src/services/authService.test.ts src/context/AuthContext.test.tsx`
Expected: FAIL

- [x] **Step 2: Implement `authService.ts`**

Add `import { supabase } from '../lib/supabase';`. Update the header comment to say logins go through Supabase Auth. Replace `login`, `signUp`, `logout`, `changePassword`, `deleteAccount` and `loginWithGoogle`, and add the two reset functions:

```ts
  // Supabase checks the password; the backend then returns our user for that account
  login: async (credentials: LoginCredentials): Promise<User> => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return authService.getCurrentUser();
  },

  // With "Confirm email" on there is no session yet: null means the user must click the emailed link
  signUp: async (data: SignUpData): Promise<User | null> => {
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name }, emailRedirectTo: `${window.location.origin}/chat` },
    });
    if (error) throw error;
    return result.session ? authService.getCurrentUser() : null;
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  // Leaves the page for Google; Supabase brings the user back to /chat signed in
  loginWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    if (error) throw error;
  },

  // Signing in with the current password first gives a clear "wrong password" error and a fresh session
  // ("Secure password change" wants a login from the last 24 hours). Supabase checks it again on update
  // ("Require current password when updating"), so a stolen token alone can't change the password.
  changePassword: async (data: { current: string; new: string }): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error: wrongPassword } = await supabase.auth.signInWithPassword({ email: session?.user.email ?? '', password: data.current });
    if (wrongPassword) throw new Error('Current password is not correct');
    const { error } = await supabase.auth.updateUser({ password: data.new, current_password: data.current });
    if (error) throw error;
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
  },

  // On /reset-password the emailed link has already signed the user in
  setNewPassword: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  deleteAccount: async (): Promise<boolean> => {
    const response = await api.delete<{ success: boolean }>('/user/delete');
    await supabase.auth.signOut({ scope: 'local' }); // the account is gone, so only the local session is left
    return response.data.success;
  },
```

Delete the now-unused `SignupResponse` interface.

- [x] **Step 3: Implement `AuthContext.tsx`**

Replace the interface, the mount effect and the action functions:

```tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authIdRef = useRef<string | null>(null); // the Supabase account `user` was loaded for

  useEffect(() => {
    // Fires INITIAL_SESSION right away, then SIGNED_IN (also back from Google or an emailed link),
    // SIGNED_OUT and TOKEN_REFRESHED. Only a change of account reloads the user.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const authId = session?.user.id ?? null;
      if (authId === authIdRef.current) {
        setIsLoading(false);
        return;
      }
      authIdRef.current = authId;
      if (!authId) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      // Deferred: calling Supabase inside this callback can deadlock (supabase-js docs)
      setTimeout(async () => {
        try {
          setUser(await authService.getCurrentUser());
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ponytail: the SIGNED_IN event loads the user a second time; harmless, dedupe if it ever matters
  const login = async (email: string, password: string) => {
    setUser(await authService.login({ email, password }));
  };

  const signUp = async (name: string, email: string, password: string) => {
    const newUser = await authService.signUp({ name, email, password });
    if (newUser) setUser(newUser);
    return newUser !== null;
  };

  const loginWithGoogle = () => authService.loginWithGoogle();

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null); // logged out locally even if the request fails
    }
  };
```

Keep `updateUser`, `value`, and `useAuth` as they are. Remove the `authCheckedRef` mount logic and add `import { supabase } from '../lib/supabase';`.

- [x] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/services/authService.test.ts src/context/AuthContext.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/services/authService.ts frontend/src/services/authService.test.ts frontend/src/context/AuthContext.tsx frontend/src/context/AuthContext.test.tsx
git commit -m "Sign in, sign up and log out through Supabase Auth"
```

---

### Task 5: Pages: Google button, email confirmation, forgot and reset password

**Files:**
- Create: `frontend/src/pages/ResetPasswordPage.tsx`, `frontend/src/pages/ResetPasswordPage.test.tsx`, `frontend/src/utils/password.ts`, `frontend/src/utils/password.test.ts`
- Modify: `frontend/src/pages/ProfilePage.tsx` (`handlePasswordChange` lines 91-118, New Password placeholder line 342)
- Modify:
  - `frontend/src/components/ui/GoogleLoginButton.tsx`
  - `frontend/src/pages/LoginPage.tsx` (+ test)
  - `frontend/src/pages/SignUpPage.tsx` (+ test)
  - `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth().loginWithGoogle()`, `useAuth().signUp(...) -> boolean`, `authService.requestPasswordReset`, `authService.setNewPassword` (Task 4).
- Produces: route `/reset-password`. `GoogleLoginButton` props become `{ mode?: 'signin' | 'signup' }` (no `onSuccess`). `PASSWORD_HINT: string` and `passwordProblem(password: string): string | null` from `src/utils/password.ts`.

- [x] **Step 0: Password rule (test first)**

`frontend/src/utils/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { passwordProblem, PASSWORD_HINT } from './password';

describe('passwordProblem', () => {
    it('accepts a password that meets every rule', () => {
        expect(passwordProblem('Ciao123!')).toBeNull();
    });
    it.each(['Ciao12!', 'ciao123!', 'CIAO123!', 'CiaoCiao!', 'Ciao1234'])('refuses %s', (password) => {
        expect(passwordProblem(password)).toBe(PASSWORD_HINT);
    });
});
```

Run: `cd frontend && npx vitest run src/utils/password.test.ts` → FAIL (module not found).

`frontend/src/utils/password.ts`:

```ts
// Mirrors Supabase Auth's settings (Authentication → Email): keep the two in sync.
// Supabase checks again on signup and password change; this only gives the message before the request.
export const PASSWORD_HINT = 'At least 8 characters, with upper- and lowercase letters, a number and a symbol';

export const passwordProblem = (password: string): string | null =>
  password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
    ? null
    : PASSWORD_HINT;
```

Run again → PASS (6 tests).

- [x] **Step 1: Write the failing tests**

`SignUpPage.test.tsx`: make the success case's `signUp` mock resolve `true` (expects `navigate('/profile')`). Add:

```tsx
it('asks to confirm the email when Supabase sent a link', async () => {
    mockSignUp.mockResolvedValue(false);
    // fill name, email, password and submit like the existing success test
    await waitFor(() => expect(showToast.success).toHaveBeenCalledWith('Almost there! Confirm your email with the link we sent you, then log in.'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
});

it('explains a password that breaks the rule without calling Supabase', async () => {
    // fill name and email, password 'ciao123', submit
    expect(await screen.findByText(PASSWORD_HINT)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
});

it("shows Supabase's reason when signup fails", async () => {
    mockSignUp.mockRejectedValue(new Error('User already registered'));
    // fill name, email, password 'Ciao123!' and submit
    expect(await screen.findByText('User already registered')).toBeInTheDocument();
});
```

The existing success test must type a valid password such as `Ciao123!`. Use the names of the mocks the file already defines for `signUp`, `navigate` and `showToast`, and import `PASSWORD_HINT` from `../utils/password`.

`ProfilePage.test.tsx`: the existing "rejects short password" style test now expects `PASSWORD_HINT` instead of the old 6-character message; the success test types `Newpass1!`. Add:

```tsx
it('shows why the password change failed', async () => {
    vi.mocked(authService.changePassword).mockRejectedValue(new Error('Current password is not correct'));
    // fill current 'old', new and confirm 'Newpass1!', submit
    await waitFor(() => expect(showToast.error).toHaveBeenCalledWith('Current password is not correct'));
});
```

`LoginPage.test.tsx`: add

```tsx
it('sends a password reset email for the typed address', async () => {
    // type 'a@b.co' into the Email input, then:
    fireEvent.click(screen.getByText('Forgot password?'));
    await waitFor(() => expect(authService.requestPasswordReset).toHaveBeenCalledWith('a@b.co'));
});

it('asks for the email before sending a reset link', () => {
    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Type your email first, then press "Forgot password?"')).toBeInTheDocument();
});
```

with `vi.mock('../services/authService', () => ({ authService: { requestPasswordReset: vi.fn().mockResolvedValue(undefined) } }))`.

`ResetPasswordPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import { authService } from '../services/authService';
import { PASSWORD_HINT } from '../utils/password';

vi.mock('../services/authService', () => ({ authService: { setNewPassword: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../components/ui/ParticleBackground', () => ({ default: () => null }));

const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
};

describe('ResetPasswordPage', () => {
    it('saves the new password', async () => {
        render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
        fill('Newpass1!', 'Newpass1!');
        await waitFor(() => expect(authService.setNewPassword).toHaveBeenCalledWith('Newpass1!'));
    });

    it('refuses a password that breaks the rule', () => {
        render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
        fill('newpass1', 'newpass1');
        expect(screen.getByText(PASSWORD_HINT)).toBeInTheDocument();
        expect(authService.setNewPassword).not.toHaveBeenCalled();
    });

    it('refuses passwords that do not match', () => {
        render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
        fill('Newpass1!', 'Other123!');
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        expect(authService.setNewPassword).not.toHaveBeenCalled();
    });
});
```

(If `Input` doesn't link its label to the field, use `getByPlaceholderText` with the placeholders from Step 4 instead of `getByLabelText`.)

Run: `cd frontend && npx vitest run src/pages/LoginPage.test.tsx src/pages/SignUpPage.test.tsx src/pages/ResetPasswordPage.test.tsx src/pages/ProfilePage.test.tsx`
Expected: FAIL

- [x] **Step 2: `GoogleLoginButton.tsx`**

Remove the `@react-oauth/google` import, the `onSuccess` prop and the `useGoogleLogin` block. Use:

```tsx
interface GoogleLoginButtonProps {
    mode?: 'signin' | 'signup';
}

const GoogleLoginButton = ({ mode = 'signin' }: GoogleLoginButtonProps) => {
    const { loginWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Leaves the page for Google; Supabase brings the user back to /chat signed in
    const handleClick = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch {
            showToast.error('Failed to login with Google');
            setIsLoading(false);
        }
    };
```

and change the button's `onClick={() => googleLogin()}` to `onClick={handleClick}`. Remove `onSuccess=...` from the two usages in `LoginPage.tsx` and `SignUpPage.tsx`.

- [x] **Step 3: `SignUpPage.tsx` and `LoginPage.tsx`**

`SignUpPage`: add `import { passwordProblem, PASSWORD_HINT } from '../utils/password';`. At the top of `handleSubmit`, after `setError('')`:

```tsx
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
```

(placed before `setIsLoading(true)`). On the Password `<Input>`, change `minLength={6}` to `minLength={8}` and set `placeholder={PASSWORD_HINT}`. In the `catch`, show Supabase's reason:

```tsx
      const errorMessage = err instanceof Error && err.message ? err.message : 'Failed to create account. Please try again.';
```

The try block:

```tsx
      const loggedIn = await signUp(name, email, password);
      if (loggedIn) {
        showToast.success('Account created successfully!');
        navigate('/profile');
      } else {
        showToast.success('Almost there! Confirm your email with the link we sent you, then log in.');
        navigate('/login');
      }
```

`LoginPage`: add `import { authService } from '../services/authService';`. In the `catch` of `handleSubmit`, use:

```tsx
      const errorMessage = err instanceof Error && err.message === 'Email not confirmed'
        ? 'Confirm your email first: check your inbox for the link'
        : 'Invalid email or password';
```

Add the handler:

```tsx
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Type your email first, then press "Forgot password?"');
      return;
    }
    try {
      await authService.requestPasswordReset(email);
      showToast.success('Check your email for a link to reset your password');
    } catch {
      showToast.error('Could not send the reset email. Please try again.');
    }
  };
```

and right after the Password `<Input ... />`:

```tsx
          <button type="button" onClick={handleForgotPassword} className="text-sm text-primary hover:underline">
            Forgot password?
          </button>
```

- [x] **Step 4: `ResetPasswordPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ParticleBackground from '../components/ui/ParticleBackground';
import { authService } from '../services/authService';
import { passwordProblem, PASSWORD_HINT } from '../utils/password';
import { showToast } from '../utils/toast';

// Opened from the password reset email: the link has already signed the user in
const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await authService.setNewPassword(password);
      showToast.success('Password updated');
      navigate('/chat');
    } catch (err) {
      // Expired link, or a rule Supabase checks that the UI doesn't (e.g. same as the old password)
      setError(err instanceof Error && err.message ? err.message : 'This link has expired. Ask for a new one from the login page.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-surface-dark px-4 py-8 relative overflow-hidden">
      <ParticleBackground />
      <div className="max-w-md w-full bg-cream-100/95 dark:bg-surface-darker/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-8 border border-cream-300 dark:border-surface-muted relative z-10">
        <h1 className="text-xl md:text-2xl font-roboto font-bold text-center text-text-dark dark:text-white mb-6">
          Choose a new password
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <Input label="New Password" type="password" placeholder={PASSWORD_HINT} minLength={8}
                 value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirm New Password" type="password" placeholder="Re-enter new password"
                 value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Save new password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
```

- [x] **Step 4b: `ProfilePage.tsx`**

Add `import { passwordProblem, PASSWORD_HINT } from '../utils/password';`. In `handlePasswordChange`, replace the 6-character check with:

```tsx
        const problem = passwordProblem(passwords.new);
        if (problem) {
            showToast.error(problem);
            return;
        }
```

and the `catch` with:

```tsx
        } catch (err) {
            showToast.error(err instanceof Error && err.message ? err.message : 'Failed to update password');
```

Change the New Password placeholder `"Min. 6 characters"` to `{PASSWORD_HINT}`.

- [x] **Step 5: `App.tsx`**

Delete `import { GoogleOAuthProvider } from '@react-oauth/google';`, the `googleClientId` line, and the `<GoogleOAuthProvider>` wrapper (keep its children). Add `const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));` and, next to the signup route:

```tsx
        <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
```

- [x] **Step 6: Run everything**

Run: `cd frontend && npx vitest run && npx tsc -b && grep -rn "react-oauth\|VITE_GOOGLE_CLIENT_ID\|user/login\|google-login\|change-password" src`
Expected: all tests pass, tsc clean, grep prints nothing.

- [x] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "Google sign-in, email confirmation and password reset through Supabase"
```

---

### Task 6: Docs, todo list, and the end-to-end check

**Files:**
- Modify: `README.md` (Setup → Backend `.env` block and Frontend `.env` block; add an "Accounts (Supabase Auth)" step under "Database and storage"), `frontend/.env.example`, `AUDIT_TODO.md`

- [x] **Step 1: README**

- In the backend `.env` block, delete `GOOGLE_CLIENT_ID=...`.
- Replace the frontend `.env` block with:

```env
VITE_API_BASE_URL=http://localhost:5000/api   # default
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Add a step 4 under "Database and storage" that summarises Task 0 Steps 1-3 (Email provider with Confirm email on, Site URL and redirect URLs, Google provider).
- In "Other features" → Accounts, write: "Email/password or Google sign-in through Supabase Auth, with email confirmation and password reset."

- [x] **Step 2: `frontend/.env.example`**

Replace the whole file with:

```env
# Backend API (default shown)
VITE_API_BASE_URL=http://localhost:5000/api

# Supabase Auth: Project Settings -> API Keys (the publishable key is safe in the browser)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- [x] **Step 3: End-to-end check (manual, both servers running)**

Each line must work before ticking:
- [x] A guest can chat (no login) and get outfits.
- [x] Signup with a new email shows "Almost there…"; the emailed link lands on `/chat` logged in.
- [x] Logging in before confirming shows "Confirm your email first…".
- [x] Sign up in Supabase with the existing account's email (the one `users` row). After confirming, the old chats, wardrobe, avatar and username are all there (taken over by email).
- [x] "Sign in with Google" goes to Google and comes back to `/chat` logged in.
- [x] Profile: change name/username/avatar and preferences, then reload: they're kept.
- [x] Signup with a weak password (e.g. `ciao1234`) shows the password rule and sends nothing.
- [x] Change password with the wrong current password shows "Current password is not correct" and does not redirect to /login (B2). With the right one, logging in with the new password works.
- [x] "Forgot password?" sends an email; its link opens `/reset-password`; the new password works. If Supabase refuses it asking for the current password, turn off "Require current password when updating" in Supabase (the app still checks it on the profile page) and record that in this plan.
- [x] Logout, then the browser's Back button: the chat history is not visible and the API returns 401.
- [x] Delete a test account: it disappears from Supabase → Authentication → Users, and its `users` row and photos are gone.
- [x] A logged-in outfit request uses the user's gender (backend log `print(user_preferences, gender)`).

- [x] **Step 4: `AUDIT_TODO.md`**

Tick S1, S2, S3, S3b, S4, S7 and B2, each with "(Supabase Auth migration)". Under S2b, note that only custom SMTP for the production domain remains. Add a section:

```markdown
## Before production

- [x] Supabase: custom SMTP with the production domain (built-in sender is for testing only)
- [x] Supabase: Site URL and redirect URLs set to the production domain; same domain on the Google OAuth client
- [x] Supabase: paid plan, or something keeping the free project from pausing after a week idle
```

- [x] **Step 5: Commit**

```bash
git add README.md frontend/.env.example AUDIT_TODO.md
git commit -m "Document Supabase Auth setup and tick the audit items it fixes"
```
