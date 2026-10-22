const {
  logActivity,
  sanitizeMetadata,
} = require(
  '../utils/activityLogger'
);

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(
      value
    ).trim();

  return text || null;
}

// ============================================================
// RESOLVE ACTIVITY USER
//
// Controllers may optionally set:
//
// res.locals.activityUser = {
//   id,
//   email,
//   role,
// };
//
// This is especially useful for LOGIN and REGISTER because
// requireAuth has not run yet.
// ============================================================

function resolveActivityUser(
  req,
  res
) {
  if (
    res?.locals
      ?.activityUser
  ) {
    return res.locals
      .activityUser;
  }

  if (
    req?.dbUser
  ) {
    return req.dbUser;
  }

  if (
    req?.authUser
  ) {
    return req.authUser;
  }

  // ----------------------------------------------------------
  // PUBLIC AUTH FALLBACK
  //
  // For failed login/register attempts we may only know
  // the email address submitted by the user.
  // ----------------------------------------------------------

  const email =
    cleanText(
      req?.body?.email
    );

  if (
    email
  ) {
    return {
      id:
        null,

      email:
        email.toLowerCase(),

      role:
        null,
    };
  }

  return null;
}

// ============================================================
// RESOLVE ENTITY ID
//
// Controller can override using:
//
// res.locals.activityEntityId = someId;
//
// Otherwise middleware can fall back to common route params.
// ============================================================

function resolveEntityId(
  req,
  res
) {
  if (
    res?.locals
      ?.activityEntityId
  ) {
    return cleanText(
      res.locals
        .activityEntityId
    );
  }

  return cleanText(
    req?.params?.id ||
      req?.params
        ?.requestId ||
      req?.params
        ?.responseId ||
      null
  );
}

// ============================================================
// BUILD DESCRIPTION
// ============================================================

function buildDescription(
  option,
  {
    req,
    res,
    success,
    statusCode,
  }
) {
  if (
    typeof option ===
      'function'
  ) {
    try {
      return cleanText(
        option({
          req,
          res,
          success,
          statusCode,
        })
      );
    } catch (
      error
    ) {
      console.error(
        'ACTIVITY DESCRIPTION ERROR:',
        error
      );

      return null;
    }
  }

  return cleanText(
    option
  );
}

// ============================================================
// BUILD METADATA
// ============================================================

function buildMetadata(
  option,
  {
    req,
    res,
    success,
    statusCode,
  }
) {
  if (
    typeof option ===
      'function'
  ) {
    try {
      const value =
        option({
          req,
          res,
          success,
          statusCode,
        });

      return sanitizeMetadata(
        value || {}
      );
    } catch (
      error
    ) {
      console.error(
        'ACTIVITY METADATA ERROR:',
        error
      );

      return {};
    }
  }

  return sanitizeMetadata(
    option || {}
  );
}

// ============================================================
// ACTIVITY LOG MIDDLEWARE
//
// Example:
//
// router.post(
//   '/login',
//   activityLog({
//     action: 'LOGIN',
//     module: 'Authentication',
//     successDescription:
//       'User logged in successfully.',
//     failureDescription:
//       'User login failed.',
//   }),
//   loginLimiter,
//   login
// );
//
// Logging happens AFTER the response finishes so the middleware
// knows the final status code.
//
// This middleware must NEVER block the real request.
// ============================================================

