-- ============================================================
-- HEMO-HERO
-- "NOT HERE YET" ON A DONOR'S ARRIVAL
-- ============================================================
--
-- A donor can be marked as arrived by GPS or by tapping
-- "I've arrived". If the requester can't actually see them,
-- the requester taps "Not here yet": the trip goes back to
-- "on the way" (live location again) and this time is saved.
--
-- blood_request_trips.arrival_disputed_at
--   When the requester last said the donor isn't there yet.
--   For a few minutes after it, GPS doesn't mark the donor as
--   arrived again on its own (they can still tap "I've
--   arrived"), and the donor's trip screen explains why.
--   Cleared when the donor taps "I've arrived" again.
--
-- (Either side saying "can't find you" also posts a chat
-- message, which uses the existing chat notifications.)
--
-- Run once in the Supabase SQL editor, after
-- 20261010_issue_actions.sql.
-- ============================================================

BEGIN;

ALTER TABLE public.blood_request_trips
ADD COLUMN IF NOT EXISTS arrival_disputed_at timestamp with time zone NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';
