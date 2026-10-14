# Audit TODO

Findings from the codebase audit of 2026-10-13. Tick an item (`[x]`) when its fix is committed.
"Likely" items were traced in the code but not reproduced.

## Security

### High
- [x] **S1. Any Google access token logs in.** The frontend uses the implicit flow (access token); the backend falls back to Google's userinfo endpoint (`backend/app.py:225-238`) without checking the token was issued to our client ID, so a token from any other Google-login app can be replayed here. Fix: use the ID-token flow (`<GoogleLogin>` / `credential`) and remove the access-token fallback. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [x] **S2. Account pre-hijacking.** Signup never verifies the email; Google login links to any account with the same email (`app.py:244-251`) and doesn't check `email_verified`. An attacker who registers the victim's email first keeps password access after the victim signs in with Google. Fix: check `email_verified`; when linking to an unverified password account, refuse or clear its password. *(fixed by the Supabase Auth migration, 2026-10-14)*

- [ ] **S2b. Email from our own domain.** Email confirmation and password reset now work through Supabase Auth; what remains is custom SMTP with the production domain (Supabase's built-in sender only reaches project team members, a few emails an hour).

### Medium
- [x] **S3. CSRF on multipart endpoints.** `/api/messages/send` (form branch), `POST /api/wardrobe` and `/api/user/avatar` have no CSRF token and `SameSite` isn't set; Firefox and Safari send the cookie cross-site. Fix: `SESSION_COOKIE_SAMESITE='Lax'`. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [x] **S3b. Logout is a GET** (`app.py:265`), so any `<img>` tag on another page can log users out. Fix: make it POST. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [x] **S4. Sessions can't be revoked.** Flask's signed-cookie sessions stay valid after logout and after a password change; `SESSION_COOKIE_SECURE` isn't set for production. *(fixed by the Supabase Auth migration, 2026-10-14: logout and password changes revoke the session; an access token already issued stays valid until it expires, 1 hour by default)*
- [ ] **S5. No rate or size limits on paid/heavy endpoints.**
  - [ ] `/api/messages/send` and `/api/outfit/explain` work without login and have no rate limit.
  - [ ] `/explain` takes any `user_prompt` and `outfit_data`, so it works as an open LLM proxy.
  - [ ] No `MAX_CONTENT_LENGTH`: uploads can be any size; Pillow decodes images up to ~179 MP (~0.5 GB RAM each).
  - [ ] Chat photos are kept at full resolution (`app.py:664`, no `max_size`); guest chats hold them in RAM (200 conversations, no per-conversation image limit).
- [ ] **S6. Vulnerable dependencies.** `npm audit`: axios (high), form-data (high), react-router / react-router-dom (high, partly SSR-only), follow-redirects (moderate). Fix: `npm audit fix`. Also pin versions in `backend/requirements.txt`.

### Low
- [x] **S7.** The backend has no password rules (only the frontend checks for at least 6 characters). Emails are case-sensitive, so `Foo@x.com` and `foo@x.com` become two accounts, and the Google email match misses. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [ ] **S8.** The explanation endpoint returns the raw exception text to the client (`backend/ai/src/get_explanations.py`, last line).
- [ ] **S9.** Personal data in logs: `print(user_preferences, gender)` and full LLM responses on the backend; `console.log('DEBUG: Raw history...')` in `frontend/src/services/chatService.ts:238`.
- [ ] **S10.** Chat photos are uploaded before the ownership check and before the AI call (`app.py:678`), so failed or rejected requests leave orphan files in storage.

## Bugs

- [ ] **B1. Saved preferences never reach the AI.** `preferences_management.py:37` builds `favorite_Color` (DB names are `Color`, `Brand`, `Material`), but `query_handler.py:866-871` reads `favorite_color`. Fix: lowercase the name.
- [x] **B2. A wrong current password on the Profile page redirects to /login.** The backend returns 401 (`app.py:339`) and the axios interceptor sends every 401 to `/login` (`frontend/src/services/api.ts:20`). Google-only users hit this too. Fix: return 400 or 403. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [ ] **B3. The frontend times out after 60 s** (`api.ts:7`), but the backend can take much longer (120 s per Mistral call, plus retries and fallback). The user sees an error while the reply is still saved; retrying duplicates the message.
- [ ] **B4. *Likely:* guests can't refine a selected outfit.** Guest replies have no `message_id`; the frontend sends `assistant-<timestamp>`, which the backend never matches (`backend/ai/src/app.py:98-103`).
- [ ] **B5. Prompts call item IDs UUIDs** (`query_handler.py:375,380,586,591`), but real IDs are integers or `w12`. An invented UUID makes REMOVE or REPLACE silently do nothing (`ai/src/app.py:327`).
- [ ] **B6. No gender defaults to "male"** (`query_handler.py:654`): the planner plans men's outfits while the catalogue search applies no gender filter.
- [ ] **B7. Database errors are swallowed.** `get_chat_messages` returns `[]` on error (`db_manager.py:523`), so the AI answers without history. `update_user_preferences` returns False on any error, which the API reports as 404 "Utente non trovato".
- [ ] **B8. Every message re-downloads and re-sends all past chat photos** (`app.py:854-895`): slow and expensive, and *likely* hits Mistral's per-request image limit.
- [ ] **B9. Lowering the budget while refining can drop kept items:** the budget optimizer may skip any slot, including locked ones.
- [ ] **B10. Small ones:**
  - [ ] A request with no `message` crashes with a 500 (`query_handler.py:731`, `ai/src/app.py:220`).
  - [ ] Deleting a conversation without `conv_id` raises on `int(None)` and returns 500 (`app.py:941`).
  - [ ] A negative `selected_outfit_index` is accepted (`ai/src/app.py:115-132`).
  - [ ] A double tap on "Add to wardrobe" can create two pieces (`app.py:498-509` checks, then inserts, without locking).
  - [ ] A catalogue item with a NULL price crashes outfit assembly (`assemble_outfit.py`, `item['price'] * 100`).
  - [ ] A product with an empty colour matches every colour filter (`schema.sql`, `ILIKE '%' || schema_color || '%'`).
  - [ ] Chat titles aren't length-capped (LLM title or rename): anything over 255 characters gives a 500.

## Inconsistencies and cleanup

- [ ] **C1.** Two ways of reading preferences: Supabase REST in `ai/src/preferences_management.py` and psycopg2 in `db_manager.py` (the REST path has B1). Keep one.
- [ ] **C2.** Two Supabase clients; `SUPABASE_RLS_KEY` is a secret key that bypasses RLS, so the name is misleading.
- [ ] **C3.** Image size caps differ: avatars 512 px, wardrobe 1024 px, chat photos none.
- [ ] **C4.** Wardrobe pieces get the offensive-content check; avatars don't.
- [ ] **C5.** Error messages and docstrings mix Italian and English.
- [ ] **C6.** Outdated docs:
  - [x] `frontend/.env.example` (Supabase and OpenAI options that aren't used) *(rewritten with the migration)*
  - [ ] `frontend/.github/copilot-instructions.md` (says React 18, Router v6)
  - [ ] `frontend/docs/StyleFinder_Frontend_Manual.tex`
- [ ] **C7.** The README says to run migrations in filename order, which runs `wardrobe_from_chat` before `wardrobe_outfits`, the opposite of what its own header says it needs.
- [ ] **C8.** Deployment: the CORS origins are hardcoded to localhost and the app runs on Flask's development server.
- [ ] **C9.** Leftover code: the unused `chat_history`/`history` passing, the "legacy single outfit" fallbacks, and `DEBUG` prints.
- [ ] **C10.** ESLint: 44 errors and 8 warnings (mostly `no-explicit-any` and unused variables).

## Before production

- [ ] Supabase: custom SMTP with the production domain (see S2b)
- [ ] Supabase: Site URL and Redirect URLs set to the production domain; the same domain on the Google OAuth client
- [ ] Supabase: paid plan, or something keeping the free project from pausing after a week idle

## Unblocked by the catalogue (3,649 products imported)

- [ ] **T1.** The owned-category filter is too coarse: owning a shirt blocks suggesting a sweater (both `top`).
- [ ] **T2.** Compare FashionCLIP retrieval with the modifiers-first wording against the old word order on real requests.
