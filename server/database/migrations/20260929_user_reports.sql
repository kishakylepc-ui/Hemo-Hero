-- ============================================================
-- HEMO-HERO
-- USER REPORTS / FEEDBACK (ADMIN ISSUES) MIGRATION
-- ============================================================
--
-- Stores feedback and reports that users submit from a
-- donation coordination conversation.
--
-- Admins review these in the Admin Portal "Issues" module.
--
-- The reported person is ALWAYS derived by the backend from
-- the authorized conversation (request + accepted response).
-- The client never chooses who is being reported.
-- ============================================================

BEGIN;

-- ============================================================
-- USER REPORTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- feedback = general experience feedback
    -- report   = complaint about the other participant
    kind text NOT NULL,

    -- Person who submitted the feedback/report.
    reporter_id uuid NULL,

    -- The other participant in the conversation.
    reported_user_id uuid NULL,

    -- Snapshots keep the report readable even if an account
    -- is later deleted (FKs below use ON DELETE SET NULL).
    reporter_email text NULL,
    reported_user_email text NULL,

    -- Conversation the report came from.
    request_id uuid NULL,
    response_id uuid NULL,

    -- Required for kind = 'report'.
    -- Matches REPORT_REASONS in the mobile app.
    reason text NULL,

    -- Free-text details.
    -- Required for kind = 'feedback', optional for reports.
    details text NULL,

    -- Admin workflow
    status text NOT NULL DEFAULT 'open',

    admin_note text NULL,

    reviewed_by uuid NULL,
    reviewed_at timestamp with time zone NULL,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    updated_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    -- --------------------------------------------------------
    -- VALUE CHECKS
    -- --------------------------------------------------------

    CONSTRAINT user_reports_kind_check
        CHECK (kind IN ('feedback', 'report')),

    CONSTRAINT user_reports_status_check
        CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),

    CONSTRAINT user_reports_reason_check
        CHECK (
            reason IS NULL
            OR reason IN (
                'Spam',
                'Harassment',
                'Misleading information',
                'Other'
            )
        ),

    -- A report must have a reason.
    CONSTRAINT user_reports_report_reason_required
        CHECK (kind <> 'report' OR reason IS NOT NULL),

    -- Feedback must have text.
    CONSTRAINT user_reports_feedback_details_required
        CHECK (
            kind <> 'feedback'
            OR length(btrim(coalesce(details, ''))) > 0
        ),

    CONSTRAINT user_reports_details_length
        CHECK (details IS NULL OR length(details) <= 2000),

    CONSTRAINT user_reports_admin_note_length
        CHECK (admin_note IS NULL OR length(admin_note) <= 2000),

    -- --------------------------------------------------------
    -- FOREIGN KEYS
    -- --------------------------------------------------------

    CONSTRAINT user_reports_reporter_id_fkey
        FOREIGN KEY (reporter_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT user_reports_reported_user_id_fkey
        FOREIGN KEY (reported_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT user_reports_reviewed_by_fkey
        FOREIGN KEY (reviewed_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT user_reports_request_id_fkey
        FOREIGN KEY (request_id)
        REFERENCES public.blood_requests(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION,

    CONSTRAINT user_reports_response_id_fkey
        FOREIGN KEY (response_id)
        REFERENCES public.blood_request_responses(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
user_reports_created_at_idx
ON public.user_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS
user_reports_status_idx
ON public.user_reports(status);

CREATE INDEX IF NOT EXISTS
user_reports_kind_idx
ON public.user_reports(kind);

CREATE INDEX IF NOT EXISTS
user_reports_reporter_id_idx
ON public.user_reports(reporter_id);

CREATE INDEX IF NOT EXISTS
user_reports_reported_user_id_idx
ON public.user_reports(reported_user_id);

-- ------------------------------------------------------------
-- DUPLICATE PROTECTION
--
-- A user may only have ONE unresolved report per conversation.
-- Once an admin resolves/dismisses it, they may report again.
-- Feedback is not limited.
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
user_reports_one_open_report_per_conversation
ON public.user_reports(reporter_id, response_id)
WHERE kind = 'report'
  AND status IN ('open', 'in_review');

-- ============================================================
-- ROW LEVEL SECURITY
--
-- Clients must NOT access this table directly.
--
-- Reports are created and reviewed only through the Express
-- backend using the service-role client after authorization.
-- ============================================================

ALTER TABLE public.user_reports
ENABLE ROW LEVEL SECURITY;

COMMIT;
