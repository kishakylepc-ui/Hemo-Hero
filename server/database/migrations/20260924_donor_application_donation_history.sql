-- ============================================================
-- HEMO-HERO - DONOR APPLICATION DONATION HISTORY
--
-- Adds support for an APPROXIMATE last donation (month + year)
-- alongside the existing EXACT last_donation_date.
--
-- Valid states:
--   First-time donor : has_donated_before = false, all dates NULL
--   Exact date       : last_donation_date set, month/year NULL
--   Approximate      : last_donation_date NULL, month + year set
--   Legacy           : has_donated_before = true, all dates NULL
--                      (older applications that skipped the date)
--
-- Future-date rules depend on "today", so they are enforced by
-- the backend, not by CHECK constraints.
--
-- Non-destructive: existing columns and rows are not modified.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- NEW COLUMNS
-- ------------------------------------------------------------

ALTER TABLE public.donor_applications
  ADD COLUMN IF NOT EXISTS last_donation_month smallint,
  ADD COLUMN IF NOT EXISTS last_donation_year smallint;

COMMENT ON COLUMN public.donor_applications.last_donation_date
  IS 'Exact last donation date. NULL when unknown or approximate.';

COMMENT ON COLUMN public.donor_applications.last_donation_month
  IS 'Approximate last donation month (1-12). Only set with last_donation_year when the exact date is not remembered.';

COMMENT ON COLUMN public.donor_applications.last_donation_year
  IS 'Approximate last donation year. Only set with last_donation_month when the exact date is not remembered.';

-- ------------------------------------------------------------
-- CONSTRAINTS (drop first so this file can be safely rerun)
-- ------------------------------------------------------------

ALTER TABLE public.donor_applications
  DROP CONSTRAINT IF EXISTS donor_application_last_donation_month_check,
  DROP CONSTRAINT IF EXISTS donor_application_last_donation_year_check,
  DROP CONSTRAINT IF EXISTS donor_application_last_donation_pair_check,
  DROP CONSTRAINT IF EXISTS donor_application_last_donation_exclusive_check,
  DROP CONSTRAINT IF EXISTS donor_application_first_time_dates_check;

ALTER TABLE public.donor_applications
  ADD CONSTRAINT donor_application_last_donation_month_check
    CHECK (
      last_donation_month IS NULL
      OR last_donation_month BETWEEN 1 AND 12
    ),

  ADD CONSTRAINT donor_application_last_donation_year_check
    CHECK (
      last_donation_year IS NULL
      OR last_donation_year BETWEEN 1950 AND 2100
    ),

  -- Month and year must be provided together or not at all
  ADD CONSTRAINT donor_application_last_donation_pair_check
    CHECK (
      (last_donation_month IS NULL) = (last_donation_year IS NULL)
    ),

  -- An exact date and an approximate month/year can never coexist
  ADD CONSTRAINT donor_application_last_donation_exclusive_check
    CHECK (
      last_donation_date IS NULL
      OR last_donation_year IS NULL
    ),

  -- First-time donors cannot have any previous donation date
  ADD CONSTRAINT donor_application_first_time_dates_check
    CHECK (
      has_donated_before = true
      OR (
        last_donation_date IS NULL
        AND last_donation_month IS NULL
        AND last_donation_year IS NULL
      )
    );

COMMIT;