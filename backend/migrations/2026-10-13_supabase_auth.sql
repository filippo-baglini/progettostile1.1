-- Logins move to Supabase Auth. Each users row links to its auth.users account through auth_id, set on
-- that account's first API request (DBManager.get_or_create_auth_user). Passwords and Google ids now live
-- in Supabase. Run once in the Supabase SQL editor (safe to re-run), together with the backend change.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
