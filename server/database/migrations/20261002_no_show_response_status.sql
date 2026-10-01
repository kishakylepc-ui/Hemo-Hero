-- ============================================================
-- HEMO-HERO
-- NO-SHOW RELEASES THE DONOR
-- ============================================================
--
-- When a requester reports that their accepted donor didn't
-- show up, the donor's offer becomes 'no_show': the request goes
-- back to looking for donors, the conversation stays readable,
-- and no donation can be recorded for that offer.
--
-- Also applies this to no-shows that requesters already
-- reported before this change (when no donation was recorded).
--
-- Run once in the Supabase SQL editor, after
-- 20261001_no_show_false_request_reports.sql.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Allow 'no_show' (replace whatever status check exists).
-- ------------------------------------------------------------

DO $$
DECLARE
    constraint_row record;
BEGIN
    FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.blood_request_responses'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.blood_request_responses DROP CONSTRAINT %I',
            constraint_row.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.blood_request_responses
ADD CONSTRAINT blood_request_responses_status_check
CHECK (
    status IN (
        'pending',
        'accepted',
        'rejected',
        'withdrawn',
        'no_show'
    )
);

-- ------------------------------------------------------------
-- Existing requester-reported no-shows.
-- ------------------------------------------------------------

UPDATE public.blood_request_responses AS response
SET status = 'no_show',
    updated_at = now()
FROM public.user_reports AS report
JOIN public.blood_requests AS request
  ON request.id = report.request_id
WHERE report.reason = 'No-show'
  AND report.response_id = response.id
  AND report.reporter_id = request.requester_id
  AND response.status = 'accepted'
  AND NOT EXISTS (
      SELECT 1
      FROM public.blood_donations AS donation
      WHERE donation.response_id = response.id
        AND donation.status <> 'rejected'
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
