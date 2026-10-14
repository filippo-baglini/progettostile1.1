# Audit TODO

Findings from the codebase audit of 2026-10-13, merged with the colleague's review of the same day
(the former `TODO.md`). Tick an item (`[x]`) when its fix is committed.
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
- [x] **S5. No rate or size limits on paid/heavy endpoints.**
  - [x] `/api/messages/send` and `/api/outfit/explain` have no rate limit; each call can trigger several Mistral calls plus CLIP inference, and guests can flood the 200-slot `not_auth_convs` cache. *(fixed 2026-10-14: per-IP limit, 10/min on send and 20/min on explain, `backend/rate_limit.py`. Guest access stays on by choice; the freemium quota is under "Before production")*
  - [x] `/explain` takes any `user_prompt` and `outfit_data`, so it works as an open LLM proxy. *(fixed 2026-10-14, see below)*
  - [x] Full fix for the above: the server looks the outfit and chat up by message id instead of trusting the client (needs B4 for guests). *(fixed 2026-10-14: `/explain` takes conv_id, message_id and outfit_index; `backend/test_explain.py`)*
  - [x] No `MAX_CONTENT_LENGTH`: uploads can be any size. *(fixed in d0e78b6: 10 MB cap, 413)*
  - [x] Pillow still decodes images up to ~179 MP (~0.5 GB RAM each): a small, highly compressed file can pass the 10 MB cap. *(fixed 2026-10-14: refused above 60 MP)*
  - [x] Chat photos are kept at full resolution (`app.py:664`, no `max_size`). *(fixed 2026-10-14: resized to 1024 px)*
  - [x] Guest chats hold their photos in RAM (200 conversations, no per-conversation image limit). *(fixed 2026-10-14: guest chats are stored in the DB and their photos in storage like users' ones, deleted when the guest leaves the chat (new chat, login, closed tab) or after 2 h idle; migration `2026-10-14_guest_chats.sql`, `backend/test_guest_chats.py`)*
- [x] **S6. Vulnerable dependencies.** `npm audit`: axios (high), form-data (high), react-router / react-router-dom (high, partly SSR-only), follow-redirects (moderate). Fix: `npm audit fix`. Also pin versions in `backend/requirements.txt`. *(fixed 2026-10-14: `npm audit fix` took the frontend from 35 flagged packages to 7; Python packages updated within their major versions after `pip-audit`, and `requirements.txt` pinned. Left: the two items below)*
  - [ ] Tailwind CSS 3 → 4: the last 7 `npm audit` findings (braces, chokidar, micromatch, fast-glob, postcss-nested, postcss-selector-parser, tailwindcss) all come through it. Build-time only, never shipped to browsers, so not a risk for users. See "Before production".
  - [ ] torch 2.9 → 2.13 and transformers 4 → 5 (major; check FashionCLIP still loads and embeds the same): `pip-audit` lists issues in loading untrusted models/checkpoints (Trainer, X-CLIP, LightGlue, `torch.jit`), paths this app doesn't use.

### Low
- [x] **S7.** The backend has no password rules (only the frontend checks for at least 6 characters). Emails are case-sensitive, so `Foo@x.com` and `foo@x.com` become two accounts, and the Google email match misses. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [x] **S8.** The explanation endpoint returns the raw exception text to the client (`backend/ai/src/get_explanations.py`, last line). *(fixed 2026-10-14: logged, generic message to the client)*
- [x] **S9.** Personal data in logs: `print(user_preferences, gender)` and full LLM responses on the backend; `console.log('DEBUG: Raw history...')` in `frontend/src/services/chatService.ts:238`. *(removed, 2026-10-14; the remaining `DEBUG` prints log no personal data, see C9)*
- [x] **S10.** Chat photos are uploaded before the ownership check and before the AI call (`app.py:678`), so failed or rejected requests leave orphan files in storage. *(fixed 2026-10-14: uploaded right before the message is saved, deleted again if the save fails)*
- [x] **S11. DB credentials have defaults.** `DBManager` falls back to `DB_PASSWORD='password'` and `DB_HOST='localhost'` (`backend/db_manager.py:21`). Fail at startup like `SECRET_KEY` does. *(fixed 2026-10-14: DB_HOST, DB_NAME, DB_USER and DB_PASSWORD are required; DB_PORT keeps 5432)*
- [x] **S12. Photos are public.** Chat and wardrobe photos live in public buckets (the UUIDs can't be guessed, but anyone with the URL can see them). *(decided 2026-10-14: they stay public. Listing the `images`, `wardrobe` and `avatars` buckets with the public key returns nothing, so the names can't be enumerated; signed URLs aren't worth the work. The remaining step, saying so in the privacy policy, is under Before production.)*

## Bugs

- [x] **B1. Saved preferences never reach the AI.** `preferences_management.py:37` builds `favorite_Color` (DB names are `Color`, `Brand`, `Material`), but `query_handler.py:866-871` reads `favorite_color`. Fix: lowercase the name. *(fixed 2026-10-14)*
- [x] **B2. A wrong current password on the Profile page redirects to /login.** The backend returns 401 (`app.py:339`) and the axios interceptor sends every 401 to `/login` (`frontend/src/services/api.ts:20`). Google-only users hit this too. Fix: return 400 or 403. *(fixed by the Supabase Auth migration, 2026-10-14)*
- [x] **B3. The frontend times out after 60 s** (`api.ts:7`), but the backend can take much longer (120 s per Mistral call, plus retries and fallback). The user sees an error while the reply is still saved; retrying duplicates the message. *(fixed in d0e78b6: frontend waits 5 min, Mistral calls time out after 60 s)*
- [x] **B4. Guests can't refine a selected outfit.** Guest replies have no `message_id`; the frontend sends `assistant-<timestamp>`, which the backend never matches (`backend/ai/src/app.py:98-103`); the guest path didn't even pass `selected_message_id`. *(fixed 2026-10-14: guest replies get a uuid, and the guest path passes the selection)*
- [x] **B5. Prompts call item IDs UUIDs** (`query_handler.py:375,380,586,591`), but real IDs are integers or `w12`. An invented UUID makes REMOVE or REPLACE silently do nothing (`ai/src/app.py:327`). *(fixed 2026-10-14: the prompts ask for the ID as listed in the history; a REPLACE with an unknown ID replaces the only item of its category)*
- [x] **B6. No gender defaults to "male"** (`query_handler.py:654`): the planner plans men's outfits while the catalogue search applies no gender filter. *(fixed 2026-10-14: `/api/messages/send` returns 400 without male, female or non-binary; the planner default is gone)*
- [x] **B7. Database errors are swallowed.** `get_chat_messages` returns `[]` on error (`db_manager.py:523`), so the AI answers without history. `update_user_preferences` returns False on any error, which the API reports as 404 "Utente non trovato". *(fixed 2026-10-14: these, `get_user_preferences` and `preferences` raise, so the endpoints return 500; the write helpers already did)*
- [x] **B8. Every message re-downloads and re-sends all past chat photos** (`app.py:854-895`): slow and expensive, and *likely* hits Mistral's per-request image limit. *(fixed 2026-10-14: only the chat's last 3 photos are downloaded and sent; they are still re-downloaded on every message, cache them if that shows up as slow)*
- [x] **B9. Lowering the budget while refining can drop kept items:** the budget optimizer may skip any slot, including locked ones. *(fixed 2026-10-14: kept items are paid for first and never dropped; while refining every requested piece is filled, cheapest if nothing fits; an over-budget outfit card says "Over Budget")*
- [x] **B10. Small ones:**
  - [x] A request with no `message` crashes with a 500 (`query_handler.py:731`, `ai/src/app.py:220`). *(400 when there is no text, photo or wardrobe piece)*
  - [x] Deleting a conversation without `conv_id` raises on `int(None)` and returns 500 (`app.py:941`). *(400)*
  - [x] A non-image file sent to `/api/messages/send` crashes `compress_image` with a 500 instead of a 400. *(fixed 2026-10-14)*
  - [x] `/api/chat` accepts `GET` but reads a JSON body, and its docstring is copied from `get_conversations`. Make it `POST` only (the frontend already uses POST).
  - [x] `query_embedder.py`'s `__main__` calls `get_text_embedding_vector(test_text)` with one argument instead of four. *(the demo is removed)*
  - [x] The DB status on `/` is checked once, at startup, not on each request.
  - [x] A negative `selected_outfit_index` is accepted (`ai/src/app.py:115-132`).
  - [x] A double tap on "Add to wardrobe" can create two pieces (`app.py:498-509` checks, then inserts, without locking). *(the suggestion is claimed with one UPDATE first, and put back if adding fails)*
  - [x] A catalogue item with a NULL price crashes outfit assembly (`assemble_outfit.py`, `item['price'] * 100`). *(`price` is NOT NULL: `migrations/2026-10-14_product_constraints.sql`)*
  - [x] A product with an empty colour matches every colour filter (`schema.sql`, `ILIKE '%' || schema_color || '%'`). *(a CHECK forbids empty colours, same migration)*
  - [x] Chat titles aren't length-capped (LLM title or rename): anything over 255 characters gives a 500. *(cut to 255 where they are saved)*
- [x] **B11. Most Mistral errors aren't retried.** `model_fallback.py` only retries on rate limits (found by searching the error text for "429") and on bad JSON. Check `r.status_code` and also retry on 5xx and `requests.Timeout`. *(fixed 2026-10-14: retried by status: 429, 5xx, timeouts, dropped connections and bad JSON; other errors are raised at once)*

## Performance

- [x] **P1. No vector index on `product_data.img_embedding`.** *(decided 2026-10-14: not needed. A search reads only its category and gender, ~300 of 3,649 products, in ~60 ms; an approximate HNSW index pays off from ~50k products. Revisit then, and test it with the filters: HNSW fetches its ~40 nearest before the `WHERE` filters, so a brand or category filter can leave a slot with no candidates.)*
- [x] **P2. Text embeddings run the image model on a dummy image** (`query_embedder.py`). Use `MODEL.get_text_features(**PROC(text=[...]))`. *(fixed 2026-10-14: same vectors, 266 → 48 ms per text on CPU)*
- [x] **P3. A new Postgres connection per request.** Use `psycopg2.pool`. *(fixed 2026-10-14: 4 pooled connections, rolled back on return and checked after 30 s idle; ~420 → ~130 ms for a one-query request)*

## Inconsistencies and cleanup

- [x] **C1.** Two ways of reading preferences: Supabase REST in `ai/src/preferences_management.py` and psycopg2 in `db_manager.py` (the REST path has B1). Keep one. *(fixed 2026-10-14: the outfit planner uses `DBManager.get_user_preferences` too; `preferences_management.py` is gone)*
- [x] **C2.** Two Supabase clients; `SUPABASE_RLS_KEY` is a secret key that bypasses RLS, so the name is misleading. With psycopg2 that makes three ways into the same DB: the search RPCs could be plain SQL through `DBManager`. *(fixed 2026-10-14: the searches run through `DBManager` (same results, ~300 ms instead of ~1.3 s); one Supabase client left, for Storage and deleting accounts, with one key, `SUPABASE_SECRET_KEY`)*
- [x] **C3.** Image size caps differ: avatars 512 px, wardrobe 1024 px, chat photos none. *(fixed 2026-10-14: chat photos 1024 px like the wardrobe)*
- [x] **C4.** Wardrobe pieces get the offensive-content check; avatars don't. *(fixed 2026-10-14: avatars before upload, and name/username when they change, through the same check as wardrobe pieces (`ai/src/moderation.py`). Names set at signup aren't checked yet: add it with the social features)*
- [x] **C5.** Error messages and docstrings mix Italian and English. *(fixed 2026-10-14: all English in the backend and in the frontend's comments; the DB keeps the preference name `Genere`, which the frontend relies on)*
- [x] **C6.** Outdated docs:
  - [x] `frontend/.env.example` (Supabase and OpenAI options that aren't used) *(rewritten with the migration)*
  - [x] `frontend/.github/copilot-instructions.md` (says React 18, Router v6) *(deleted 2026-10-14)*
  - [x] `frontend/docs/StyleFinder_Frontend_Manual.tex` (mentions a missing `mockData.ts`) *(deleted 2026-10-14)*
  - [x] `frontend/.env.local.example` (duplicate of `.env.example`), the unused Vite `/api` proxy, the unused vitest `@` alias *(deleted 2026-10-14)*
- [x] **C7.** The README says to run migrations in filename order, which runs `wardrobe_from_chat` before `wardrobe_outfits`, the opposite of what its own header says it needs. *(fixed 2026-10-14: the README lists the order)*
- [x] **C8.** Deployment: the CORS origins are hardcoded to localhost and the app runs on Flask's development server. Use gunicorn with **1** worker (the progress store and the rate-limit counts live in process memory; guest chats moved to the DB), not `app.run(use_reloader=True)`, which loads CLIP twice. *(fixed 2026-10-14: `FRONTEND_ORIGINS` env var; gunicorn command in the README, Backend setup)*
- [ ] **C9.** Leftover code: the unused `chat_history`/`history` passing, the "legacy single outfit" fallbacks, and `DEBUG` prints. Replace `print()` with `logging` (see S9).
- [ ] **C10.** ESLint: 44 errors and 8 warnings (mostly `no-explicit-any` and unused variables).
- [x] **C11.** Remove `pandas`: it does one group-by in `outfit_retrieval_logic.py`, which a dict can do. *(fixed 2026-10-14 with C2)*
- [ ] **C12.** `google-genai` is only installed for its request types, which get translated to Mistral. Writing Mistral messages directly would remove it and most of `model_fallback.py` (bigger refactor).
- [ ] **C13.** `schema.sql` contains `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` lines; move them into migrations, as the README says.

## Missing

- [ ] **M1. CI:** a GitHub Actions workflow running `npm test`, `npm run lint` and the backend checks.
- [ ] **M2. Backend tests** for the knapsack (`assemble_outfit.py`) and for ownership checks (user A can't read or edit user B's chats or wardrobe pieces).

## Before production

- [ ] Deploy the built site (`npm run build`, serve `dist/` from a web host), never `npm run dev`: the dev server and its tools aren't meant to be public.
- [ ] Upgrade Tailwind CSS 3 → 4 (S6). About half a day:
  - [ ] Run `npx @tailwindcss/upgrade`: moves the setup to the `@tailwindcss/vite` plugin and `@import "tailwindcss"`, drops autoprefixer, moves `tailwind.config.js` into an `@theme` block, renames classes (`shadow-sm`→`shadow-xs`, `blur-sm`→`blur-xs`, `outline-none`→`outline-hidden`, `flex-shrink`→`shrink`, ...).
  - [ ] By hand: the 9 bare `rounded` become `rounded-sm`, which this project redefines (`--radius-sm`); `ring-opacity-50` in `index.css` becomes `ring-primary/50`.
  - [ ] Check the changed defaults: a bare `border` turns the text colour instead of light grey (93 uses; keep the compatibility CSS the tool offers), `ring` is 1px and current colour, buttons lose the hand cursor.
  - [ ] Look through every page in light and dark mode: landing, login, signup, reset password, chat, profile, how-to-use. The tests don't check styling.
  - [ ] Accept the browser cut: Safari 16.4+, Chrome 111+, Firefox 128+ (iPhones on iOS < 16.4 would get broken styling).
- [ ] Freemium quota: a few outfit generations a day for guests and free users, many more (or unlimited) for paid ones. Count per user and day in the DB; guests can only be counted per IP or browser, so keep their allowance small. Separate from the per-IP rate limit, which stays for everyone.
- [ ] Several server workers: move the rate-limit counts to Redis (Flask-Limiter supports it); the progress store too (only the "putting your outfit together" text depends on it).
- [ ] Behind a reverse proxy, add werkzeug's `ProxyFix`, or the rate limit sees every request as coming from the proxy.
- [ ] Database: use Supabase's pooler in transaction mode (port 6543 in `DB_PORT`) instead of session mode (5432). In session mode each of our connections takes one of the plan's ~15 real DB connections; in transaction mode ~200 clients share them, a real one taken only while a query runs. psycopg2 works there (no server-side prepared statements).
- [ ] Database: hand the request's connection back to the pool before the Mistral call in `send_message` and take one again to save the reply. Today an outfit being generated holds its connection for the whole 10-30 s, so ~15 generating at once would hit "max clients" (P3).
- [ ] Privacy policy (there is none yet). Among the rest, say that chat, wardrobe and profile photos can be opened by anyone who has their link, until they're deleted (S12).
- [ ] Terms of Service (there are none yet), linked from signup next to the privacy policy.

- [ ] Supabase: custom SMTP with the production domain (see S2b)
- [ ] Supabase: Site URL and Redirect URLs set to the production domain; the same domain on the Google OAuth client
- [ ] Supabase: paid plan, or something keeping the free project from pausing after a week idle

## Unblocked by the catalogue (3,649 products imported)

- [ ] **T1.** The owned-category filter is too coarse: owning a shirt blocks suggesting a sweater (both `top`).
- [ ] **T2.** Compare FashionCLIP retrieval with the modifiers-first wording against the old word order on real requests.
