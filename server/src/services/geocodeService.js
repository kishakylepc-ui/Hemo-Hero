// ============================================================
// ADDRESS FROM GPS (reverse geocoding)
//
// Fills in the address when someone taps "Use my Current
// Location" while completing their profile. Uses OpenStreetMap's
// Nominatim: free and keyless, with three rules - at most one
// request per second, an identifying User-Agent, and credit to
// OpenStreetMap. Set NOMINATIM_URL to use another server.
// ============================================================

const NOMINATIM_URL =
  String(
    process.env.NOMINATIM_URL ||
    'https://nominatim.openstreetmap.org'
  ).replace(
    /\/+$/,
    ''
  );

const USER_AGENT =
  'Hemo-Hero/1.0 (blood donation app)';

const MIN_INTERVAL_MS =
  1100;

const TIMEOUT_MS =
  8000;

const CACHE_TTL_MS =
  24 * 60 * 60 * 1000;

const CACHE_LIMIT =
  500;

// Highly urbanized cities outside Metro Manila aren't inside a
// province on the map, but addresses still name the province.
const CITY_PROVINCES = {
  'angeles': 'Pampanga',
  'bacolod': 'Negros Occidental',
  'baguio': 'Benguet',
  'butuan': 'Agusan del Norte',
  'cagayan de oro': 'Misamis Oriental',
  'cebu': 'Cebu',
  'davao': 'Davao del Sur',
  'general santos': 'South Cotabato',
  'iligan': 'Lanao del Norte',
  'iloilo': 'Iloilo',
  'lapu-lapu': 'Cebu',
  'lucena': 'Quezon',
  'mandaue': 'Cebu',
  'olongapo': 'Zambales',
  'puerto princesa': 'Palawan',
  'tacloban': 'Leyte',
  'zamboanga': 'Zamboanga del Sur'
};

function cityKey(
  name
) {
  return String(name || '')
    .toLowerCase()
    .replace(/^city of\s+/, '')
    .replace(/\s+city$/, '')
    .trim();
}

// "659" -> "Barangay 659" (Manila and Tacloban number theirs).
function formatBarangay(
  name
) {
  const clean =
    String(name || '')
      .trim();

  return /^\d+$/.test(clean)
    ? `Barangay ${clean}`
    : clean;
}

// Profile form fields from Nominatim's GeocodeJSON "geocoding"
// object. City is admin level 6/7 and province level 4. Barangay
// boundaries (level 10) are exact; where none is mapped, the
// nearest named area or the street is used for the person to
// check.
function toAddress(
  geocoding
) {
  const g =
    geocoding || {};

  const admin =
    g.admin || {};

  const city =
    admin.level6 ||
    admin.level7 ||
    g.city ||
    '';

  const region =
    admin.level3 ||
    '';

  const province =
    admin.level4 ||
    (region === 'Metro Manila'
      ? 'Metro Manila'
      : CITY_PROVINCES[cityKey(city)] || '');

  const exactBarangay =
    admin.level10 ||
    '';

  return {
    barangay:
      formatBarangay(
        exactBarangay ||
        g.locality ||
        g.district ||
        g.street ||
        ''
      ),

    city,

    province,

    barangay_exact:
      Boolean(exactBarangay)
  };
}

// ------------------------------------------------------------
// Requests: one at a time, at least MIN_INTERVAL_MS apart, with
// recent answers cached (by ~10 m).
// ------------------------------------------------------------

const cache =
  new Map();

let queue =
  Promise.resolve();

let lastRequestAt =
  0;

function throttled(
  task
) {
  const run =
    queue.then(async () => {
      const wait =
        lastRequestAt +
        MIN_INTERVAL_MS -
        Date.now();

      if (wait > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, wait)
        );
      }

      lastRequestAt =
        Date.now();

      return task();
    });

  queue =
    run.catch(() => {});

  return run;
}

async function fetchGeocoding(
  latitude,
  longitude
) {
  const url =
    `${NOMINATIM_URL}/reverse?format=geocodejson` +
    `&lat=${latitude}&lon=${longitude}` +
    '&zoom=18&addressdetails=1&accept-language=en';

  const response =
    await fetch(
      url,
      {
        headers: {
          'User-Agent':
            USER_AGENT,

          Accept:
            'application/json'
        },

        signal:
          AbortSignal.timeout(
            TIMEOUT_MS
          )
      }
    );

  if (!response.ok) {
    throw new Error(
      `Address lookup responded ${response.status}`
    );
  }

  const data =
    await response.json();

  return data
    ?.features?.[0]
    ?.properties
    ?.geocoding ||
    null;
}

// The address for a GPS point, or null when none is found.
// Throws when the lookup service can't be reached.
async function reverseGeocode(
  latitude,
  longitude
) {
  const key =
    `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  const cached =
    cache.get(key);

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.value;
  }

  const geocoding =
    await throttled(() =>
      fetchGeocoding(
        latitude,
        longitude
      )
    );

  const address =
    geocoding
      ? toAddress(geocoding)
      : null;

  const value =
    address &&
    (address.barangay ||
      address.city ||
      address.province)
      ? address
      : null;

  cache.set(key, {
    value,

    expiresAt:
      Date.now() +
      CACHE_TTL_MS
  });

  if (cache.size > CACHE_LIMIT) {
    cache.delete(
      cache.keys().next().value
    );
  }

  return value;
}

module.exports = {
  reverseGeocode,
  toAddress
};
