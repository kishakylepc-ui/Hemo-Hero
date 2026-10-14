-- ============================================================
-- HEMO-HERO
-- REMOVE UNUSED COLUMNS AND FUNCTION
-- ============================================================
--
-- A database check on 2026-10-14 found leftovers that nothing
-- uses:
--
-- blood_requests: patient_name, hospital, location_lat,
-- location_lng, needed_by
--   From when the table was first made in the Supabase
--   dashboard. Empty in every row, and no code reads or writes
--   them. Requests use facility_name, facility_latitude /
--   facility_longitude and needed_date / needed_time instead.
--
-- haversine_km(numeric, numeric, numeric, numeric)
--   A distance helper for find_nearby_donors, which
--   20261006_lockouts_super_admin_cleanup.sql removed. Nothing
--   calls it; the server works out distances itself.
--
-- No CASCADE: if anything still depended on these, this stops
-- with an error instead of removing it too. Older backups still
-- restore: restore_backup ignores fields a table no longer has.
--
-- Run once in the Supabase SQL editor. It doesn't depend on
-- 20261014_schedule_agreement.sql, so either can run first.
-- ============================================================

BEGIN;

ALTER TABLE public.blood_requests
DROP COLUMN IF EXISTS patient_name;

ALTER TABLE public.blood_requests
DROP COLUMN IF EXISTS hospital;

ALTER TABLE public.blood_requests
DROP COLUMN IF EXISTS location_lat;

ALTER TABLE public.blood_requests
DROP COLUMN IF EXISTS location_lng;

ALTER TABLE public.blood_requests
DROP COLUMN IF EXISTS needed_by;

DROP FUNCTION IF EXISTS public.haversine_km(
    numeric,
    numeric,
    numeric,
    numeric
);

COMMIT;

NOTIFY pgrst, 'reload schema';
