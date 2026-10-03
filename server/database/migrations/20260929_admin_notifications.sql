-- ============================================================
-- HEMO-HERO
-- ADMIN NOTIFICATION TYPES MIGRATION
-- ============================================================
--
-- Admins reuse the existing public.notifications table.
-- Each admin receives their own row (user_id = admin id), so the
-- existing /api/notifications routes work for admins unchanged.
--
-- This migration only adds the new admin notification types to
-- the type CHECK constraint. Every existing type is kept.
--
-- New types:
--   admin_donor_application      donor application awaiting review
--   admin_user_report            new user report / feedback (Issues)
--   admin_urgent_blood_request   new urgent blood request
-- ============================================================

BEGIN;

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
    'admin_donor_application',
    'admin_user_report',
    'admin_urgent_blood_request'
  )
);

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
