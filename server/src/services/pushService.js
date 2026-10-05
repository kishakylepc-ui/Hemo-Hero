const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  getPreferencesForUsers,
  wantsPush
} = require(
  './notificationPreferenceService'
);

// ============================================================
// PUSH NOTIFICATIONS (Expo push service)
//
// Every notification saved for a mobile user is also sent to
// the phones that user signed in on (push_tokens), unless the
// user turned that kind of alert off (notification settings).
// Admin-portal alerts ('admin_*') stay in the portal.
//
// Sending never blocks or fails the action that created the
// notification. Tokens Expo reports as no longer registered are
// removed.
// ============================================================

const EXPO_PUSH_URL =
  'https://exp.host/--/api/v2/push/send';

// Expo accepts up to 100 messages per request.
const BATCH_SIZE =
  100;

// Keeps each message well under Expo's 4 KB limit.
const MAX_BODY_LENGTH =
  300;

const PUSH_TIMEOUT_MS =
  10000;

function shouldPush(
  type
) {
  return (
    typeof type ===
      'string' &&
    !type.startsWith(
      'admin_'
    )
  );
}

function shorten(
  text,
  max
) {
  const value =
    String(
      text ||
      ''
    );

  return value.length >
    max
    ? `${value.slice(0, max - 1)}…`
    : value;
}

// Only the fields a tap needs to open the right screen.
function pushData(
  notification
) {
  const data =
    notification.data &&
    typeof notification.data ===
      'object'
      ? notification.data
      : {};

  const keep = [
    'request_id',
    'response_id',
    'invitation_id',
    'donation_id',
    'kind',
    'recipient_role',
    'trip_id'
  ];

  const picked = {};

  for (const key of keep) {
    if (
      data[key] !== undefined &&
      data[key] !== null
    ) {
      picked[key] =
        data[key];
    }
  }

  return {
    ...picked,

    notification_id:
      notification.id,

    type:
      notification.type,

    related_request_id:
      notification.related_request_id ||
      null
  };
}

async function postToExpo(
  messages
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      PUSH_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        EXPO_PUSH_URL,
        {
          method:
            'POST',

          signal:
            controller.signal,

          headers: {
            Accept:
              'application/json',

            'Accept-Encoding':
              'gzip, deflate',

            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              messages
            )
        }
      );

    const result =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      console.error(
        'PUSH SEND ERROR:',
        response.status,
        result
      );

      return [];
    }

    return Array.isArray(
      result?.data
    )
      ? result.data
      : [];
  } finally {
    clearTimeout(
      timer
    );
  }
}

// ============================================================
// SEND FOR SAVED NOTIFICATIONS
//
// notifications: rows from the notifications table.
// ============================================================

async function sendPushForNotifications(
  notifications
) {
  try {
    const candidates =
      (notifications || []).filter(
        row =>
          row?.user_id &&
          shouldPush(
            row.type
          )
      );

    if (!candidates.length) {
      return;
    }

    // Leave out the alerts each user turned off.
    const preferences =
      await getPreferencesForUsers(
        candidates.map(
          row =>
            row.user_id
        )
      );

    const rows =
      candidates.filter(
        row =>
          wantsPush(
            preferences.get(
              row.user_id
            ),
            row.type
          )
      );

    if (!rows.length) {
      return;
    }

    const userIds = [
      ...new Set(
        rows.map(
          row =>
            row.user_id
        )
      )
    ];

    const {
      data: tokens,
      error
    } =
      await supabaseAdmin
        .from(
          'push_tokens'
        )
        .select(
          'user_id,token'
        )
        .in(
          'user_id',
          userIds
        );

    if (error) {
      // Table missing (migration not run yet) or a lookup
      // failure: the in-app notification still exists.
      console.error(
        'PUSH TOKEN LOOKUP ERROR:',
        error.message ||
          error
      );

      return;
    }

    if (!tokens?.length) {
      return;
    }

    const messages = [];

    for (const row of rows) {
      for (const device of tokens) {
        if (
          device.user_id !==
          row.user_id
        ) {
          continue;
        }

        messages.push({
          to:
            device.token,

          title:
            shorten(
              row.title,
              100
            ),

          body:
            shorten(
              row.message,
              MAX_BODY_LENGTH
            ),

          data:
            pushData(
              row
            ),

          sound:
            'default',

          channelId:
            'default',

          priority:
            'high'
        });
      }
    }

    const staleTokens =
      new Set();

    for (
      let start = 0;
      start <
      messages.length;
      start += BATCH_SIZE
    ) {
      const batch =
        messages.slice(
          start,
          start + BATCH_SIZE
        );

      const tickets =
        await postToExpo(
          batch
        );

      tickets.forEach(
        (
          ticket,
          index
        ) => {
          if (
            ticket?.status ===
              'error' &&
            ticket.details
              ?.error ===
              'DeviceNotRegistered'
          ) {
            staleTokens.add(
              batch[index].to
            );
          } else if (
            ticket?.status ===
            'error'
          ) {
            console.error(
              'PUSH TICKET ERROR:',
              ticket.message ||
                ticket.details
            );
          }
        }
      );
    }

    if (staleTokens.size) {
      await supabaseAdmin
        .from(
          'push_tokens'
        )
        .delete()
        .in(
          'token',
          [...staleTokens]
        );
    }
  } catch (error) {
    console.error(
      'PUSH NOTIFICATION ERROR:',
      error.message ||
        error
    );
  }
}

// ============================================================
// DEVICE TOKENS
// ============================================================

const TOKEN_PATTERN =
  /^Expo(nent)?PushToken\[[^\]]+\]$/;

function isExpoPushToken(
  token
) {
  return (
    typeof token ===
      'string' &&
    token.length <= 255 &&
    TOKEN_PATTERN.test(
      token
    )
  );
}

module.exports = {
  sendPushForNotifications,
  isExpoPushToken
};
