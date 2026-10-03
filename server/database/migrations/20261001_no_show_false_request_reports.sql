-- ============================================================
-- HEMO-HERO
-- NO-SHOW AND FALSE REQUEST REPORTS
-- ============================================================
--
-- 1. New report reasons:
--    - 'No-show'            the other person didn't come at the
--                           agreed time (from the coordination chat)
--    - 'False request'      a blood request that isn't real
--    - 'Asking for payment' a request that asks donors for money
--
-- 2. Request reports (made from the request page, so there is no
--    conversation): one open report per person per request.
--
-- 3. Request review state:
--    - flagged_at      set after 3 separate reports; the request is
--                      hidden from nearby donors until an admin
--                      reviews it
--    - removed_at / removed_by / removal_reason
--                      an admin took the request down (its status
--                      becomes 'cancelled')
--
-- 4. Notification types for the above.
--
-- Run once in the Supabase SQL editor.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REPORT REASONS
-- ============================================================

ALTER TABLE public.user_reports
DROP CONSTRAINT IF EXISTS user_reports_reason_check;

ALTER TABLE public.user_reports
ADD CONSTRAINT user_reports_reason_check
CHECK (
    reason IS NULL
    OR reason IN (
        'Spam',
        'Harassment',
        'Misleading information',
        'Other',
        'No-show',
        'False request',
        'Asking for payment'
    )
);

-- ============================================================
-- 2. ONE OPEN REPORT PER PERSON PER REQUEST
--
-- Conversation reports are already limited per conversation
-- (user_reports_one_open_report_per_conversation). Request
-- reports have no conversation (response_id IS NULL).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
user_reports_one_open_report_per_request
ON public.user_reports(reporter_id, request_id)
WHERE kind = 'report'
  AND response_id IS NULL
  AND status IN ('open', 'in_review');

CREATE INDEX IF NOT EXISTS
user_reports_request_id_idx
ON public.user_reports(request_id);

-- ============================================================
-- 3. REQUEST REVIEW STATE
-- ============================================================

ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone NULL;

ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS removed_at timestamp with time zone NULL;

ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS removed_by uuid NULL;

ALTER TABLE public.blood_requests
ADD COLUMN IF NOT EXISTS removal_reason text NULL;

ALTER TABLE public.blood_requests
DROP CONSTRAINT IF EXISTS blood_requests_removed_by_fkey;

ALTER TABLE public.blood_requests
ADD CONSTRAINT blood_requests_removed_by_fkey
FOREIGN KEY (removed_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

ALTER TABLE public.blood_requests
DROP CONSTRAINT IF EXISTS blood_requests_removal_reason_length;

ALTER TABLE public.blood_requests
ADD CONSTRAINT blood_requests_removal_reason_length
CHECK (
    removal_reason IS NULL
    OR length(removal_reason) <= 1000
);

-- ============================================================
-- 4. NOTIFICATION TYPES
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

    -- Donor applications
    'donor_application_approved',
    'donor_application_rejected',

    -- Donation coordination
    'coordination_message',
    'coordination_schedule',
    'coordination_no_show',

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
