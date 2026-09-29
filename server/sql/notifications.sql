-- ============================================================
-- HEMO-HERO NOTIFICATIONS
-- ============================================================
--
-- This file documents and recreates the notification system
-- used by the Hemo-Hero backend.
--
-- Run this in:
-- Supabase Dashboard -> SQL Editor
--
-- ============================================================


-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES public.users(id)
    ON DELETE CASCADE,

  type TEXT NOT NULL,

  title TEXT NOT NULL,

  message TEXT NOT NULL,

  related_request_id UUID
    DEFAULT NULL,

  data JSONB NOT NULL
    DEFAULT '{}'::jsonb,

  is_read BOOLEAN NOT NULL
    DEFAULT FALSE,

  read_at TIMESTAMPTZ
    DEFAULT NULL,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW()
);


-- ============================================================
-- ADD MISSING COLUMNS TO OLDER NOTIFICATION TABLES
-- ============================================================

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS related_request_id UUID
DEFAULT NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS data JSONB
NOT NULL
DEFAULT '{}'::jsonb;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_read BOOLEAN
NOT NULL
DEFAULT FALSE;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ
DEFAULT NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
NOT NULL
DEFAULT NOW();


-- ============================================================
-- NOTIFICATION TYPES
-- ============================================================

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (
  type IN (
    -- Legacy / general
    'request',
    'match',
    'system',

    -- Donor responses
    'donor_response_received',
    'donor_response_withdrawn',
    'donor_response_accepted',
    'donor_response_rejected',

    -- Blood requests
    'blood_request_fulfilled',
    'blood_request_cancelled',

    -- Donor applications
    'donor_application_approved',
    'donor_application_rejected',

    -- Donation coordination
    'coordination_message',
    'coordination_schedule',

    -- Admin portal
    -- (see database/migrations/20260929_admin_notifications.sql)
    'admin_donor_application',
    'admin_user_report',
    'admin_urgent_blood_request'
  )
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
  notifications_user_id_idx
ON public.notifications(
  user_id
);

CREATE INDEX IF NOT EXISTS
  notifications_user_read_idx
ON public.notifications(
  user_id,
  is_read
);

CREATE INDEX IF NOT EXISTS
  notifications_user_created_idx
ON public.notifications(
  user_id,
  created_at DESC
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.notifications
ENABLE ROW LEVEL SECURITY;

-- Hemo-Hero currently accesses this table through the Express
-- backend using the Supabase service-role client.
--
-- Therefore, no direct mobile-client RLS policy is required.


-- ============================================================
-- REFRESH POSTGREST SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';