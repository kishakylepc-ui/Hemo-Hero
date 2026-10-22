-- ============================================================
-- HEMO-HERO
-- ONE-TIME CODE LIMITS
-- ============================================================
--
-- otp_attempts: when each 6-digit code was sent and how many
-- wrong tries it has had, so the server can enforce its code
-- rules (src/services/otpGuardService.js) across restarts:
--
-- - a code expires 10 minutes after it was sent
-- - 5 wrong tries use it up
-- - a new code only 60 seconds after the last one
--
-- Supabase sends and checks the codes; each works once.
--
-- Run once in the Supabase SQL editor, after
-- 20261014_schedule_agreement.sql.
-- ============================================================

BEGIN;

-- One row per kind of code and email. Only the server
-- (service role) reads and writes it.
CREATE TABLE IF NOT EXISTS public.otp_attempts (
    -- signup, recovery or email_change
    kind text NOT NULL
        CHECK (kind IN ('signup', 'recovery', 'email_change')),

    email text NOT NULL,

    -- When the current code was sent (NULL: sent before this
    -- table existed).
    sent_at timestamp with time zone NULL,

    -- Wrong tries on the current code.
    wrong_count integer NOT NULL DEFAULT 0
        CHECK (wrong_count >= 0),

    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    PRIMARY KEY (kind, email)
);

ALTER TABLE public.otp_attempts
ENABLE ROW LEVEL SECURITY;

COMMIT;
