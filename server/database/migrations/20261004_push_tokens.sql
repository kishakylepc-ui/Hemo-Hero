-- ============================================================
-- HEMO-HERO
-- PUSH NOTIFICATION DEVICES
-- ============================================================
--
-- One row per phone that allowed notifications: its Expo push
-- token and the account currently signed in on it. Every in-app
-- notification for that account (except admin-portal alerts) is
-- also sent to these phones as a push notification.
--
-- A token belongs to one phone, so it is unique: signing in
-- with another account on the same phone moves it to that
-- account, and signing out removes it.
--
-- Run once in the Supabase SQL editor, after
-- 20261003_donor_trips.sql.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL,

    -- ExponentPushToken[...]
    token text NOT NULL,

    platform text NULL,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    updated_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    CONSTRAINT push_tokens_platform_check
        CHECK (
            platform IS NULL
            OR platform IN ('ios', 'android')
        ),

    CONSTRAINT push_tokens_token_length
        CHECK (length(token) <= 255),

    CONSTRAINT push_tokens_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
push_tokens_token_key
ON public.push_tokens(token);

CREATE INDEX IF NOT EXISTS
push_tokens_user_id_idx
ON public.push_tokens(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
--
-- Only the Express backend (service role) reads and writes
-- push tokens.
-- ============================================================

ALTER TABLE public.push_tokens
ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
