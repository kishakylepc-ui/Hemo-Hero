const {
  supabaseAdmin
} = require('../config/supabase');

const {
  createNotification
} = require('../services/notificationService');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  getCoordinationContext
} = require('./coordinationController');

const {
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
  formatEta
} = require('../services/tripService');

// ============================================================
// DONOR TRIP ("ON THE WAY" MAP)
//
// The accepted donor shares their location while travelling to
// the facility; the requester follows them on a map.
//
// GET  /api/requests/:id/responses/:responseId/trip
// POST /api/requests/:id/responses/:responseId/trip/start
// POST /api/requests/:id/responses/:responseId/trip/location
// POST /api/requests/:id/responses/:responseId/trip/arrive
// POST /api/requests/:id/responses/:responseId/trip/not-here
// POST /api/requests/:id/responses/:responseId/trip/end
//
// Only the request owner and that donor can see the trip; only
// the donor can change it, except that the requester can say an
// "arrived" donor isn't there yet. Only the latest point is
// stored and it is cleared when the trip ends.
// ============================================================

const TRIP_FIELDS =
  'id,request_id,response_id,donor_id,status,latitude,longitude,accuracy_m,heading,distance_m,eta_seconds,start_distance_m,route_geometry,route_updated_at,started_at,location_updated_at,near_notified_at,arrived_at,arrival_disputed_at,ended_at,updated_at';

// Location updates closer together than this are ignored.
const MIN_UPDATE_MS =
  4000;

// After the requester says "not here yet", GPS doesn't mark the
// donor as arrived again on its own for this long (the donor
// can still tap "I've arrived").
const DISPUTE_QUIET_MS =
  5 * 60 * 1000;

// Pressing "can't find you" twice this close together posts one
// chat message.
const NOT_HERE_REPEAT_MS =
  60 * 1000;

// ============================================================
// HELPERS
// ============================================================

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.authUser?.id ||
    req.dbUser?.id ||
    null
  );
}

function parseNumber(
  value,
  min,
  max
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  ) &&
    number >= min &&
    number <= max
    ? number
    : null;
}

function readPosition(
  body
) {
  const latitude =
    parseNumber(
      body?.latitude,
      -90,
      90
    );

  const longitude =
    parseNumber(
      body?.longitude,
      -180,
      180
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    latitude,

    longitude,

    accuracy_m:
      parseNumber(
        body?.accuracy,
        0,
        100000
      ),

    heading:
      parseNumber(
        body?.heading,
        0,
        360
      )
  };
}

function getDestination(
  request
) {
  const latitude =
    Number(
      request.facility_latitude
    );

  const longitude =
    Number(
      request.facility_longitude
    );

  if (
    request.facility_latitude ===
      null ||
    request.facility_longitude ===
      null ||
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    return null;
  }

  return {
    name:
      request.facility_name,

    address:
      request.facility_address ||
      null,

    latitude,

    longitude
  };
}

function timeOf(
  value
) {
  const time =
    Date.parse(
      value ||
      ''
    );

  return Number.isFinite(
    time
  )
    ? time
    : 0;
}

function sendError(
  res,
  status,
  error
) {
  return res
    .status(status)
    .json({
      error
    });
}

// The trips table comes from 20261003_donor_trips.sql.
function isMissingTable(
  error
) {
  return (
    error?.code ===
      '42P01' ||
    error?.code ===
      'PGRST205' ||
    /blood_request_trips/i.test(
      error?.message ||
      ''
    )
  );
}

function tableErrorMessage(
  error
) {
  return isMissingTable(
    error
  )
    ? 'Live trip sharing needs the latest database update (20261003_donor_trips.sql).'
    : 'Unable to load the trip.';
}

// ============================================================
// LOAD EVERYTHING A TRIP CALL NEEDS
//
// Sends the error response itself and returns null when the
// caller has no access.
// ============================================================

