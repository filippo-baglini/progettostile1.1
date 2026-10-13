# Open issues

Found in the 2026-10-13 review. Already fixed: Google login token checks, upload size limit
(`MAX_CONTENT_LENGTH`), SameSite cookies + logout as POST, frontend/Mistral timeout mismatch.

## Security

- [ ] **No rate limit on the AI endpoints.** `/api/messages/send` and `/api/outfit/explain` work for guests
      with no limit; each call can trigger several Mistral calls plus CLIP inference. Guests can also flood
      the 200-slot `not_auth_convs` cache and evict other guests' chats. Add a per-IP limit (e.g. Flask-Limiter).
- [ ] **DB credentials have defaults.** `DBManager` falls back to `DB_PASSWORD='password'`,
      `DB_HOST='localhost'` (`backend/db_manager.py:21`). Fail at startup like `SECRET_KEY` does.
- [ ] **Signup has no validation.** No email format check, no minimum password length. `email_exists` +
      `INSERT` is a race: catch `psycopg2.errors.UniqueViolation` instead.
- [ ] **Photos are public.** Chat and wardrobe photos live in public buckets (unguessable UUIDs, but anyone
      with the URL can see them). Use signed URLs, or at least state it in the privacy notes.

## Bugs

- [ ] **Most Mistral errors aren't retried.** `model_fallback.py` only retries on rate limits (spotted by
      searching the error text for "429") and bad JSON. Check `r.status_code`, and retry on 5xx and
      `requests.Timeout` too.
- [ ] **500 instead of 400 on bad input.** `delete_conversation` runs `int(data.get("conv_id"))`, which crashes
      when it's missing. `send_message` runs `compress_image` on any upload, so a non-image file crashes the
      request.
- [ ] **`/api/chat` accepts `GET` but reads a JSON body**, and its docstring is copied from `get_conversations`.
      Make it `POST` only, which is what the frontend already uses.
- [ ] **`query_embedder.py` `__main__` is broken**: it calls `get_text_embedding_vector(test_text)` with one
      argument instead of four.
- [ ] **The DB status on `/` is checked once, at startup**, not on each request.

## Performance

- [ ] **No vector index on `product_data.img_embedding`**, so every search reads the whole catalogue. Add
      `CREATE INDEX ... USING hnsw (img_embedding vector_cosine_ops)` in a migration, and move the
      `similarity > match_threshold` filter after the `ORDER BY ... LIMIT` (otherwise the index isn't used).
- [ ] **Every message re-downloads every earlier photo** in the conversation from Supabase (`load_messages`).
- [ ] **Text embeddings run the image model on a dummy image.** Use `MODEL.get_text_features(**PROC(text=[...]))`.
- [ ] **A new Postgres connection per request.** Use `psycopg2.pool`.
- [ ] **Production server.** Use gunicorn with **1** worker (progress store and guest chats are in process
      memory), not `app.run(use_reloader=True)`, which loads CLIP twice.

## Cleanup

- [ ] Remove `pandas` (one group-by in `outfit_retrieval_logic.py`; a dict does it).
- [ ] `google-genai` is only installed for its request types, which get translated to Mistral. Writing Mistral
      messages directly would remove it and most of `model_fallback.py` (bigger refactor).
- [ ] Three ways into the same DB: psycopg2, Supabase client with `SUPABASE_KEY`, Supabase client with
      `SUPABASE_RLS_KEY`. The search RPCs could be plain SQL through `DBManager`.
- [ ] Pin versions in `backend/requirements.txt` (`pip freeze`); `torch`/`transformers` upgrades can break installs.
- [ ] Replace `print()` with `logging`; `print(user_preferences, gender)` in `ai/src/app.py` writes personal
      data to the logs.
- [ ] Pick one language (Italian/English) for error messages, docstrings and comments.
- [ ] Frontend leftovers: `.env.example` (Supabase anon key, OpenAI, mock data: none used),
      `.env.local.example` (duplicate), `.github/copilot-instructions.md` (React 18 / Router v6),
      `docs/StyleFinder_Frontend_Manual.tex` (mentions a missing `mockData.ts`), the unused Vite `/api` proxy,
      the unused vitest `@` alias.
- [ ] `schema.sql` contains `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` lines; move them into migrations, as the
      README says.

## Missing

- [ ] **CI**: a GitHub Actions workflow running `npm test`, `npm run lint` and the backend checks.
- [ ] **Backend tests** for the knapsack (`assemble_outfit.py`) and for ownership checks (user A can't read or
      edit user B's chats or wardrobe pieces).
