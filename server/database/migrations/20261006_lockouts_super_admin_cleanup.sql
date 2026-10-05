-- ============================================================
-- HEMO-HERO
-- LOGIN LOCKOUTS, SUPER ADMIN, TABLE CLEANUP
-- ============================================================
--
-- 1. login_lockouts: failed sign-in counts and lockouts, so a
--    lockout survives a server restart (3 wrong passwords lock
--    the account for 1, then 3, 5 and 10 minutes).
-- 2. Role super_admin. The first admin account becomes the
--    super admin, who can also manage admin accounts.
-- 3. Removes two early tables the app never used
--    (matches, donor_profiles), both empty, and the early
--    find_nearby_donors function (the server finds nearby
--    donors itself).
--
-- Run once in the Supabase SQL editor, after
-- 20261005_request_expiry.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. LOGIN LOCKOUTS
--
-- One row per sign-in email. Only the server (service role)
-- reads and writes it.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_lockouts (
    email text PRIMARY KEY,

    -- Wrong passwords in the current 3-attempt cycle.
    failed_count integer NOT NULL DEFAULT 0
        CHECK (failed_count >= 0),

    first_failed_at timestamp with time zone NULL,
    last_failed_at timestamp with time zone NULL,

    -- Sign-in is blocked until this time.
    locked_until timestamp with time zone NULL,

    -- How many lockouts so far (each one lasts longer).
    lock_level integer NOT NULL DEFAULT 0
        CHECK (lock_level >= 0),

    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.login_lockouts
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. SUPER ADMIN ROLE
-- ============================================================

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (
    role IN (
        'user',
        'admin',
        'super_admin'
    )
);

-- The first admin account becomes the super admin (only when
-- there isn't one yet).
UPDATE public.users
SET
    role = 'super_admin',
    updated_at = now()
WHERE id = (
    SELECT id
    FROM public.users
    WHERE role = 'admin'
    ORDER BY created_at
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE role = 'super_admin'
);

-- ============================================================
-- 3. UNUSED TABLES
--
-- The old function may read donor_profiles, so it goes first,
-- then matches (it references donor_profiles).
-- ============================================================

DROP FUNCTION IF EXISTS public.find_nearby_donors(uuid, numeric);

DROP TABLE IF EXISTS public.matches;
DROP TABLE IF EXISTS public.donor_profiles;

COMMIT;

NOTIFY pgrst, 'reload schema';