async function loadTripContext(
  req,
  res
) {
  const userId =
    getAuthenticatedUserId(
      req
    );

  if (!userId) {
    sendError(
      res,
      401,
      'Unauthorized'
    );

    return null;
  }

  const requestId =
    String(
      req.params.id ||
      ''
    ).trim();

  const responseId =
    String(
      req.params.responseId ||
      ''
    ).trim();

  const context =
    await getCoordinationContext(
      requestId,
      responseId,
      userId
    );

  if (context.error) {
    sendError(
      res,
      context.status ||
        400,
      context.error
    );

    return null;
  }

  const [
    tripResult,
    donationResult
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .select(
          TRIP_FIELDS
        )
        .eq(
          'response_id',
          responseId
        )
        .maybeSingle(),

      supabaseAdmin
        .from(
          'blood_donations'
        )
        .select(
          'id'
        )
        .eq(
          'response_id',
          responseId
        )
        .neq(
          'status',
          'rejected'
        )
        .limit(1)
    ]);

  if (tripResult.error) {
    console.error(
      'LOAD TRIP ERROR:',
      tripResult.error
    );

    sendError(
      res,
      isMissingTable(
        tripResult.error
      )
        ? 503
        : 500,
      tableErrorMessage(
        tripResult.error
      )
    );

    return null;
  }

  if (donationResult.error) {
    console.error(
      'TRIP DONATION CHECK ERROR:',
      donationResult.error
    );
  }

  const donationActive =
    Boolean(
      donationResult.data
        ?.length
    );

  // Trips are only for an accepted donor on an open request who
  // has not donated yet.
  const canTrack =
    context.request.status ===
      'active' &&
    context.response.status ===
      'accepted' &&
    !donationActive;

  let trip =
    tripResult.data ||
    null;

  // Close a trip that no longer applies, or that went silent.
  if (
    trip &&
    trip.status !==
      'ended' &&
    (!canTrack ||
      Date.now() -
        timeOf(
          trip.location_updated_at ||
            trip.started_at
        ) >
        EXPIRE_MS)
  ) {
    const {
      data:
        endedTrip,
      error:
        endError
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update(
          endedTripFields()
        )
        .eq(
          'id',
          trip.id
        )
        .select(
          TRIP_FIELDS
        )
        .single();

    if (endError) {
      console.error(
        'AUTO END TRIP ERROR:',
        endError
      );
    } else {
      trip =
        endedTrip;
    }
  }

  return {
    userId,
    requestId,
    responseId,
    context,
    trip,
    canTrack,
    donationActive,

    destination:
      getDestination(
        context.request
      ),

    isDonor:
      context.viewer_role ===
      'donor'
  };
}

// ============================================================
// RESPONSE SHAPE
// ============================================================

// Turn-by-turn steps only go to the donor (who is driving).
function serializeTrip(
  trip,
  includeSteps
) {
  if (!trip) {
    return null;
  }

  const ended =
    trip.status ===
    'ended';

  const route =
    readRoute(
      trip.route_geometry
    );

  return {
    id:
      trip.id,

    status:
      trip.status,

    latitude:
      ended
        ? null
        : trip.latitude,

    longitude:
      ended
        ? null
        : trip.longitude,

    accuracy_m:
      ended
        ? null
        : trip.accuracy_m,

    heading:
      ended
        ? null
        : trip.heading,

    distance_m:
      trip.distance_m,

    eta_seconds:
      trip.eta_seconds,

    start_distance_m:
      trip.start_distance_m,

    route:
      ended
        ? null
        : route.points,

    steps:
      ended ||
      !includeSteps
        ? null
        : route.steps,

    route_updated_at:
      trip.route_updated_at,

    started_at:
      trip.started_at,

    location_updated_at:
      trip.location_updated_at,

    near_notified_at:
      trip.near_notified_at,

    arrived_at:
      trip.arrived_at,

    // The requester said the donor isn't there yet.
    arrival_disputed_at:
      trip.arrival_disputed_at ||
      null,

    ended_at:
      trip.ended_at,

    // Still "on the way" but the donor's phone stopped
    // sending updates (screen closed, no signal).
    stale:
      trip.status ===
        'on_the_way' &&
      Date.now() -
        timeOf(
          trip.location_updated_at ||
            trip.started_at
        ) >
        STALE_MS
  };
}

