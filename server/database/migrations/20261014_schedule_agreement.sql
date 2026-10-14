-- ============================================================
-- HEMO-HERO
-- MEETING TIME AGREEMENT
-- ============================================================
--
-- A meeting time set in the chat is now a suggestion until the
-- other side agrees. Either side can suggest a different time
-- instead, and it goes back and forth until one side agrees to
-- the other's time. Changing an agreed time starts it again.
--
-- blood_request_coordination_schedules
--   status       'proposed'  waiting for the other side
--                'agreed'    both sides agreed
--                NULL        set before this update (and rows
--                            from older backups); treated as
--                            agreed
--   proposed_by  who suggested the current time
--   agreed_at    when the other side agreed
--
-- Only an agreed time counts for a no-show report.
--
-- Agreement notifications reuse the existing
-- 'coordination_schedule' type, so the notification type list
-- is unchanged.
--
-- Run once in the Supabase SQL editor, after
-- 20261011_trip_arrival_check.sql.
-- ============================================================

BEGIN;

ALTER TABLE public.blood_request_coordination_schedules
ADD COLUMN IF NOT EXISTS status text NULL;

ALTER TABLE public.blood_request_coordination_schedules
ADD COLUMN IF NOT EXISTS proposed_by uuid NULL;

ALTER TABLE public.blood_request_coordination_schedules
ADD COLUMN IF NOT EXISTS agreed_at timestamp with time zone NULL;

ALTER TABLE public.blood_request_coordination_schedules
DROP CONSTRAINT IF EXISTS blood_request_coordination_schedules_status_check;

ALTER TABLE public.blood_request_coordination_schedules
ADD CONSTRAINT blood_request_coordination_schedules_status_check
CHECK (
    status IS NULL
    OR status IN (
        'proposed',
        'agreed'
    )
);

ALTER TABLE public.blood_request_coordination_schedules
DROP CONSTRAINT IF EXISTS blood_request_coordination_schedules_proposed_by_fkey;

ALTER TABLE public.blood_request_coordination_schedules
ADD CONSTRAINT blood_request_coordination_schedules_proposed_by_fkey
FOREIGN KEY (proposed_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- Times set before this update were accepted as they were.
UPDATE public.blood_request_coordination_schedules
SET
    status = 'agreed',
    proposed_by = COALESCE(updated_by, created_by),
    agreed_at = updated_at
WHERE status IS NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