function activityLog({
  action,
  module,

  successDescription =
    null,

  failureDescription =
    null,

  entityType =
    null,

  metadata =
    {},

  // ----------------------------------------------------------
  // By default:
  // 200–399 = success
  // 400+    = failure
  // ----------------------------------------------------------

  isSuccess =
    null,
} = {}) {
  return function activityLogMiddleware(
    req,
    res,
    next
  ) {
    // --------------------------------------------------------
    // Continue the real request immediately.
    // --------------------------------------------------------

    res.on(
      'finish',
      () => {
        try {
          const statusCode =
            res.statusCode;

          let success =
            statusCode >=
              200 &&
            statusCode <
              400;

          // --------------------------------------------------
          // OPTIONAL CUSTOM SUCCESS CHECK
          // --------------------------------------------------

          if (
            typeof isSuccess ===
              'function'
          ) {
            try {
              success =
                Boolean(
                  isSuccess({
                    req,
                    res,
                    statusCode,
                  })
                );
            } catch (
              error
            ) {
              console.error(
                'ACTIVITY SUCCESS CHECK ERROR:',
                error
              );
            }
          }

          // --------------------------------------------------
          // DESCRIPTION
          //
          // A controller can name what really happened (see
          // setActivityOutcome), e.g. a lockout on LOGIN.
          // --------------------------------------------------

          const description =
            cleanText(
              res?.locals
                ?.activityDescription
            ) ||
            buildDescription(
              success
                ? successDescription
                : failureDescription,
              {
                req,
                res,
                success,
                statusCode,
              }
            );

          const finalAction =
            cleanText(
              res?.locals
                ?.activityAction
            ) ||
            action;

          const finalModule =
            cleanText(
              res?.locals
                ?.activityModule
            ) ||
            module;

          // --------------------------------------------------
          // METADATA
          // --------------------------------------------------

          const safeMetadata =
            buildMetadata(
              metadata,
              {
                req,
                res,
                success,
                statusCode,
              }
            );

          // --------------------------------------------------
          // ENTITY
          // --------------------------------------------------

          const finalEntityType =
            cleanText(
              res?.locals
                ?.activityEntityType ||
                entityType
            );

          const finalEntityId =
            resolveEntityId(
              req,
              res
            );

          // --------------------------------------------------
          // USER
          // --------------------------------------------------

          const user =
            resolveActivityUser(
              req,
              res
            );

          // --------------------------------------------------
          // FIRE-AND-FORGET
          //
          // Do not await here because the HTTP response has
          // already finished.
          // --------------------------------------------------

          void logActivity({
            req,

            user,

            action:
              finalAction,

            module:
              finalModule,

            description,

            success,

            statusCode,

            entityType:
              finalEntityType,

            entityId:
              finalEntityId,

            metadata:
              safeMetadata,
          });
        } catch (
          error
        ) {
          console.error(
            'ACTIVITY LOG MIDDLEWARE ERROR:',
            error
          );
        }
      }
    );

    next();
  };
}

// ============================================================
// SET ACTIVITY USER
//
// Controllers can call:
//
// setActivityUser(res, {
//   id: user.id,
//   email: user.email,
//   role: user.role,
// });
//
// Useful for successful login/register actions.
// ============================================================

function setActivityUser(
  res,
  user
) {
  if (
    !res?.locals
  ) {
    return;
  }

  res.locals
    .activityUser =
    user || null;
}

// ============================================================
// SET ACTIVITY ENTITY
//
// Controllers can call:
//
// setActivityEntity(
//   res,
//   'blood_request',
//   request.id
// );
// ============================================================

function setActivityEntity(
  res,
  entityType,
  entityId
) {
  if (
    !res?.locals
  ) {
    return;
  }

  res.locals
    .activityEntityType =
    cleanText(
      entityType
    );

  res.locals
    .activityEntityId =
    cleanText(
      entityId
    );
}

// ============================================================
// SET ACTIVITY OUTCOME
//
// Replaces the route's action, module and/or description for
// this one entry, when the result is more specific than
// "failed":
//
// setActivityOutcome(res, {
//   action: 'ACCOUNT_LOCKOUT',
//   description: 'Account locked for 1 minute.',
// });
// ============================================================

function setActivityOutcome(
  res,
  {
    action = null,
    module = null,
    description = null,
  } = {}
) {
  if (
    !res?.locals
  ) {
    return;
  }

  if (action) {
    res.locals
      .activityAction =
      cleanText(
        action
      );
  }

  if (module) {
    res.locals
      .activityModule =
      cleanText(
        module
      );
  }

  if (description) {
    res.locals
      .activityDescription =
      cleanText(
        description
      );
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  activityLog,
  setActivityUser,
  setActivityEntity,
  setActivityOutcome,
};