function buildPayload(
  tripContext,
  trip
) {
  const {
    context,
    canTrack,
    destination,
    isDonor
  } =
    tripContext;

  return {
    trip:
      serializeTrip(
        trip,
        isDonor
      ),

    destination,

    // For "open in maps" when the facility has no map pin.
    facility_name:
      context.request
        .facility_name,

    facility_address:
      context.request
        .facility_address ||
      null,

    viewer_role:
      context.viewer_role,

    can_track:
      canTrack,

    can_start:
      isDonor &&
      canTrack &&
      Boolean(
        destination
      ),

    donor_name:
      context.donor
        ?.full_name ||
      'Donor',

    requester_name:
      context.requester
        ?.full_name ||
      'Requester',

    donor_photo_url:
      context.donor
        ?.profile_photo_url ||
      null,

    requester_photo_url:
      context.requester
        ?.profile_photo_url ||
      null
  };
}

// Why a trip can't start / continue.
function closedMessage(
  tripContext
) {
  const {
    context,
    donationActive
  } =
    tripContext;

  if (donationActive) {
    return 'This donation is already recorded, so the trip has ended.';
  }

  if (
    context.response.status ===
    'no_show'
  ) {
    return 'You were marked as a no-show for this request.';
  }

  return 'This blood request is closed.';
}

// ============================================================
// NOTIFY THE REQUESTER (never throws)
// ============================================================

async function notifyRequester(
  tripContext,
  trip,
  type,
  title,
  message
) {
  const {
    context,
    requestId,
    responseId
  } =
    tripContext;

  await createNotification({
    userId:
      context.requester_user_id,

    type,

    title,

    message,

    data: {
      request_id:
        requestId,

      response_id:
        responseId,

      trip_id:
        trip.id,

      eta_seconds:
        trip.eta_seconds,

      distance_m:
        trip.distance_m,

      sender_role:
        'donor',

      recipient_role:
        'requester',

      blood_type:
        context.request
          .blood_type,

      facility_name:
        context.request
          .facility_name
    }
  });
}

// ============================================================
// ALMOST THERE / ARRIVED
//
// Each alert is claimed with a conditional update first, so two
// quick updates can't send it twice.
// ============================================================

