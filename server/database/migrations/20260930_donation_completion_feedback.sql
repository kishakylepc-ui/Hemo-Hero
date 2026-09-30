-- ============================================================
-- HEMO-HERO
-- DONATION AUTO-COMPLETION + TRANSACTION FEEDBACK MIGRATION
-- ============================================================
--
-- Run AFTER 20260930_blood_donations.sql.
--
-- Changes the donation record workflow so admins do NOT have
-- to approve every transaction:
--
--   Requester confirms the donation
--     -> all checks pass  : status = 'completed' (recorded,
--                           donor history updated right away)
--     -> a check fails    : status = 'needs_review'
--   Donor reports a problem -> status = 'needs_review'
--   Admin reviews ONLY flagged records:
--     -> mark valid       : status = 'completed'
--     -> reject           : status = 'rejected' (note required)
--
-- Also adds donation_feedback: after each donation the donor and
-- the requester can rate the transaction (1-5) and comment.
--
-- Safe to re-run.
-- ============================================================

BEGIN;

-- ============================================================
-- BLOOD DONATIONS: NEW STATUSES
-- ============================================================

ALTER TABLE public.blood_donations
DROP CONSTRAINT IF EXISTS blood_donations_status_check;

-- Records created under the old "admin verifies everything"
-- workflow become completed records.
UPDATE public.blood_donations
SET status = 'completed'
WHERE status IN ('pending_verification', 'verified');

ALTER TABLE public.blood_donations
ALTER COLUMN status SET DEFAULT 'completed';

ALTER TABLE public.blood_donations
ADD CONSTRAINT blood_donations_status_check
CHECK (
    status IN (
        'completed',
        'needs_review',
        'rejected'
    )
);

-- ============================================================
-- BLOOD DONATIONS: REVIEW + DONOR HISTORY COLUMNS
-- ============================================================

ALTER TABLE public.blood_donations
  -- Why a record needs review, e.g. 'interval_under_90_days',
  -- 'donor_not_verified', 'blood_type_incompatible',
  -- 'donor_disputed'.
  ADD COLUMN IF NOT EXISTS review_reasons text[] NOT NULL DEFAULT '{}',

  -- Donor's own report that the record is wrong.
  ADD COLUMN IF NOT EXISTS dispute_note text NULL,
  ADD COLUMN IF NOT EXISTS disputed_at timestamp with time zone NULL,

  -- Whether this record updated the donor's last donation date,
  -- and what it was before (so a rejected record can undo it).
  ADD COLUMN IF NOT EXISTS donor_history_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_donor_history jsonb NULL;

ALTER TABLE public.blood_donations
DROP CONSTRAINT IF EXISTS blood_donations_dispute_note_length;

ALTER TABLE public.blood_donations
ADD CONSTRAINT blood_donations_dispute_note_length
CHECK (dispute_note IS NULL OR length(dispute_note) <= 500);

COMMENT ON COLUMN public.blood_donations.verified_by
  IS 'Admin who reviewed a flagged record (marked valid or rejected).';

COMMENT ON COLUMN public.blood_donations.verified_at
  IS 'When an admin reviewed a flagged record.';

-- ============================================================
-- TRANSACTION FEEDBACK
--
-- One rating per side (donor / requester) per donation. Users
-- may edit their own feedback (upsert on donation_id+from_role).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.donation_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    donation_id uuid NOT NULL,

    request_id uuid NULL,

    -- Who wrote it and who it is about.
    from_user_id uuid NULL,
    to_user_id uuid NULL,

    from_role text NOT NULL,

    rating smallint NOT NULL,

    comment text NULL,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    updated_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    CONSTRAINT donation_feedback_from_role_check
        CHECK (from_role IN ('donor', 'requester')),

    CONSTRAINT donation_feedback_rating_check
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT donation_feedback_comment_length
        CHECK (comment IS NULL OR length(comment) <= 500),

    CONSTRAINT donation_feedback_one_per_side
        UNIQUE (donation_id, from_role),

    CONSTRAINT donation_feedback_donation_id_fkey
        FOREIGN KEY (donation_id)
        REFERENCES public.blood_donations(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT donation_feedback_request_id_fkey
        FOREIGN KEY (request_id)
        REFERENCES public.blood_requests(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT donation_feedback_from_user_id_fkey
        FOREIGN KEY (from_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT donation_feedback_to_user_id_fkey
        FOREIGN KEY (to_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS
donation_feedback_donation_id_idx
ON public.donation_feedback(donation_id);

CREATE INDEX IF NOT EXISTS
donation_feedback_to_user_id_idx
ON public.donation_feedback(to_user_id);

-- Clients never access this table directly (backend only).
ALTER TABLE public.donation_feedback
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATION TYPES
--
-- Every existing type is kept. New:
--   donation_disputed            requester: donor reported a problem
--   donation_feedback_received   other side left feedback
--   admin_donation_flagged       admins: a record needs review
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
    'admin_donation_flagged'
  )
);

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
