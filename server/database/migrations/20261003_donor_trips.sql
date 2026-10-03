-- ============================================================
-- HEMO-HERO
-- DONOR TRIP (LIVE "ON THE WAY" MAP)
-- ============================================================
--
-- An accepted donor can share their location while travelling
-- to the donation facility. The requester sees them on a map
-- with the distance and an ETA, and is notified when the donor
-- is almost there and when they arrive.
--
-- Privacy:
--   - one row per conversation, holding ONLY the latest point
--     (no location history is kept)
--   - the point is cleared when the trip ends
--   - only the request owner and that donor can read it, through
--     the Express backend (RLS on, no client policies)
--
-- Also adds the notification types for the trip.
--
-- Run once in the Supabase SQL editor, after
-- 20261002_no_show_response_status.sql.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blood_request_trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id uuid NOT NULL,
    response_id uuid NOT NULL,
    donor_id uuid NOT NULL,

    -- 'on_the_way' -> 'arrived' -> 'ended'
    status text NOT NULL DEFAULT 'on_the_way',

    -- Latest position only (NULL once the trip ends).
    latitude double precision NULL,
    longitude double precision NULL,
    accuracy_m real NULL,
    heading real NULL,

    -- Road route to the facility from the routing service, or an
    -- estimate when it is unavailable. route_geometry is a short
    -- list of [latitude, longitude] points for drawing the line.
    distance_m integer NULL,
    eta_seconds integer NULL,
    start_distance_m integer NULL,
    route_geometry jsonb NULL,
    route_updated_at timestamp with time zone NULL,

    started_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    location_updated_at timestamp with time zone NULL,

    -- Each alert is sent once per trip.
    near_notified_at timestamp with time zone NULL,
    arrived_at timestamp with time zone NULL,

    ended_at timestamp with time zone NULL,

    created_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    updated_at timestamp with time zone
        NOT NULL
        DEFAULT now(),

    -- --------------------------------------------------------
    -- VALUE CHECKS
    -- --------------------------------------------------------

    CONSTRAINT blood_request_trips_status_check
        CHECK (
            status IN (
                'on_the_way',
                'arrived',
                'ended'
            )
        ),

    CONSTRAINT blood_request_trips_latitude_check
        CHECK (
            latitude IS NULL
            OR latitude BETWEEN -90 AND 90
        ),

    CONSTRAINT blood_request_trips_longitude_check
        CHECK (
            longitude IS NULL
            OR longitude BETWEEN -180 AND 180
        ),

    -- --------------------------------------------------------
    -- FOREIGN KEYS
    -- --------------------------------------------------------

    CONSTRAINT blood_request_trips_request_id_fkey
        FOREIGN KEY (request_id)
        REFERENCES public.blood_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT blood_request_trips_response_id_fkey
        FOREIGN KEY (response_id)
        REFERENCES public.blood_request_responses(id)
        ON DELETE CASCADE,

    CONSTRAINT blood_request_trips_donor_id_fkey
        FOREIGN KEY (donor_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

-- One trip row per conversation; starting again reuses it.
CREATE UNIQUE INDEX IF NOT EXISTS
blood_request_trips_one_per_response
ON public.blood_request_trips(response_id);

CREATE INDEX IF NOT EXISTS
blood_request_trips_request_id_idx
ON public.blood_request_trips(request_id);

-- ============================================================
-- 2. ROW LEVEL SECURITY
--
-- Clients must NOT read locations directly. Trips are read and
-- written only through the Express backend (service role) after
-- the participant check.
-- ============================================================

ALTER TABLE public.blood_request_trips
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. NOTIFICATION TYPES
--
-- Every existing type is kept. New:
--   coordination_trip_started   requester: donor is on the way
--   coordination_trip_near      requester: donor is almost there
--   coordination_trip_arrived   requester: donor has arrived
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
    'blood_request_removed',

    -- Donor applications
    'donor_application_approved',
    'donor_application_rejected',

    -- Donation coordination
    'coordination_message',
    'coordination_schedule',
    'coordination_no_show',
    'coordination_trip_started',
    'coordination_trip_near',
    'coordination_trip_arrived',

    -- Donations (transaction record)
    'donation_recorded',
    'donation_verified',
    'donation_rejected',
    'donation_disputed',
    'donation_feedback_received',

    -- Admin portal
    'admin_donor_application',
    'admin_user_report',
    'admin_urgent_blood_request',
    'admin_donation_recorded',
    'admin_donation_flagged',
    'admin_request_flagged'
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