async function checkTripAlerts(
  tripContext,
  trip,
  straightMeters
) {
  if (
    trip.status !==
    'on_the_way'
  ) {
    return trip;
  }

  const donorName =
    tripContext.context.donor
      ?.full_name ||
    'Your donor';

  const facility =
    tripContext.context.request
      .facility_name;

  const accuracy =
    Number(
      trip.accuracy_m
    ) || 0;

  const arrivedRadius =
    Math.max(
      ARRIVED_DISTANCE_M,
      Math.min(
        accuracy,
        ARRIVED_MAX_DISTANCE_M
      )
    );

  const now =
    new Date()
      .toISOString();

  // ----------------------------------------------------------
  // ARRIVED
  //
  // Not on its own right after the requester said the donor
  // isn't there yet.
  // ----------------------------------------------------------

  const recentlyDisputed =
    Date.now() -
      timeOf(
        trip.arrival_disputed_at
      ) <
    DISPUTE_QUIET_MS;

  if (
    straightMeters <=
      arrivedRadius &&
    !recentlyDisputed
  ) {
    const {
      data:
        arrivedRows,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update({
          status:
            'arrived',

          arrived_at:
            now,

          near_notified_at:
            trip.near_notified_at ||
            now,

          distance_m:
            Math.round(
              straightMeters
            ),

          eta_seconds:
            0,

          updated_at:
            now
        })
        .eq(
          'id',
          trip.id
        )
        .eq(
          'status',
          'on_the_way'
        )
        .select(
          TRIP_FIELDS
        );

    if (error) {
      console.error(
        'TRIP ARRIVED ERROR:',
        error
      );

      return trip;
    }

    const arrivedTrip =
      arrivedRows?.[0];

    if (!arrivedTrip) {
      return trip;
    }

    await notifyRequester(
      tripContext,
      arrivedTrip,
      'coordination_trip_arrived',
      'Donor Has Arrived',
      `${donorName} has arrived at ${facility}.`
    );

    return arrivedTrip;
  }

  // ----------------------------------------------------------
  // ALMOST THERE
  // ----------------------------------------------------------

  const near =
    straightMeters <=
      NEAR_DISTANCE_M ||
    (trip.eta_seconds !==
      null &&
      trip.eta_seconds <=
        NEAR_ETA_SECONDS);

  if (
    !near ||
    trip.near_notified_at
  ) {
    return trip;
  }

  const {
    data:
      nearRows,
    error
  } =
    await supabaseAdmin
      .from(
        'blood_request_trips'
      )
      .update({
        near_notified_at:
          now,

        updated_at:
          now
      })
      .eq(
        'id',
        trip.id
      )
      .is(
        'near_notified_at',
        null
      )
      .select(
        TRIP_FIELDS
      );

  if (error) {
    console.error(
      'TRIP NEAR ERROR:',
      error
    );

    return trip;
  }

  const nearTrip =
    nearRows?.[0];

  if (!nearTrip) {
    return trip;
  }

  await notifyRequester(
    tripContext,
    nearTrip,
    'coordination_trip_near',
    'Donor Almost There',
    `${donorName} is almost at ${facility}, about ${formatEta(
      nearTrip.eta_seconds
    )} away.`
  );

  return nearTrip;
}

// ============================================================
// ROUTE FOR A NEW POSITION
//
// Asks the routing service when the last route is old; in
// between, scales the last road distance by how much closer
// the donor got in a straight line.
// ============================================================

async function routeFor(
  trip,
  position,
  destination
) {
  const straightMeters =
    distanceMeters(
      position,
      destination
    );

  // The donor left the route line: get a new one now.
  const offRoute =
    trip &&
    distanceToRouteMeters(
      position,
      readRoute(
        trip.route_geometry
      ).points
    ) >
      OFF_ROUTE_M;

  const routeFresh =
    !offRoute &&
    trip &&
    trip.route_updated_at &&
    Date.now() -
      timeOf(
        trip.route_updated_at
      ) <
      ROUTE_REFRESH_MS &&
    trip.latitude !==
      null &&
    trip.distance_m !==
      null;

  if (routeFresh) {
    const previousStraight =
      distanceMeters(
        {
          latitude:
            trip.latitude,

          longitude:
            trip.longitude
        },
        destination
      );

    const ratio =
      previousStraight > 0
        ? straightMeters /
          previousStraight
        : 1;

    return {
      straightMeters,

      fields: {
        distance_m:
          Math.max(
            0,
            Math.round(
              trip.distance_m *
                ratio
            )
          ),

        eta_seconds:
          trip.eta_seconds ===
          null
            ? null
            : Math.max(
                0,
                Math.round(
                  trip.eta_seconds *
                    ratio
                )
              )
      }
    };
  }

  const route =
    (await fetchRoute(
      position,
      destination
    )) ||
    estimateRoute(
      position,
      destination
    );

  return {
    straightMeters,

    fields: {
      distance_m:
        route.distance_m,

      eta_seconds:
        route.eta_seconds,

      // { points, steps }. Keep the last route if this time only
      // an estimate was available.
      route_geometry:
        route.geometry
          ? {
              points:
                route.geometry,

              steps:
                route.steps ||
                []
            }
          : trip?.route_geometry ||
            null,

      route_updated_at:
        new Date()
          .toISOString()
    }
  };
}

// ============================================================
// GET TRIP
// ============================================================

async function getTrip(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          tripContext.trip
        )
      );
  } catch (error) {
    console.error(
      'GET TRIP ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to load the trip.'
    );
  }
}

// ============================================================
// START TRIP (donor)
// ============================================================

