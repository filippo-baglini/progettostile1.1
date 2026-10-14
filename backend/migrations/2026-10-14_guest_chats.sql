-- Guest chats live in the DB like users' chats (no longer in the server's memory), so they survive
-- restarts and work with several server processes. Run once in the Supabase SQL editor (safe to re-run).

-- The guest's chat id is temp_<guest_token>; only the browser that started the chat knows it
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS guest_token UUID UNIQUE;
-- Guests pick a gender per chat; users have theirs on users.gender
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS guest_gender VARCHAR(20);

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_owner_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_owner_check CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL);
