-- ============================================================
-- HEMO-HERO
-- ADMIN ACCOUNT LOCK
-- ============================================================
--
-- An admin can lock an account: it can't sign in, and its
-- current sessions stop working, until an admin unlocks it.
-- Unlike deactivating, nothing else changes (offers, requests
-- and invitations stay as they are). Unlocking also clears a
-- sign-in lockout from wrong passwords (login_lockouts).
--
-- The columns allow NULL (meaning not locked) so backups made
-- before this migration still restore.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

BEGIN;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone NULL;

-- Shown to admins only.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS locked_reason text NULL;

COMMIT;