async function startTrip(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    const {
      trip,
      destination,
      context
    } =
      tripContext;

    if (!tripContext.isDonor) {
      return sendError(
        res,
        403,
        'Only the donor can share their trip.'
      );
    }

    if (!tripContext.canTrack) {
      return sendError(
        res,
        409,
        closedMessage(
          tripContext
        )
      );
    }

    if (!destination) {
      return sendError(
        res,
        409,
        'This facility has no map location yet. Use Navigate to get directions.'
      );
    }

    const position =
      readPosition(
        req.body
      );

    if (!position) {
      return sendError(
        res,
        400,
        'Your current location is required to start the trip.'
      );
    }

    const {
      straightMeters,
      fields
    } =
      await routeFor(
        null,
        position,
        destination
      );

    const now =
      new Date()
        .toISOString();

    const values = {
      status:
        'on_the_way',

      ...position,

      ...fields,

      start_distance_m:
        fields.distance_m,

      started_at:
        now,

      location_updated_at:
        now,

      near_notified_at:
        null,

      arrived_at:
        null,

      ended_at:
        null,

      updated_at:
        now
    };

    // Already on the way (e.g. the app restarted): continue the
    // same trip without telling the requester again.
    const continuing =
      trip?.status ===
      'on_the_way';

    const result =
      trip
        ? await supabaseAdmin
            .from(
              'blood_request_trips'
            )
            .update(
              continuing
                ? {
                    ...position,
                    ...fields,
                    location_updated_at:
                      now,
                    updated_at:
                      now
                  }
                : values
            )
            .eq(
              'id',
              trip.id
            )
            .select(
              TRIP_FIELDS
            )
            .single()
        : await supabaseAdmin
            .from(
              'blood_request_trips'
            )
            .insert({
              request_id:
                tripContext.requestId,

              response_id:
                tripContext.responseId,

              donor_id:
                tripContext.userId,

              ...values
            })
            .select(
              TRIP_FIELDS
            )
            .single();

    if (result.error) {
      console.error(
        'START TRIP ERROR:',
        result.error
      );

      return sendError(
        res,
        isMissingTable(
          result.error
        )
          ? 503
          : 500,
        isMissingTable(
          result.error
        )
          ? tableErrorMessage(
              result.error
            )
          : 'Unable to start the trip.'
      );
    }

    let savedTrip =
      result.data;

    setActivityEntity(
      res,
      'donor_trip',
      savedTrip.id
    );

    if (!continuing) {
      await notifyRequester(
        tripContext,
        savedTrip,
        'coordination_trip_started',
        'Donor On the Way',
        `${context.donor?.full_name || 'Your donor'} is on the way to ${context.request.facility_name}, about ${formatEta(
          savedTrip.eta_seconds
        )} away. Open the chat to follow them on the map.`
      );
    }

    savedTrip =
      await checkTripAlerts(
        tripContext,
        savedTrip,
        straightMeters
      );

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          savedTrip
        )
      );
  } catch (error) {
    console.error(
      'START TRIP ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to start the trip.'
    );
  }
}

// ============================================================
// LOCATION UPDATE (donor, every ~10 seconds while travelling)
// ============================================================

async function updateTripLocation(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    const {
      trip,
      destination
    } =
      tripContext;

    if (!tripContext.isDonor) {
      return sendError(
        res,
        403,
        'Only the donor can share their trip.'
      );
    }

    if (!tripContext.canTrack) {
      return sendError(
        res,
        409,
        closedMessage(
          tripContext
        )
      );
    }

    // Arrived: nothing more to send.
    if (
      trip?.status ===
      'arrived'
    ) {
      return res
        .status(200)
        .json(
          buildPayload(
            tripContext,
            trip
          )
        );
    }

    if (
      !trip ||
      trip.status !==
        'on_the_way' ||
      !destination
    ) {
      return sendError(
        res,
        409,
        'Start the trip first.'
      );
    }

    const position =
      readPosition(
        req.body
      );

    if (!position) {
      return sendError(
        res,
        400,
        'A valid location is required.'
      );
    }

    if (
      Date.now() -
        timeOf(
          trip.location_updated_at
        ) <
      MIN_UPDATE_MS
    ) {
      return res
        .status(200)
        .json(
          buildPayload(
            tripContext,
            trip
          )
        );
    }

    const {
      straightMeters,
      fields
    } =
      await routeFor(
        trip,
        position,
        destination
      );

    const now =
      new Date()
        .toISOString();

    const {
      data:
        updatedTrip,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update({
          ...position,

          ...fields,

          location_updated_at:
            now,

          updated_at:
            now
        })
        .eq(
          'id',
          trip.id
        )
        .select(
          TRIP_FIELDS
        )
        .single();

    if (error) {
      console.error(
        'UPDATE TRIP LOCATION ERROR:',
        error
      );

      return sendError(
        res,
        500,
        'Unable to update your location.'
      );
    }

    const checkedTrip =
      await checkTripAlerts(
        tripContext,
        updatedTrip,
        straightMeters
      );

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          checkedTrip
        )
      );
  } catch (error) {
    console.error(
      'UPDATE TRIP LOCATION ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to update your location.'
    );
  }
}

