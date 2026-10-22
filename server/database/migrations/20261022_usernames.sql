-- ============================================================
-- HEMO-HERO
-- USERNAMES
-- ============================================================
--
-- 1. users.username: people can sign in with it or their email.
--    3 to 20 characters: lowercase letters, numbers, periods and
--    underscores, starting with a letter or number (the server
--    checks the same rule, src/utils/username.js).
-- 2. Existing accounts get a username from their email (the
--    part before @), with a number added when it's taken. They
--    can change it in Edit Profile / Settings.
-- 3. Usernames and emails are unique, ignoring letter case.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

BEGIN;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS username text NULL;

-- ============================================================
-- 2. USERNAMES FOR EXISTING ACCOUNTS
-- ============================================================

DO $$
DECLARE
    account record;
    base text;
    candidate text;
    counter integer;
BEGIN
    FOR account IN
        SELECT id, email
        FROM public.users
        WHERE username IS NULL
        ORDER BY created_at
    LOOP
        -- "Juan.Dela-Cruz@x.com" -> "juan.delacruz"
        base := lower(
            regexp_replace(
                split_part(coalesce(account.email, ''), '@', 1),
                '[^A-Za-z0-9._]',
                '',
                'g'
            )
        );

        -- Must start with a letter or number.
        base := regexp_replace(base, '^[._]+', '');

        IF length(base) < 3 THEN
            base := 'user' || base;
        END IF;

        -- Room for a number at the end (20 characters at most).
        base := left(base, 16);

        candidate := base;
        counter := 1;

        WHILE EXISTS (
            SELECT 1
            FROM public.users
            WHERE lower(username) = candidate
        ) LOOP
            counter := counter + 1;
            candidate := base || counter::text;
        END LOOP;

        UPDATE public.users
        SET username = candidate
        WHERE id = account.id;
    END LOOP;
END $$;

-- ============================================================
-- 1 + 3. FORMAT AND UNIQUENESS
-- ============================================================

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_username_format;

ALTER TABLE public.users
ADD CONSTRAINT users_username_format
CHECK (
    username IS NULL
    OR username ~ '^[a-z0-9][a-z0-9._]{2,19}$'
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
ON public.users (lower(username));

-- Supabase sign-in accounts are unique by email already; this
-- makes the app's own table say so too.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
ON public.users (lower(email));

COMMIT;
