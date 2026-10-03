-- ============================================================
-- HEMO-HERO
-- BLOOD DONATIONS (TRANSACTION RECORD) MIGRATION
-- ============================================================
--
-- Completes the blood request transaction cycle:
--
--   1. Admin approves the donor application      donor_applications
--   2. Requester posts a blood request           blood_requests
--   3. Verified donor offers to donate           blood_request_responses
--   4. Requester accepts the donor offer         response -> accepted
--   5. Requester confirms the donation was       blood_donations
--      received at the facility                  -> pending_verification
--   6. Admin verifies the donation               blood_donations
--                                                -> verified
--
-- One donation record per accepted donor offer. If an admin
-- rejects a record, the requester may confirm it again
-- (see the partial unique index below).
--
-- Also stores WHEN a request was fulfilled / cancelled and adds
-- the donation notification types.
--
-- Safe to re-run.
-- ============================================================

BEGIN;

-- ============================================================
-- REQUEST CLOSE TIMESTAMPS
-- ============================================================

ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Requests closed before this migration: use their last update
-- time as the best available close time.
UPDATE public.blood_requests
SET fulfilled_at = updated_at
WHERE status = 'fulfilled'
  AND fulfilled_at IS NULL;

UPDATE public.blood_requests
SET cancelled_at = updated_at
WHERE status = 'cancelled'
  AND cancelled_at IS NULL;

-- ============================================================
-- BLOOD DONATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blood_donations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The transaction this donation completes.
    request_id uuid NULL,
    response_id uuid NULL,

    donor_id uuid NULL,
    requester_id uuid NULL,

    -- Snapshots keep the record readable even if an account or
    -- request is later deleted (FKs below use ON DELETE SET NULL).
    donor_name text NULL,
    requester_name text NULL,
    blood_type text NOT NULL,
    facility_name text NULL,

    units_donated smallint NOT NULL DEFAULT 1,

    -- When the donation happened, as confirmed by the requester.
    donated_at timestamp with time zone NOT NULL,

    requester_note text NULL,

    -- Admin verification workflow
    status text NOT NULL DEFAULT 'pending_verification',

    admin_note text NULL,

    verified_by uuid NULL,
    verified_at timestamp with time zone NULL,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    updated_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    -- --------------------------------------------------------
    -- VALUE CHECKS
    -- --------------------------------------------------------

    CONSTRAINT blood_donations_status_check
        CHECK (
            status IN (
                'pending_verification',
                'verified',
                'rejected'
            )
        ),

    CONSTRAINT blood_donations_blood_type_check
        CHECK (
            blood_type IN (
                'A+', 'A-',
                'B+', 'B-',
                'AB+', 'AB-',
                'O+', 'O-'
            )
        ),

    CONSTRAINT blood_donations_units_check
        CHECK (units_donated BETWEEN 1 AND 20),

    CONSTRAINT blood_donations_requester_note_length
        CHECK (requester_note IS NULL OR length(requester_note) <= 500),

    CONSTRAINT blood_donations_admin_note_length
        CHECK (admin_note IS NULL OR length(admin_note) <= 1000),

    -- A rejection must always explain why.
    CONSTRAINT blood_donations_rejection_note_required
        CHECK (
            status <> 'rejected'
            OR length(btrim(coalesce(admin_note, ''))) > 0
        ),

    -- --------------------------------------------------------
    -- FOREIGN KEYS
    -- --------------------------------------------------------

    CONSTRAINT blood_donations_request_id_fkey
        FOREIGN KEY (request_id)
        REFERENCES public.blood_requests(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT blood_donations_response_id_fkey
        FOREIGN KEY (response_id)
        REFERENCES public.blood_request_responses(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT blood_donations_donor_id_fkey
        FOREIGN KEY (donor_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT blood_donations_requester_id_fkey
        FOREIGN KEY (requester_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT blood_donations_verified_by_fkey
        FOREIGN KEY (verified_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
blood_donations_created_at_idx
ON public.blood_donations(created_at DESC);

CREATE INDEX IF NOT EXISTS
blood_donations_status_idx
ON public.blood_donations(status);

CREATE INDEX IF NOT EXISTS
blood_donations_request_id_idx
ON public.blood_donations(request_id);

CREATE INDEX IF NOT EXISTS
blood_donations_donor_id_idx
ON public.blood_donations(donor_id);

CREATE INDEX IF NOT EXISTS
blood_donations_requester_id_idx
ON public.blood_donations(requester_id);

-- ------------------------------------------------------------
-- DUPLICATE PROTECTION
--
-- Only ONE pending or verified donation per accepted donor
-- offer. A rejected record does not block a corrected one.
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
blood_donations_one_active_per_response
ON public.blood_donations(response_id)
WHERE status <> 'rejected';

-- ============================================================
-- ROW LEVEL SECURITY
--
-- Clients must NOT access this table directly. Donations are
-- recorded and verified only through the Express backend using
-- the service-role client after authorization.
-- ============================================================

ALTER TABLE public.blood_donations
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATION TYPES
--
-- Every existing type is kept. New:
--   donation_recorded         donor: requester confirmed the donation
--   donation_verified         donor + requester: admin verified it
--   donation_rejected         donor + requester: admin rejected it
--   admin_donation_recorded   admins: donation awaiting verification
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

    -- Admin portal
    'admin_donor_application',
    'admin_user_report',
    'admin_urgent_blood_request',
    'admin_donation_recorded'
  )
);

COMMIT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
