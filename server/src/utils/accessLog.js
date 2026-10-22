const {
  logActivity,
  getClientIp,
} = require(
  './activityLogger'
);

// ============================================================
// UNAUTHORIZED ACCESS
//
// Records a request that an access check turned away (no or
// bad sign-in token, deactivated or locked account, wrong role)
// in the log trail as UNAUTHORIZED_ACCESS, module Access
// Control, with the user (when known), route and IP address.
//
// The same caller, route and reason is recorded at most once a
// minute, so a script can't flood the log trail.
// ============================================================

const REPEAT_WINDOW_MS =
  60 * 1000;

// Caps memory; old keys are dropped first.
const MAX_KEYS =
  5000;

// key -> when it was last recorded
const recent =
  new Map();

function shouldRecord(
  key,
  now
) {
  const last =
    recent.get(
      key
    );

  if (
    last &&
    now - last <
      REPEAT_WINDOW_MS
  ) {
    return false;
  }

  if (
    recent.size >=
    MAX_KEYS
  ) {
    for (const [
      oldKey,
      time,
    ] of recent) {
      if (
        now - time >=
        REPEAT_WINDOW_MS
      ) {
        recent.delete(
          oldKey
        );
      }
    }

    if (
      recent.size >=
      MAX_KEYS
    ) {
      recent.clear();
    }
  }

  recent.set(
    key,
    now
  );

  return true;
}

// reason: what was blocked, in plain words (the description).
// reasonCode: the error code sent to the client.
function logUnauthorizedAccess(
  req,
  {
    reason,
    reasonCode,
    statusCode,
    user = null,
  }
) {
  try {
    const route =
      String(
        req?.originalUrl ||
          req?.url ||
          ''
      ).split('?')[0];

    const key = [
      getClientIp(req) ||
        '-',
      user?.id ||
        '-',
      reasonCode,
      req?.method,
      route,
    ].join('|');

    if (
      !shouldRecord(
        key,
        Date.now()
      )
    ) {
      return;
    }

    void logActivity({
      req,

      user,

      action:
        'UNAUTHORIZED_ACCESS',

      module:
        'Access Control',

      description:
        reason,

      success:
        false,

      statusCode,

      metadata: {
        reason_code:
          reasonCode,
      },
    });
  } catch (error) {
    // Logging must never block the real response.
    console.error(
      'UNAUTHORIZED ACCESS LOG ERROR:',
      error
    );
  }
}

module.exports = {
  logUnauthorizedAccess,
};
