-- ============================================================
-- HEMO-HERO
-- LOG TRAIL / ACTIVITY LOG MIGRATION
-- ============================================================

BEGIN;

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User responsible for the activity.
    -- Nullable so historical logs remain if an account is deleted.
    user_id uuid NULL,

    -- Snapshots preserve identity information even if
    -- the user's account is later deleted.
    user_email text NULL,
    user_role text NULL,

    -- Example:
    -- LOGIN
    -- LOGOUT
    -- REGISTER
    -- UPDATE_PROFILE
    -- CREATE_BLOOD_REQUEST
    -- APPROVE_DONOR_APPLICATION
    action text NOT NULL,

    -- Example:
    -- Authentication
    -- Profile
    -- Blood Requests
    -- Donor Application
    -- Administration
    module text NOT NULL,

    -- HTTP information
    http_method text NULL,
    route text NULL,
    status_code integer NULL,

    -- Result of the activity
    success boolean NOT NULL DEFAULT true,

    -- Human-readable description
    description text NULL,

    -- Optional related record
    entity_type text NULL,
    entity_id text NULL,

    -- Request information
    ip_address inet NULL,
    user_agent text NULL,

    -- Extra safe information.
    -- NEVER store passwords, tokens, OTPs, or secrets here.
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    CONSTRAINT activity_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
activity_logs_user_id_idx
ON public.activity_logs(user_id);

CREATE INDEX IF NOT EXISTS
activity_logs_created_at_idx
ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS
activity_logs_action_idx
ON public.activity_logs(action);

CREATE INDEX IF NOT EXISTS
activity_logs_module_idx
ON public.activity_logs(module);

CREATE INDEX IF NOT EXISTS
activity_logs_success_idx
ON public.activity_logs(success);

-- ============================================================
-- ROW LEVEL SECURITY
--
-- The mobile/admin applications should NOT access this table
-- directly from the client.
--
-- Logs will be accessed through the Express backend using the
-- service-role client after Admin authorization.
-- ============================================================

ALTER TABLE public.activity_logs
ENABLE ROW LEVEL SECURITY;

COMMIT;