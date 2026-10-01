const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// DONOR TRIP HELPERS
//
// Distance, road route and ETA for the live "on the way" map.
//
// Routes come from OSRM (OpenStreetMap data). The public demo
// server is free and needs no key, which is fine for light use;
// set OSRM_URL to use your own server instead. When routing is
// unavailable, a straight-line estimate is used.
// ============================================================

const OSRM_URL =
  String(
    process.env.OSRM_URL ||
    'https://router.project-osrm.org'
  ).replace(
    /\/+$/,
    ''
  );

// Ask the routing service again at most this often per trip.
const ROUTE_REFRESH_MS =
  30 * 1000;

const ROUTE_TIMEOUT_MS =
  6000;

// Most points kept for drawing the route line, and most turns
// kept for directions.
const ROUTE_POINT_LIMIT =
  300;

const ROUTE_STEP_LIMIT =
  80;

// Farther than this from the route line: ask for a new route
// right away (the donor took another way).
const OFF_ROUTE_M =
  60;

// "Almost there": within 500 m, or about 3 minutes away.
const NEAR_DISTANCE_M =
  500;

const NEAR_ETA_SECONDS =
  180;

// Counts as arrived within 80 m of the facility (more when the
// phone reports a weak GPS fix, up to 150 m).
const ARRIVED_DISTANCE_M =
  80;

const ARRIVED_MAX_DISTANCE_M =
  150;

// No update for 3 minutes: show "location paused".
const STALE_MS =
  3 * 60 * 1000;

// No update for 3 hours: the trip ends by itself.
const EXPIRE_MS =
  3 * 60 * 60 * 1000;

// Used when there is no road route: roads are ~30% longer than
// a straight line, and ~25 km/h average city speed.
const ROAD_FACTOR =
  1.3;

const FALLBACK_SPEED_MPS =
  7;

// ============================================================
// DISTANCE
// ============================================================

function toRadians(
  value
) {
  return (
    value *
    Math.PI
  ) / 180;
}

