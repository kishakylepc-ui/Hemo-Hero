const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

// ============================================================
// NOTIFICATION SETTINGS (notification_preferences)
//
// Chooses which notifications also alert the user's phones.
// The Notifications inbox always keeps every notification.
//
// No saved row means everything is on. Account and donor
// application updates always alert.
// ============================================================

const PREFERENCE_KEYS = [
  'push_enabled',
  'donation_requests',
  'request_updates',
  'messages',
  'donations'
];

const DEFAULT_PREFERENCES =
  Object.freeze(
    Object.fromEntries(
      PREFERENCE_KEYS.map(
        key => [
          key,
          true
        ]
      )
    )
  );

// Which setting a notification type belongs to (null = always
// on).
function getPreferenceKey(
  type
) {
  const value =
    String(
      type ||
      ''
    );

  if (
    value === 'request' ||
    value === 'match'
  ) {
    return 'donation_requests';
  }

  if (
    value.startsWith('donor_response_') ||
    value.startsWith('blood_request_')
  ) {
    return 'request_updates';
  }

  if (
    value.startsWith('coordination_')
  ) {
    return 'messages';
  }

  if (
    value.startsWith('donation_')
  ) {
    return 'donations';
  }

  return null;
}

function wantsPush(
  preferences,
  type
) {
  const settings =
    preferences ||
    DEFAULT_PREFERENCES;

  if (
    settings.push_enabled ===
    false
  ) {
    return false;
  }

  const key =
    getPreferenceKey(
      type
    );

  return (
    !key ||
    settings[key] !==
      false
  );
}

function toPreferences(
  row
) {
  return Object.fromEntries(
    PREFERENCE_KEYS.map(
      key => [
        key,
        row?.[key] ===
        undefined ||
        row?.[key] ===
          null
          ? true
          : Boolean(
              row[key]
            )
      ]
    )
  );
}

function isMissingTable(
  error
) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  );
}

// Map of userId -> settings for the given users. Users without
// a saved row get the defaults. Never throws.
async function getPreferencesForUsers(
  userIds
) {
  const result =
    new Map();

  const ids = [
    ...new Set(
      (userIds || []).filter(
        Boolean
      )
    )
  ];

  for (const id of ids) {
    result.set(
      id,
      DEFAULT_PREFERENCES
    );
  }

  if (!ids.length) {
    return result;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'notification_preferences'
        )
        .select('*')
        .in(
          'user_id',
          ids
        );

    if (error) {
      if (!isMissingTable(error)) {
        console.error(
          'NOTIFICATION SETTINGS LOOKUP ERROR:',
          error.message ||
            error
        );
      }

      return result;
    }

    for (const row of data || []) {
      result.set(
        row.user_id,
        toPreferences(
          row
        )
      );
    }
  } catch (error) {
    console.error(
      'NOTIFICATION SETTINGS LOOKUP ERROR:',
      error.message ||
        error
    );
  }

  return result;
}

async function getPreferences(
  userId
) {
  const map =
    await getPreferencesForUsers([
      userId
    ]);

  return map.get(
    userId
  ) ||
    DEFAULT_PREFERENCES;
}

// Checks a settings change: { valid, updates } or
// { valid: false, error }.
function readPreferenceUpdates(
  body
) {
  const updates = {};

  for (const key of PREFERENCE_KEYS) {
    if (
      body?.[key] ===
      undefined
    ) {
      continue;
    }

    if (
      typeof body[key] !==
      'boolean'
    ) {
      return {
        valid: false,
        error:
          'Each notification setting must be on or off.'
      };
    }

    updates[key] =
      body[key];
  }

  if (
    !Object.keys(
      updates
    ).length
  ) {
    return {
      valid: false,
      error:
        'Nothing to update.'
    };
  }

  return {
    valid: true,
    updates
  };
}

module.exports = {
  PREFERENCE_KEYS,
  DEFAULT_PREFERENCES,
  getPreferenceKey,
  wantsPush,
  toPreferences,
  isMissingTable,
  getPreferences,
  getPreferencesForUsers,
  readPreferenceUpdates
};
