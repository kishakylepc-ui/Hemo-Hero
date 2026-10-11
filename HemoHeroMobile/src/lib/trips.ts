import type { MaterialIcons } from '@expo/vector-icons';

import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';

// ============================================================
// DONOR TRIP ("ON THE WAY" MAP)
//
// The accepted donor shares their location while travelling to
// the facility; the requester follows them on a map. Only the
// latest point is kept, and it is cleared when the trip ends.
// ============================================================

export type TripStatus =
  | 'on_the_way'
  | 'arrived'
  | 'ended';

// One turn of the road route (from OpenStreetMap routing).
export type TripStep = {
  latitude: number;
  longitude: number;
  // 'depart', 'turn', 'new name', 'fork', 'roundabout', 'arrive'...
  type: string;
  // 'left', 'slight right', 'straight', 'uturn'...
  modifier: string | null;
  // Roundabout exit number.
  exit: number | null;
  // Street name after the turn ('' when unnamed).
  name: string;
  distance_m: number;
};

export type DonorTrip = {
  id: string;
  status: TripStatus;

  // Latest position (null once the trip ends).
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  heading: number | null;

  // Road distance / time left, and at the start (for progress).
  distance_m: number | null;
  eta_seconds: number | null;
  start_distance_m: number | null;

  // [latitude, longitude] points of the road route.
  route: [number, number][] | null;

  // Turn-by-turn steps (donor only).
  steps?: TripStep[] | null;

  route_updated_at?: string | null;

  started_at: string;
  location_updated_at: string | null;
  near_notified_at: string | null;
  arrived_at: string | null;
  // The requester said the donor isn't there yet.
  arrival_disputed_at?: string | null;
  ended_at: string | null;

  // On the way, but no update for a few minutes.
  stale: boolean;
};

export type TripDestination = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

export type TripPayload = {
  trip: DonorTrip | null;
  // Null when the facility has no map location.
  destination: TripDestination | null;
  viewer_role: 'requester' | 'donor';
  // Accepted donor, open request, nothing donated yet.
  can_track: boolean;
  can_start: boolean;
  donor_name: string;
  requester_name: string;
  donor_photo_url?: string | null;
  requester_photo_url?: string | null;
  // For "open in maps" when the facility has no map pin.
  facility_name?: string;
  facility_address?: string | null;
};

export type TripPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
};

// ============================================================
// RESPONSE HELPER
// ============================================================

async function parseResponse(
  response: Response
): Promise<TripPayload> {
  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

function tripUrl(
  requestId: string,
  responseId: string,
  action = ''
) {
  return `${API_URL}/api/requests/${requestId}/responses/${responseId}/trip${
    action ? `/${action}` : ''
  }`;
}

async function postTrip(
  token: string,
  requestId: string,
  responseId: string,
  action: 'start' | 'location' | 'arrive' | 'not-here' | 'end',
  position?: TripPosition
) {
  const response = await authorizedFetch(
    tripUrl(requestId, responseId, action),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        position
          ? {
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy ?? null,
              heading: position.heading ?? null,
            }
          : {}
      ),
    }
  );

  return parseResponse(response);
}

// ============================================================
// API
// ============================================================