// Straight-line distance in meters between two
// { latitude, longitude } points.
function distanceMeters(
  from,
  to
) {
  const earthRadius =
    6371000;

  const deltaLat =
    toRadians(
      to.latitude -
        from.latitude
    );

  const deltaLng =
    toRadians(
      to.longitude -
        from.longitude
    );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(
      toRadians(
        from.latitude
      )
    ) *
      Math.cos(
        toRadians(
          to.latitude
        )
      ) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

// ============================================================
// ROUTE
// ============================================================

// OSRM returns [longitude, latitude] pairs; keep at most
// ROUTE_POINT_LIMIT points as [latitude, longitude].
function simplifyRoute(
  coordinates
) {
  if (
    !Array.isArray(
      coordinates
    ) ||
    coordinates.length < 2
  ) {
    return null;
  }

  const step =
    Math.max(
      1,
      Math.ceil(
        coordinates.length /
          ROUTE_POINT_LIMIT
      )
    );

  const points =
    coordinates.filter(
      (
        _point,
        index
      ) =>
        index % step === 0 ||
        index ===
          coordinates.length - 1
    );

  return points.map(
    ([
      longitude,
      latitude,
    ]) => [
      Number(
        latitude.toFixed(5)
      ),
      Number(
        longitude.toFixed(5)
      ),
    ]
  );
}

// Turn-by-turn steps: where each maneuver happens and what it
// is ("turn" + "left" onto "Rizal Avenue").
function simplifySteps(
  steps
) {
  if (
    !Array.isArray(
      steps
    )
  ) {
    return [];
  }

  return steps
    .slice(
      0,
      ROUTE_STEP_LIMIT
    )
    .filter(
      step =>
        Array.isArray(
          step?.maneuver
            ?.location
        )
    )
    .map(step => ({
      latitude:
        Number(
          step.maneuver.location[1].toFixed(5)
        ),

      longitude:
        Number(
          step.maneuver.location[0].toFixed(5)
        ),

      type:
        step.maneuver.type ||
        'turn',

      modifier:
        step.maneuver.modifier ||
        null,

      exit:
        step.maneuver.exit ??
        null,

      name:
        step.name ||
        '',

      distance_m:
        Math.round(
          step.distance ||
          0
        )
    }));
}

// The stored route (blood_request_trips.route_geometry):
// { points: [[lat, lng], ...], steps: [...] }. Older rows hold
// just the points array.
function readRoute(
  stored
) {
  if (
    Array.isArray(
      stored
    )
  ) {
    return {
      points:
        stored,

      steps:
        []
    };
  }

  return {
    points:
      Array.isArray(
        stored?.points
      )
        ? stored.points
        : null,

    steps:
      Array.isArray(
        stored?.steps
      )
        ? stored.steps
        : []
  };
}

// Shortest distance in meters from a point to the route line
// (flat-earth approximation; fine at city scale).
function distanceToRouteMeters(
  position,
  points
) {
  if (
    !Array.isArray(
      points
    ) ||
    points.length < 2
  ) {
    return 0;
  }

  const metersPerLng =
    111320 *
    Math.cos(
      toRadians(
        position.latitude
      )
    );

  const metersPerLat =
    110540;

  const toXY =
    ([
      latitude,
      longitude,
    ]) => [
      (longitude -
        position.longitude) *
        metersPerLng,

      (latitude -
        position.latitude) *
        metersPerLat,
    ];

  let best =
    Infinity;

  for (
    let index = 0;
    index <
    points.length - 1;
    index++
  ) {
    const [
      ax,
      ay,
    ] =
      toXY(
        points[index]
      );

    const [
      bx,
      by,
    ] =
      toXY(
        points[index + 1]
      );

    const dx =
      bx - ax;

    const dy =
      by - ay;

    const lengthSquared =
      dx * dx +
      dy * dy;

    const t =
      lengthSquared
        ? Math.min(
            1,
            Math.max(
              0,
              (-ax * dx -
                ay * dy) /
                lengthSquared
            )
          )
        : 0;

    best =
      Math.min(
        best,
        Math.hypot(
          ax + t * dx,
          ay + t * dy
        )
      );
  }

  return best;
}

// Road route from the donor to the facility, or null when the
// routing service can't be reached.
async function fetchRoute(
  from,
  to
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      ROUTE_TIMEOUT_MS
    );

  try {
    const url =
      `${OSRM_URL}/route/v1/driving/` +
      `${from.longitude},${from.latitude};` +
      `${to.longitude},${to.latitude}` +
      '?overview=full&geometries=geojson&alternatives=false&steps=true';

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,

          headers: {
            'User-Agent':
              'Hemo-Hero/1.0 (blood donation coordination)'
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    const route =
      data?.routes?.[0];

    if (
      data?.code !== 'Ok' ||
      !route
    ) {
      return null;
    }

    return {
      distance_m:
        Math.round(
          route.distance
        ),

      eta_seconds:
        Math.round(
          route.duration
        ),

      geometry:
        simplifyRoute(
          route.geometry
            ?.coordinates
        ),

      steps:
        simplifySteps(
          route.legs?.[0]
            ?.steps
        )
    };
  } catch (error) {
    console.error(
      'TRIP ROUTE ERROR:',
      error.message
    );

    return null;
  } finally {
    clearTimeout(
      timer
    );
  }
}

function estimateRoute(
  from,
  to
) {
  const distance =
    Math.round(
      distanceMeters(
        from,
        to
      ) *
        ROAD_FACTOR
    );

  return {
    distance_m:
      distance,

    eta_seconds:
      Math.round(
        distance /
          FALLBACK_SPEED_MPS
      ),

    geometry:
      null,

    steps:
      []
  };
}

// ============================================================
// END A TRIP
//
// Clears the location. Used when the trip is stopped, the
// donation is recorded, or the donor is marked a no-show.
// Never throws.
// ============================================================

function endedTripFields() {
  const now =
    new Date()
      .toISOString();

  return {
    status:
      'ended',

    latitude:
      null,

    longitude:
      null,

    accuracy_m:
      null,

    heading:
      null,

    route_geometry:
      null,

    ended_at:
      now,

    updated_at:
      now
  };
}

async function endTripForResponse(
  responseId
) {
  try {
    const {
      error
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update(
          endedTripFields()
        )
        .eq(
          'response_id',
          responseId
        )
        .neq(
          'status',
          'ended'
        );

    if (error) {
      console.error(
        'END TRIP ERROR:',
        error
      );
    }
  } catch (error) {
    console.error(
      'END TRIP ERROR:',
      error
    );
  }
}

// "6 min", "1 hr 5 min", "less than a minute"
function formatEta(
  seconds
) {
  const minutes =
    Math.round(
      (Number(seconds) || 0) /
        60
    );

  if (minutes < 1) {
    return 'less than a minute';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const rest =
    minutes % 60;

  return rest
    ? `${hours} hr ${rest} min`
    : `${hours} hr`;
}

module.exports = {
  ROUTE_REFRESH_MS,
  OFF_ROUTE_M,
  NEAR_DISTANCE_M,
  NEAR_ETA_SECONDS,
  ARRIVED_DISTANCE_M,
  ARRIVED_MAX_DISTANCE_M,
  STALE_MS,
  EXPIRE_MS,

  distanceMeters,
  distanceToRouteMeters,
  readRoute,
  fetchRoute,
  estimateRoute,
  endedTripFields,
  endTripForResponse,
  formatEta
};
