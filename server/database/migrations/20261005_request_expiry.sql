-- ============================================================
-- HEMO-HERO
-- REQUEST EXPIRY
-- ============================================================
--
-- The server now closes active requests that are past their
-- time (24 hours after the needed date/time, urgent ones after
-- 3 days, undated ones after 7 days):
--   - with a recorded donation -> 'fulfilled'
--   - otherwise                -> 'expired' (+ expired_at)
-- and tells the requester and the donors involved.
--
-- 1. blood_requests.expired_at
-- 2. 'expired' allowed in blood_requests.status, and
--    'cancelled' in blood_request_invitations.status (both
--    re-created with every existing status kept)
-- 3. Notification type blood_request_expired
--
-- Run once in the Supabase SQL editor, after
-- 20261004_push_tokens.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXPIRED TIMESTAMP
-- ============================================================

ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS expired_at timestamp with time zone NULL;

-- ============================================================
-- 2. STATUS VALUES
--
-- Drops whichever status check exists (its name may differ
-- between databases) and adds one with every status.
-- ============================================================

DO $$
DECLARE
    constraint_row record;
BEGIN
    FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.blood_requests'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
          AND pg_get_constraintdef(oid) ILIKE '%fulfilled%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.blood_requests DROP CONSTRAINT %I',
            constraint_row.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.blood_requests
ADD CONSTRAINT blood_requests_status_check
CHECK (
    status IN (
        'active',
        'fulfilled',
        'cancelled',
        'expired'
    )
);

-- ============================================================
-- 2b. INVITATION STATUS VALUES
--
-- Closing a request now cancels its pending invitations, so
-- 'cancelled' must be allowed (every existing status kept).
-- ============================================================

DO $$
DECLARE
    constraint_row record;
BEGIN
    FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.blood_request_invitations'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
          AND pg_get_constraintdef(oid) ILIKE '%declined%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.blood_request_invitations DROP CONSTRAINT %I',
            constraint_row.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.blood_request_invitations
ADD CONSTRAINT blood_request_invitations_status_check
CHECK (
    status IN (
        'pending',
        'accepted',
        'declined',
        'cancelled'
    )
);

-- ============================================================
-- 3. NOTIFICATION TYPES
--
-- Every existing type is kept. New:
--   blood_request_expired   requester + donors: request expired
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