// ============================================================
// I'VE ARRIVED (donor, when GPS hasn't caught up)
// ============================================================

async function arriveTrip(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    const {
      trip,
      context
    } =
      tripContext;

    if (!tripContext.isDonor) {
      return sendError(
        res,
        403,
        'Only the donor can update their trip.'
      );
    }

    if (!tripContext.canTrack) {
      return sendError(
        res,
        409,
        closedMessage(
          tripContext
        )
      );
    }

    if (
      !trip ||
      trip.status !==
        'on_the_way'
    ) {
      return sendError(
        res,
        409,
        trip?.status ===
          'arrived'
          ? 'You are already marked as arrived.'
          : 'Start the trip first.'
      );
    }

    setActivityEntity(
      res,
      'donor_trip',
      trip.id
    );

    const now =
      new Date()
        .toISOString();

    const {
      data:
        arrivedRows,
      error
    } =
      await supabaseAdmin
        .from(
          'blood_request_trips'
        )
        .update({
          status:
            'arrived',

          arrived_at:
            now,

          // The donor says they're here (again).
          arrival_disputed_at:
            null,

          near_notified_at:
            trip.near_notified_at ||
            now,

          eta_seconds:
            0,

          updated_at:
            now
        })
        .eq(
          'id',
          trip.id
        )
        .eq(
          'status',
          'on_the_way'
        )
        .select(
          TRIP_FIELDS
        );

    if (error) {
      console.error(
        'ARRIVE TRIP ERROR:',
        error
      );

      return sendError(
        res,
        500,
        'Unable to update your trip.'
      );
    }

    const arrivedTrip =
      arrivedRows?.[0] ||
      trip;

    if (arrivedRows?.[0]) {
      await notifyRequester(
        tripContext,
        arrivedTrip,
        'coordination_trip_arrived',
        'Donor Has Arrived',
        `${context.donor?.full_name || 'Your donor'} has arrived at ${context.request.facility_name}.`
      );
    }

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          arrivedTrip
        )
      );
  } catch (error) {
    console.error(
      'ARRIVE TRIP ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to update your trip.'
    );
  }
}

// ============================================================
// CAN'T FIND YOU (either side, once the donor is "arrived")
//
// POST /api/requests/:id/responses/:responseId/trip/not-here
//
// Requester: the donor says they've arrived but isn't there.
//   The trip goes back to "on the way" so the live location
//   shows again, and GPS won't mark them arrived on its own
//   for a few minutes.
// Donor: they're at the place but can't find the requester.
//   The trip stays "arrived".
//
// Either way a chat message is posted from the person who
// pressed it, and the other person gets a notification.
// ============================================================

