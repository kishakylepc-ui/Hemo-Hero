-- ============================================================
-- HEMO-HERO
-- ISSUE ACTIONS
-- ============================================================
--
-- Closing an issue in the Admin Portal now records what was
-- actually done, and both sides hear about it.
--
-- 1. user_reports.action_taken
--      'warned'          the reported user was sent a warning
--      'deactivated'     the reported user's account was
--                        deactivated
--      'request_removed' the reported blood request was taken
--                        down
--      'request_kept'    the reported blood request was
--                        reviewed and kept up
--    NULL means no action beyond the status (plain Resolve or
--    Dismiss, and every issue that is still open).
--
-- 2. Backfill: request reports that were already closed by
--    Remove Request get 'request_removed'.
--
-- 3. Notification types:
--      report_reviewed   reporter: their issue was closed
--      account_warning   reported user: an admin warned them
--
-- Run once in the Supabase SQL editor, after
-- 20261007_notification_settings_backups.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ACTION TAKEN
-- ============================================================

ALTER TABLE public.user_reports
ADD COLUMN IF NOT EXISTS action_taken text NULL;

ALTER TABLE public.user_reports
DROP CONSTRAINT IF EXISTS user_reports_action_taken_check;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_action_taken_check
CHECK (
    action_taken IS NULL
    OR action_taken IN (
        'warned',
        'deactivated',
        'request_removed',
        'request_kept'
    )
);

-- ============================================================
-- 2. BACKFILL REMOVED REQUESTS
--
-- Remove Request resolved every open report on the request
-- with the removing admin as reviewer.
-- ============================================================

UPDATE public.user_reports AS report
SET action_taken = 'request_removed'
FROM public.blood_requests AS request
WHERE report.request_id = request.id
  AND report.kind = 'report'
  AND report.response_id IS NULL
  AND report.status = 'resolved'
  AND report.action_taken IS NULL
  AND request.removed_at IS NOT NULL
  AND report.reviewed_by IS NOT DISTINCT FROM request.removed_by;

-- ============================================================
-- 3. NOTIFICATION TYPES
--
-- Every existing type is kept. New:
--   report_reviewed   reporter: issue resolved or dismissed
--   account_warning   reported user: warned by an admin
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
    'blood_request_removed',
    'blood_request_expired',

    -- Donor applications
    'donor_application_approved',
    'donor_application_rejected',

    -- Donation coordination
    'coordination_message',
    'coordination_schedule',
    'coordination_no_show',
    'coordination_trip_started',
    'coordination_trip_near',
    'coordination_trip_arrived',

    -- Donations (transaction record)
    'donation_recorded',
    'donation_verified',
    'donation_rejected',
    'donation_disputed',
    'donation_feedback_received',

    -- Reports / issues
    'report_reviewed',
    'account_warning',

    -- Admin portal
    'admin_donor_application',
    'admin_user_report',
    'admin_urgent_blood_request',
    'admin_donation_recorded',
    'admin_donation_flagged',
    'admin_request_flagged'
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