export async function getTrip(
  token: string,
  requestId: string,
  responseId: string
) {
  const response = await authorizedFetch(
    tripUrl(requestId, responseId),
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return parseResponse(response);
}

export function startTrip(
  token: string,
  requestId: string,
  responseId: string,
  position: TripPosition
) {
  return postTrip(token, requestId, responseId, 'start', position);
}

export function sendTripLocation(
  token: string,
  requestId: string,
  responseId: string,
  position: TripPosition
) {
  return postTrip(token, requestId, responseId, 'location', position);
}

export function markTripArrived(
  token: string,
  requestId: string,
  responseId: string
) {
  return postTrip(token, requestId, responseId, 'arrive');
}

// Once the donor is "arrived", either side says they can't find
// the other (requester: the donor isn't actually there, so the
// trip goes back to "on the way"). Also posts a chat message.
export function reportNotHere(
  token: string,
  requestId: string,
  responseId: string
) {
  return postTrip(token, requestId, responseId, 'not-here');
}

export function endTrip(
  token: string,
  requestId: string,
  responseId: string
) {
  return postTrip(token, requestId, responseId, 'end');
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

// "6 min", "1 hr 5 min", "< 1 min"
export function formatEta(
  seconds?: number | null
) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return '';
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 1) {
    return '< 1 min';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// "850 m", "2.3 km"
export function formatDistance(
  meters?: number | null
) {
  if (
    meters === null ||
    meters === undefined
  ) {
    return '';
  }

  if (meters < 1000) {
    return `${Math.max(0, Math.round(meters / 10) * 10)} m`;
  }

  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

// Google Maps turn-by-turn directions to the facility.
export function navigationUrl(
  destination: Pick<TripDestination, 'latitude' | 'longitude'>
) {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
}

// Google Maps search for a facility without a map pin.
export function placeSearchUrl(
  name: string,
  address?: string | null
) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [name, address].filter(Boolean).join(', ')
  )}`;
}

// ============================================================
// IN-APP DIRECTIONS
//
// Works out the donor's next turn from the road route the
// server sent: where the donor is along the route line, and the
// first turn still ahead of them.
// ============================================================

type IconName =
  keyof typeof MaterialIcons.glyphMap;

export type TripGuidance = {
  icon: IconName;
  text: string;
  // Road distance to the turn (null for "off route").
  distance_m: number | null;
  offRoute: boolean;
};

// Farther than this from the line counts as off route (the
// server sends a new route on the next update).
const OFF_ROUTE_M = 60;

// A turn this close behind the donor counts as done.
const PASSED_M = 8;

// Where a point sits along the route line: meters from the start
// (along) and meters away from the line (offset). Flat-earth
// math, fine at city scale.
function projectOnRoute(
  points: [number, number][],
  latitude: number,
  longitude: number
) {
  const metersPerLng =
    111320 * Math.cos((latitude * Math.PI) / 180);

  const metersPerLat = 110540;

  const toXY = ([lat, lng]: [number, number]) => [
    (lng - longitude) * metersPerLng,
    (lat - latitude) * metersPerLat,
  ];

  let along = 0;
  let offset = Infinity;
  let travelled = 0;

  for (let index = 0; index < points.length - 1; index++) {
    const [ax, ay] = toXY(points[index]);
    const [bx, by] = toXY(points[index + 1]);

    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);

    const t = length
      ? Math.min(1, Math.max(0, (-ax * dx - ay * dy) / (length * length)))
      : 0;

    const distance = Math.hypot(ax + t * dx, ay + t * dy);

    if (distance < offset) {
      offset = distance;
      along = travelled + t * length;
    }

    travelled += length;
  }

  return { along, offset };
}

function turnIcon(
  modifier: string | null
): IconName {
  switch (modifier) {
    case 'sharp left':
      return 'turn-sharp-left';
    case 'left':
      return 'turn-left';
    case 'slight left':
      return 'turn-slight-left';
    case 'sharp right':
      return 'turn-sharp-right';
    case 'right':
      return 'turn-right';
    case 'slight right':
      return 'turn-slight-right';
    case 'uturn':
      return 'u-turn-left';
    default:
      return 'straight';
  }
}

// "Turn left onto Rizal Avenue", "Keep right at the fork"...
export function describeStep(
  step: TripStep,
  destinationName: string
): { icon: IconName; text: string } {
  const modifier = step.modifier || '';
  const onto = step.name ? ` onto ${step.name}` : '';

  const side = modifier.includes('left')
    ? 'left'
    : modifier.includes('right')
      ? 'right'
      : '';

  switch (step.type) {
    case 'arrive':
      return {
        icon: 'flag',
        text: `Arrive at ${destinationName}`,
      };

    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
    case 'exit roundabout':
    case 'exit rotary':
      return {
        icon: side === 'left' ? 'roundabout-left' : 'roundabout-right',
        text: step.exit
          ? `At the roundabout, take exit ${step.exit}${onto}`
          : `Go through the roundabout${onto}`,
      };

    case 'fork':
      return {
        icon: side === 'left' ? 'fork-left' : 'fork-right',
        text: `Keep ${side || 'straight'} at the fork${onto}`,
      };

    case 'merge':
      return {
        icon: 'merge',
        text: `Merge${side ? ` ${side}` : ''}${onto}`,
      };

    case 'on ramp':
      return {
        icon: side === 'left' ? 'ramp-left' : 'ramp-right',
        text: `Take the ramp${side ? ` on the ${side}` : ''}${onto}`,
      };

    case 'off ramp':
      return {
        icon: side === 'left' ? 'ramp-left' : 'ramp-right',
        text: `Take the exit${side ? ` on the ${side}` : ''}${onto}`,
      };

    case 'end of road':
      return {
        icon: turnIcon(modifier),
        text: `At the end of the road, turn ${side || 'ahead'}${onto}`,
      };

    case 'continue':
    case 'new name':
      return !modifier || modifier === 'straight'
        ? {
            icon: 'straight',
            text: step.name ? `Continue on ${step.name}` : 'Continue straight',
          }
        : {
            icon: turnIcon(modifier),
            text: `Keep ${modifier}${onto}`,
          };

    default:
      if (modifier === 'uturn') {
        return {
          icon: 'u-turn-left',
          text: `Make a U-turn${onto}`,
        };
      }

      if (!modifier || modifier === 'straight') {
        return {
          icon: 'straight',
          text: `Go straight${onto}`,
        };
      }

      return {
        icon: turnIcon(modifier),
        text: `Turn ${modifier}${onto}`,
      };
  }
}

// The donor's next turn, or null when there is no road route
// (routing unavailable).
export function getTripGuidance(
  trip: DonorTrip | null,
  position: { latitude: number; longitude: number } | null,
  destinationName: string
): TripGuidance | null {
  const points = trip?.route;
  const steps = trip?.steps;

  if (
    !position ||
    !points ||
    points.length < 2 ||
    !steps ||
    steps.length < 2
  ) {
    return null;
  }

  const me = projectOnRoute(points, position.latitude, position.longitude);

  if (me.offset > OFF_ROUTE_M) {
    return {
      icon: 'alt-route',
      text: 'Off route · finding a new way',
      distance_m: null,
      offRoute: true,
    };
  }

  // Step 0 is "depart"; the first turn still ahead is next.
  for (let index = 1; index < steps.length; index++) {
    const turn = projectOnRoute(points, steps[index].latitude, steps[index].longitude);

    if (turn.along > me.along + PASSED_M) {
      return {
        ...describeStep(steps[index], destinationName),
        distance_m: turn.along - me.along,
        offRoute: false,
      };
    }
  }

  return {
    icon: 'flag',
    text: `Arrive at ${destinationName}`,
    distance_m: null,
    offRoute: false,
  };
}
