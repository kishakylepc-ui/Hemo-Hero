-- ============================================================
-- HEMO-HERO
-- DEACTIVATION REASONS AND ACCOUNT REVIEWS
-- ============================================================
--
-- Admins now give a reason when they deactivate or delete an
-- account, and a deactivated person can ask for a review.
--
-- users.deactivation_reason  Why an admin deactivated it. The
--                            person sees it when they sign in.
-- users.deactivated_by       Who did it (the person themselves,
--                            or an admin).
-- account_reviews            "Please review my account" requests
--                            from deactivated people. Admins
--                            reactivate (approved) or decline
--                            with a note the person sees.
-- removed_accounts           Why an admin deleted an account.
--                            Keyed by a hash of the email (the
--                            account itself is gone), so the
--                            reason can be shown if someone signs
--                            in with that email again.
--
-- Only the server (service role) reads and writes these.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

BEGIN;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deactivation_reason text NULL;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deactivated_by uuid NULL
REFERENCES public.users(id)
ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.account_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
  REFERENCES public.users(id)
  ON DELETE CASCADE,

  message text NOT NULL
  CHECK (char_length(message) BETWEEN 1 AND 1000),

  status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'declined')),

  -- Shown to the person when declined.
  admin_note text NULL,

  reviewed_by uuid NULL
  REFERENCES public.users(id)
  ON DELETE SET NULL,

  reviewed_at timestamp with time zone NULL,

  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_reviews_status_idx
ON public.account_reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS account_reviews_user_idx
ON public.account_reviews (user_id, created_at DESC);

-- One open request per account.
CREATE UNIQUE INDEX IF NOT EXISTS account_reviews_one_pending
ON public.account_reviews (user_id)
WHERE status = 'pending';

ALTER TABLE public.account_reviews
ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.removed_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- sha256 of the lowercased email.
  email_hash text NOT NULL,

  reason text NOT NULL,

  removed_by uuid NULL
  REFERENCES public.users(id)
  ON DELETE SET NULL,

  removed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS removed_accounts_email_idx
ON public.removed_accounts (email_hash, removed_at DESC);

ALTER TABLE public.removed_accounts
ENABLE ROW LEVEL SECURITY;

COMMIT;