async function reportNotHere(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    const {
      trip,
      context,
      requestId,
      responseId,
      isDonor,
      userId
    } =
      tripContext;

    if (!tripContext.canTrack) {
      return sendError(
        res,
        409,
        closedMessage(
          tripContext
        )
      );
    }

    if (
      !trip ||
      trip.status !==
        'arrived'
    ) {
      return sendError(
        res,
        409,
        isDonor
          ? 'Tap “I’ve arrived” first.'
          : 'The donor isn’t marked as arrived.'
      );
    }

    setActivityEntity(
      res,
      'donor_trip',
      trip.id
    );

    const facility =
      context.request
        .facility_name;

    const senderName =
      isDonor
        ? context.donor
            ?.full_name ||
          'Your donor'
        : context.requester
            ?.full_name ||
          'The requester';

    const recipientId =
      isDonor
        ? context.requester_user_id
        : context.donor_user_id;

    const text =
      isDonor
        ? `I'm here at ${facility}, but I can't find you. Where are you?`
        : `I'm at ${facility}, but I can't see you yet. Where are you?`;

    const now =
      new Date()
        .toISOString();

    // --------------------------------------------------------
    // REQUESTER: BACK TO "ON THE WAY"
    // --------------------------------------------------------

    let currentTrip =
      trip;

    if (!isDonor) {
      const {
        data:
          updatedRows,
        error:
          updateError
      } =
        await supabaseAdmin
          .from(
            'blood_request_trips'
          )
          .update({
            status:
              'on_the_way',

            arrived_at:
              null,

            arrival_disputed_at:
              now,

            updated_at:
              now
          })
          .eq(
            'id',
            trip.id
          )
          .eq(
            'status',
            'arrived'
          )
          .select(
            TRIP_FIELDS
          );

      if (updateError) {
        console.error(
          'TRIP NOT HERE UPDATE ERROR:',
          updateError
        );

        return sendError(
          res,
          500,
          'Unable to update the trip.'
        );
      }

      currentTrip =
        updatedRows?.[0] ||
        trip;
    }

    // --------------------------------------------------------
    // CHAT MESSAGE (once per minute)
    // --------------------------------------------------------

    const {
      data:
        lastRows,
      error:
        lastError
    } =
      await supabaseAdmin
        .from(
          'blood_request_coordination_messages'
        )
        .select(
          'id, message, created_at'
        )
        .eq(
          'response_id',
          responseId
        )
        .eq(
          'sender_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(1);

    if (lastError) {
      console.error(
        'TRIP NOT HERE LAST MESSAGE ERROR:',
        lastError
      );
    }

    const last =
      lastRows?.[0];

    const repeated =
      last &&
      last.message ===
        text &&
      Date.now() -
        timeOf(
          last.created_at
        ) <
        NOT_HERE_REPEAT_MS;

    if (!repeated) {
      const {
        data:
          createdMessage,
        error:
          messageError
      } =
        await supabaseAdmin
          .from(
            'blood_request_coordination_messages'
          )
          .insert({
            request_id:
              requestId,

            response_id:
              responseId,

            sender_id:
              userId,

            message:
              text
          })
          .select(
            'id'
          )
          .single();

      if (messageError) {
        console.error(
          'TRIP NOT HERE MESSAGE ERROR:',
          messageError
        );
      }

      if (recipientId) {
        await createNotification({
          userId:
            recipientId,

          type:
            'coordination_message',

          title:
            `${senderName} Can't Find You`,

          message:
            text,

          data: {
            request_id:
              requestId,

            response_id:
              responseId,

            message_id:
              createdMessage?.id ||
              null,

            trip_id:
              trip.id,

            sender_id:
              userId,

            sender_role:
              isDonor
                ? 'donor'
                : 'requester',

            recipient_role:
              isDonor
                ? 'requester'
                : 'donor',

            blood_type:
              context.request
                .blood_type,

            facility_name:
              facility
          }
        });
      }
    }

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          currentTrip
        )
      );
  } catch (error) {
    console.error(
      'TRIP NOT HERE ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to update the trip.'
    );
  }
}

// ============================================================
// STOP SHARING (donor)
// ============================================================

async function endTrip(
  req,
  res
) {
  try {
    const tripContext =
      await loadTripContext(
        req,
        res
      );

    if (!tripContext) {
      return;
    }

    const {
      trip
    } =
      tripContext;

    if (!tripContext.isDonor) {
      return sendError(
        res,
        403,
        'Only the donor can stop sharing their trip.'
      );
    }

    if (
      !trip ||
      trip.status ===
        'ended'
    ) {
      return res
        .status(200)
        .json(
          buildPayload(
            tripContext,
            trip
          )
        );
    }

    setActivityEntity(
      res,
      'donor_trip',
      trip.id
    );

    const {
      data:
        endedTrip,
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
          'id',
          trip.id
        )
        .select(
          TRIP_FIELDS
        )
        .single();

    if (error) {
      console.error(
        'END TRIP ERROR:',
        error
      );

      return sendError(
        res,
        500,
        'Unable to stop sharing your location.'
      );
    }

    return res
      .status(200)
      .json(
        buildPayload(
          tripContext,
          endedTrip
        )
      );
  } catch (error) {
    console.error(
      'END TRIP ERROR:',
      error
    );

    return sendError(
      res,
      500,
      'Unable to stop sharing your location.'
    );
  }
}

module.exports = {
  getTrip,
  startTrip,
  updateTripLocation,
  arriveTrip,
  reportNotHere,
  endTrip
};
