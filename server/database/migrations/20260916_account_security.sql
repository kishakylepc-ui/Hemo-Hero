-- ============================================================
-- HEMO-HERO
-- ACCOUNT SECURITY / USER DELETION MIGRATION
-- ============================================================

BEGIN;

-- ============================================================
-- USER ACCOUNT STATUS
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;

-- ============================================================
-- USER ROLE CONSTRAINT
-- ============================================================

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (
    role IN (
        'user',
        'admin'
    )
);

-- ============================================================
-- COORDINATION SCHEDULE REFERENCES
--
-- These must become nullable so historical schedule records
-- can remain after a user permanently deletes their account.
-- ============================================================

ALTER TABLE public.blood_request_coordination_schedules
DROP CONSTRAINT IF EXISTS
blood_request_coordination_schedules_created_by_fkey;

ALTER TABLE public.blood_request_coordination_schedules
DROP CONSTRAINT IF EXISTS
blood_request_coordination_schedules_updated_by_fkey;

ALTER TABLE public.blood_request_coordination_schedules
ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.blood_request_coordination_schedules
ALTER COLUMN updated_by DROP NOT NULL;

ALTER TABLE public.blood_request_coordination_schedules
ADD CONSTRAINT
blood_request_coordination_schedules_created_by_fkey
FOREIGN KEY (
    created_by
)
REFERENCES public.users(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

ALTER TABLE public.blood_request_coordination_schedules
ADD CONSTRAINT
blood_request_coordination_schedules_updated_by_fkey
FOREIGN KEY (
    updated_by
)
REFERENCES public.users(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- ============================================================
-- DONOR PROFILE REVIEWER
-- ============================================================

ALTER TABLE public.donor_profiles
DROP CONSTRAINT IF EXISTS
donor_profiles_reviewed_by_fkey;

ALTER TABLE public.donor_profiles
ADD CONSTRAINT
donor_profiles_reviewed_by_fkey
FOREIGN KEY (
    reviewed_by
)
REFERENCES public.users(id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

COMMIT;