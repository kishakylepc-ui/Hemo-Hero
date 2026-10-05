-- ============================================================
-- HEMO-HERO
-- NOTIFICATION SETTINGS, DATA BACKUPS
-- ============================================================
--
-- 1. notification_preferences: which phone alerts a user wants.
--    The Notifications inbox still keeps every notification.
-- 2. data_backups: the list of database backups. The backup
--    files themselves are in the private "backups" storage
--    bucket (the server creates it).
-- 3. restore_backup(): puts a backup back in one transaction,
--    so a failed restore changes nothing. Only the server
--    (service role) can run it.
--
-- Run once in the Supabase SQL editor, after
-- 20261006_lockouts_super_admin_cleanup.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. NOTIFICATION SETTINGS
--
-- One row per user, created the first time they change a
-- setting. No row means everything is on.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id uuid PRIMARY KEY
        REFERENCES public.users(id) ON DELETE CASCADE,

    -- Every phone alert on or off.
    push_enabled boolean NOT NULL DEFAULT true,

    -- A requester asks you to donate.
    donation_requests boolean NOT NULL DEFAULT true,

    -- Offers, accepted / declined offers, closed requests.
    request_updates boolean NOT NULL DEFAULT true,

    -- Chat messages, meet-up times, live trips.
    messages boolean NOT NULL DEFAULT true,

    -- Donation records and feedback.
    donations boolean NOT NULL DEFAULT true,

    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. DATA BACKUPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Path of the JSON file in the "backups" bucket.
    file_path text NOT NULL UNIQUE,

    -- manual: made by the super admin
    -- automatic: the daily backup
    -- before_restore: made just before a restore, to undo it
    kind text NOT NULL DEFAULT 'manual'
        CHECK (kind IN ('manual', 'automatic', 'before_restore')),

    size_bytes bigint NOT NULL DEFAULT 0
        CHECK (size_bytes >= 0),

    -- Rows saved per table, e.g. {"users": 5, ...}
    table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,

    total_rows integer NOT NULL DEFAULT 0
        CHECK (total_rows >= 0),

    created_by uuid NULL
        REFERENCES public.users(id) ON DELETE SET NULL,

    created_at timestamp with time zone NOT NULL DEFAULT now(),

    -- Last time this backup was restored.
    restored_at timestamp with time zone NULL,

    restored_by uuid NULL
        REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS data_backups_created_at_idx
ON public.data_backups (created_at DESC);

ALTER TABLE public.data_backups
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RESTORE
--
-- backup is the JSON file the server saved:
--   { "app": "hemo-hero", "tables": { "users": [...], ... } }
--
-- - users: saved details come back; accounts made after the
--   backup are kept (their sign-in accounts still exist).
-- - activity_logs: entries missing now are added back; the log
--   trail is never deleted.
-- - every other table below: replaced by the backup's rows.
-- - push_tokens, login_lockouts and data_backups are left as
--   they are.
--
-- Runs as one transaction: any error undoes the whole restore.
-- ============================================================

CREATE OR REPLACE FUNCTION public.restore_backup(
    backup jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    -- Parents before children.
    restore_tables text[] := ARRAY[
        'facility_locations',
        'donor_applications',
        'notification_preferences',
        'blood_requests',
        'blood_request_responses',
        'blood_request_invitations',
        'blood_request_coordination_schedules',
        'blood_request_coordination_messages',
        'blood_request_trips',
        'blood_donations',
        'donation_feedback',
        'user_reports',
        'notifications'
    ];

    target_table text;
    user_updates text;
    affected bigint;
    restored jsonb := '{}'::jsonb;
BEGIN
    IF backup IS NULL
       OR backup->>'app' IS DISTINCT FROM 'hemo-hero'
       OR jsonb_typeof(backup->'tables') IS DISTINCT FROM 'object'
    THEN
        RAISE EXCEPTION 'This is not a Hemo-Hero backup.';
    END IF;

    -- Current rows out, children first.
    FOR i IN REVERSE array_length(restore_tables, 1)..1 LOOP
        EXECUTE format(
            'DELETE FROM public.%I WHERE true',
            restore_tables[i]
        );
    END LOOP;

    -- Users: insert or update.
    SELECT string_agg(
        format('%I = EXCLUDED.%I', c.column_name, c.column_name),
        ', '
    )
    INTO user_updates
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'users'
      AND c.column_name <> 'id';

    EXECUTE format(
        'INSERT INTO public.users
         SELECT * FROM jsonb_populate_recordset(NULL::public.users, $1)
         ON CONFLICT (id) DO UPDATE SET %s',
        user_updates
    )
    USING COALESCE(backup->'tables'->'users', '[]'::jsonb);

    GET DIAGNOSTICS affected = ROW_COUNT;
    restored := restored || jsonb_build_object('users', affected);

    -- Everything else, parents first.
    FOREACH target_table IN ARRAY restore_tables LOOP
        EXECUTE format(
            'INSERT INTO public.%I
             SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)',
            target_table,
            target_table
        )
        USING COALESCE(backup->'tables'->target_table, '[]'::jsonb);

        GET DIAGNOSTICS affected = ROW_COUNT;
        restored := restored || jsonb_build_object(target_table, affected);
    END LOOP;

    -- Log trail: add back missing entries only.
    INSERT INTO public.activity_logs
    SELECT *
    FROM jsonb_populate_recordset(
        NULL::public.activity_logs,
        COALESCE(backup->'tables'->'activity_logs', '[]'::jsonb)
    )
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS affected = ROW_COUNT;
    restored := restored || jsonb_build_object('activity_logs', affected);

    RETURN restored;
END;
$$;

-- Only the server may run it (Supabase lets signed-in app users
-- call new functions unless this is revoked).
REVOKE ALL ON FUNCTION public.restore_backup(jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.restore_backup(jsonb)
TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
