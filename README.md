# StyleFinder AI

A conversational fashion stylist. You describe what you need in plain language ("an outfit for a friend's
wedding, under €200") or upload a photo, and the app replies with up to three complete outfits assembled
from real shop listings, or from the clothes in your own digital wardrobe.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind (`frontend/`)
- **Backend:** Flask (`backend/`); logins through Supabase Auth
- **AI:** Mistral (Ministral 14B / 8B) for dialogue and outfit planning, FashionCLIP for image/text embeddings
- **Data:** PostgreSQL with pgvector, Supabase Storage for photos

## How it works

```
user message / photo
        │
        ▼
 ┌──────────────────────┐   asks a question (budget, occasion…)
 │ 1. Planner (Mistral) │ ─────────────────────────────────────► back to the user
 └──────────────────────┘
        │ outfit plan: per category, items with tag, fit, color, pattern
        ▼
 ┌──────────────────────┐
 │ 2. Embedding         │  "relaxed black solid graphic t-shirt" → FashionCLIP text vector
 └──────────────────────┘
        ▼
 ┌──────────────────────┐   catalogue: search_outfits_batch (pgvector, budget, gender, hard constraints)
 │ 3. Retrieval         │   only my clothes: search_wardrobe_batch (the user's own pieces)
 └──────────────────────┘
        ▼
 ┌──────────────────────┐
 │ 4. Assembly          │  knapsack over the candidates: best similarity within the budget
 └──────────────────────┘
        ▼
   up to 3 outfits + message
```

1. **Planner** (`backend/ai/src/query_handler.py`). A single Mistral call with a JSON schema reads the
   conversation and either returns `AWAITING_INPUT` with a question for the user (usually the budget), or
   `READY_TO_GENERATE` with up to three outfit plans. Hate speech and off-topic requests return
   `Guardrail` and the chat gets a fixed title. User preferences (favourite colour, brand, material,
   gender) are added to the prompt.
2. **Embedding** (`query_embedder.py`). Each planned item is turned into listing-style text (modifiers
   first, as in FashionCLIP's training captions) and embedded with
   [`patrickjohncyh/fashion-clip`](https://huggingface.co/patrickjohncyh/fashion-clip).
3. **Retrieval** (`outfit_retrieval_logic.py`, `wardrobe.py`). Vector search in Postgres returns
   candidates per item, filtered by budget, gender and any hard constraints the user stated (e.g. "must be
   black").
4. **Assembly** (`assemble_outfit.py`). A dynamic-programming knapsack picks one candidate per slot,
   maximising similarity while staying within the budget. Items already used in an earlier option are
   avoided so the three options differ.

`outfit_recommendation_handler` in `backend/ai/src/app.py` runs the whole pipeline.

### Other features

- **Refinement.** "Change the shoes" or "remove the jacket" edits the selected outfit instead of building a
  new one.
- **Photo input.** Find a piece like the one in the photo, copy a whole look, or complete an outfit around
  a piece you own.
- **Digital wardrobe** (profile page). Upload photos of your clothes, sorted into sections. Each piece is
  checked by the model on upload: offensive content or photos that aren't clothing are refused. You can
  then:
  - pick pieces to build an outfit around,
  - switch on **Only my clothes** to build outfits only from your wardrobe (no budget),
  - add a piece you photographed in chat to your wardrobe with one tap.
- **Explanations.** "Explain this outfit" asks the model to explain the choices (`/api/outfit/explain`).
- **Accounts.** Email/password (with email confirmation and password reset) or Google sign-in, through
  Supabase Auth. The frontend sends the Supabase access token with each API call and the backend verifies
  it (`backend/auth.py`); our `users` row holds the profile (username, avatar, preferences) and is created
  on the account's first request. Conversation history (rename/delete).
- **Progress.** The frontend polls `/api/messages/progress/<id>` so it can say when the questions are over
  and the outfit is being built.

Model calls go through `model_fallback.py`. It translates the Gemini-style request types used across the
code into Mistral's API, retries on rate limits and malformed JSON, and falls back from Ministral 14B to
8B.

## Repository layout

```
backend/
  app.py                  Flask API (auth, chat, wardrobe, conversations, preferences)
  db_manager.py           PostgreSQL access
  storage_manager.py      Supabase Storage (images, wardrobe, avatars buckets)
  title_generator.py      chat titles
  import_ebay.py          fills product_data from the eBay Browse API
  embed_wardrobe.py       one-off: embeddings for wardrobe pieces uploaded before they were searchable
  schema.sql              base database schema
  migrations/             later schema changes, one dated file each
  ai/src/                 the outfit pipeline (see above)
  auth.py                 verifies Supabase Auth tokens
  ai/test_*.py, test_auth.py, test_rate_limit.py, test_explain.py, test_guest_chats.py, test_chat_photos.py, test_small_fixes.py   backend checks
frontend/
  src/pages/              Landing, Login, SignUp, Chat, Profile, HowToUse
  src/components/         chat, profile (wardrobe), layout, ui
  src/context/            auth, chat, theme state
  src/services/           API clients (axios)
```

## Setup

### Requirements

- Python 3.12, Node.js 18+
- A PostgreSQL database with the `vector` extension, Supabase Storage and Supabase Auth (a Supabase
  project provides all three)
- A [Mistral API key](https://console.mistral.ai/) (the free plan is enough: it allows the Ministral
  models)
- Optional: a Google OAuth client ID (Google sign-in) and an eBay production keyset (catalogue import)

### Database and storage

1. Run `backend/schema.sql` on the database. It creates the tables, the `search_outfits_batch` function
   and the preference names.
2. Run the files in `backend/migrations/` in filename order.
3. In Supabase Storage create three **public** buckets: `images` (chat photos), `wardrobe` and `avatars`.
4. In Supabase Authentication:
   - **Sign In / Providers**: turn on **Confirm email**. In the Email provider set the minimum password
     length to 8 with lowercase, uppercase, digits and symbols (the frontend mirrors this rule in
     `frontend/src/utils/password.ts`), and turn on *Secure password change* and *Require current
     password when updating*.
   - **URL Configuration**: Site URL `http://localhost:5173`, and add `http://localhost:5173/**` to the
     Redirect URLs.
   - **Google** (optional): enable it with a Google OAuth client ID and secret. In Google Cloud, the client
     needs the redirect URI shown on that page (`https://<project>.supabase.co/auth/v1/callback`).
   - The built-in email sender only delivers to the project's team members and a few emails an hour:
     production needs custom SMTP.

### Backend

```bash
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

Create `backend/.env`:

```env
SECRET_KEY=a-long-random-string          # signs the session cookies (required)

DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=...
DB_PASSWORD=...

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=...                         # used by the outfit pipeline (vector search RPCs)
SUPABASE_RLS_KEY=...                     # used for Storage and for deleting Supabase Auth accounts

MISTRAL_API_KEY=...

EBAY_CLIENT_ID=...                       # optional: import_ebay.py
EBAY_CLIENT_SECRET=...
```

Start the server (port 5000, restarts automatically when a `.py` file changes):

```bash
venv/bin/python app.py
```

The first start downloads the FashionCLIP model from Hugging Face.

### Catalogue

`product_data` starts empty. Fill it from eBay (about 3,800 of the 5,000 daily Browse API calls; safe to
re-run):

```bash
venv/bin/python import_ebay.py
```

Without a catalogue the shop search finds nothing, but **Only my clothes** still works from the wardrobe.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`frontend/.env` (restart `npm run dev` after changing it):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # Project Settings -> API Keys
VITE_API_BASE_URL=http://localhost:5000/api        # optional, this is the default
```

## Tests

```bash
# backend (from backend/)
venv/bin/python -m ai.test_wardrobe_picks
venv/bin/python -m ai.test_clean_constraints
venv/bin/python -m ai.test_drop_owned_categories
venv/bin/python -m ai.test_accessories
venv/bin/python -m ai.test_drop_targets
venv/bin/python -m ai.test_kept_items_budget
venv/bin/python -m ai.test_model_fallback
venv/bin/python test_auth.py
venv/bin/python test_rate_limit.py
venv/bin/python test_explain.py   # loads the app (and CLIP)
venv/bin/python test_guest_chats.py   # loads the app; uses the real DB and cleans up after itself
venv/bin/python test_chat_photos.py   # loads the app
venv/bin/python test_small_fixes.py   # loads the app

# frontend (from frontend/)
npm test
npm run lint
```

## Database changes

Never edit `schema.sql` for a change to an existing database. Add a new file to `backend/migrations/`
named `YYYY-MM-DD_description.sql` and run it.
