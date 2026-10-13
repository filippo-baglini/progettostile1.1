-- Usernames and profile pictures. Run once in the Supabase SQL editor (safe to re-run).

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;  -- user-chosen ones match [a-z0-9._]{3,30}
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(64);        -- storage: avatars/public/<avatar_id>.jpg

-- Every user starts with a username from their email, e.g. mario-12. The '-' can't appear in
-- user-chosen usernames and the id is unique, so generated ones never collide with anything.
CREATE OR REPLACE FUNCTION default_username(email text, id int) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(NULLIF(left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]', '', 'g'), 19), ''), 'user')
           || '-' || id;
$$;

CREATE OR REPLACE FUNCTION set_default_username() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.username := COALESCE(NEW.username, default_username(NEW.email, NEW.id));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_default_username ON users;
CREATE TRIGGER users_default_username BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION set_default_username();

UPDATE users SET username = default_username(email, id) WHERE username IS NULL;
