const {
  supabaseAdmin,
} = require(
  '../config/supabase'
);

// ============================================================
// SENSITIVE KEYS
//
// These values must NEVER be stored inside activity logs.
// ============================================================

const SENSITIVE_KEYS =
  new Set([
    'password',
    'current_password',
    'new_password',
    'confirm_password',

    'access_token',
    'refresh_token',
    'token',

    'otp',
    'code',
    'verification_code',
    'recovery_code',

    'service_role_key',
    'supabase_service_role_key',
  ]);

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(
  value
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const text =
    String(
      value
    ).trim();

  return text ||
    null;
}

// ============================================================
// SANITIZE METADATA
//
// Recursively removes sensitive values before anything is
// written to the activity_logs table.
// ============================================================

function sanitizeMetadata(
  value
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return value;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      item =>
        sanitizeMetadata(
          item
        )
    );
  }

  if (
    typeof value ===
      'object'
  ) {
    const safeObject =
      {};

    for (
      const [
        key,
        item,
      ] of Object.entries(
        value
      )
    ) {
      const normalizedKey =
        String(
          key
        )
          .trim()
          .toLowerCase();

      if (
        SENSITIVE_KEYS.has(
          normalizedKey
        )
      ) {
        continue;
      }

      safeObject[key] =
        sanitizeMetadata(
          item
        );
    }

    return safeObject;
  }

  return value;
}

// ============================================================
// GET CLIENT IP
// ============================================================

function getClientIp(
  req
) {
  try {
    const forwarded =
      req?.headers?.[
        'x-forwarded-for'
      ];

    if (
      typeof forwarded ===
        'string' &&
      forwarded.trim()
    ) {
      return forwarded
        .split(',')[0]
        .trim();
    }

    if (
      Array.isArray(
        forwarded
      ) &&
      forwarded.length >
        0
    ) {
      return String(
        forwarded[0]
      ).trim();
    }

    return (
      req?.ip ||
      req?.socket
        ?.remoteAddress ||
      null
    );
  } catch (
    error
  ) {
    console.error(
      'ACTIVITY LOGGER IP ERROR:',
      error
    );

    return null;
  }
}

// ============================================================
// GET USER AGENT
// ============================================================

function getUserAgent(
  req
) {
  const userAgent =
    req?.headers?.[
      'user-agent'
    ];

  return cleanText(
    userAgent
  );
}

// ============================================================
// GET ROUTE
// ============================================================

function getRoute(
  req
) {
  if (!req) {
    return null;
  }

  return cleanText(
    req.originalUrl ||
      req.url ||
      req.path
  );
}

// ============================================================
// RESOLVE USER
//
// Priority:
// 1. Explicit user supplied by controller
// 2. req.dbUser from authentication middleware
// 3. req.authUser from Supabase authentication
// ============================================================

function resolveUser(
  req,
  user
) {
  const source =
    user ||
    req?.dbUser ||
    req?.authUser ||
    null;

  if (!source) {
    return {
      id:
        null,

      email:
        null,

      role:
        null,
    };
  }

  return {
    id:
      cleanText(
        source.id
      ),

    email:
      cleanText(
        source.email
      ),

    role:
      cleanText(
        source.role
      ),
  };
}

// ============================================================
// LOG ACTIVITY
//
// Logging must NEVER crash the main application.
//
// Example:
//
// await logActivity({
//   req,
//   action: 'LOGIN',
//   module: 'Authentication',
//   description: 'User logged in successfully.',
//   success: true,
// });
//
// Controllers may optionally provide:
//
// user
// statusCode
// entityType
// entityId
// metadata
// ============================================================

async function logActivity({
  req = null,

  user = null,

  action,

  module,

  description = null,

  success = true,

  statusCode = null,

  entityType = null,

  entityId = null,

  metadata = {},
} = {}) {
  try {
    // --------------------------------------------------------
    // REQUIRED LOG VALUES
    // --------------------------------------------------------

    const cleanAction =
      cleanText(
        action
      );

    const cleanModule =
      cleanText(
        module
      );

    if (
      !cleanAction ||
      !cleanModule
    ) {
      console.error(
        'ACTIVITY LOGGER ERROR: action and module are required.'
      );

      return null;
    }

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const actor =
      resolveUser(
        req,
        user
      );

    // --------------------------------------------------------
    // METHOD
    // --------------------------------------------------------

    const httpMethod =
      cleanText(
        req?.method
      );

    // --------------------------------------------------------
    // SAFE METADATA
    // --------------------------------------------------------

    const safeMetadata =
      sanitizeMetadata(
        metadata ||
          {}
      );

    // --------------------------------------------------------
    // INSERT LOG
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'activity_logs'
        )
        .insert({
          user_id:
            actor.id,

          user_email:
            actor.email,

          user_role:
            actor.role,

          action:
            cleanAction,

          module:
            cleanModule,

          http_method:
            httpMethod,

          route:
            getRoute(
              req
            ),

          status_code:
            statusCode,

          success:
            Boolean(
              success
            ),

          description:
            cleanText(
              description
            ),

          entity_type:
            cleanText(
              entityType
            ),

          entity_id:
            cleanText(
              entityId
            ),

          ip_address:
            getClientIp(
              req
            ),

          user_agent:
            getUserAgent(
              req
            ),

          metadata:
            safeMetadata,
        })
        .select(
          'id, created_at'
        )
        .single();

    if (
      error
    ) {
      console.error(
        'ACTIVITY LOG INSERT ERROR:',
        error
      );

      return null;
    }

    return data;
  } catch (
    error
  ) {
    // --------------------------------------------------------
    // IMPORTANT:
    // Logging failure must never block the user's real action.
    // --------------------------------------------------------

    console.error(
      'ACTIVITY LOGGER ERROR:',
      error
    );

    return null;
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  logActivity,
  sanitizeMetadata,
};