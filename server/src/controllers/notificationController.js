const {
  supabaseAdmin
} = require('../config/supabase');

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  isExpoPushToken
} = require(
  '../services/pushService'
);

const {
  CHAT_NOTIFICATION_TYPES
} = require(
  '../services/notificationService'
);

const {
  getPreferences,
  isMissingTable,
  readPreferenceUpdates,
  toPreferences
} = require(
  '../services/notificationPreferenceService'
);

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

function getNotificationId(req) {
  return String(
    req.params.id ||
    ''
  ).trim();
}

function getLimit(value) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    )
  ) {
    return 50;
  }

  return Math.min(
    Math.max(
      parsed,
      1
    ),
    100
  );
}

// ============================================================
// GET /api/notifications
// ============================================================

async function getMyNotifications(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const limit =
      getLimit(
        req.query.limit
      );

    // --------------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------------

    const {
      data:
        notifications,
      error:
        notificationsError
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(
          limit
        );

    if (
      notificationsError
    ) {
      console.error(
        'GET NOTIFICATIONS ERROR:',
        notificationsError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve notifications.'
        });
    }

    // --------------------------------------------------------
    // UNREAD COUNT
    // --------------------------------------------------------

    const {
      count:
        unreadCount,
      error:
        unreadError
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        )
        .eq(
          'user_id',
          userId
        )
        .eq(
          'is_read',
          false
        );

    if (unreadError) {
      console.error(
        'GET NOTIFICATIONS UNREAD COUNT ERROR:',
        unreadError
      );
    }

    return res
      .status(200)
      .json({
        count:
          notifications
            ?.length ||
          0,

        unread_count:
          unreadCount ||
          0,

        notifications:
          notifications ||
          []
      });
  } catch (error) {
    console.error(
      'GET NOTIFICATIONS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// GET /api/notifications/unread-count
// ============================================================

// Unread alerts from chats the person can still open. A chat closes
// when its offer is withdrawn (e.g. the donor's account was
// deactivated); its alerts would otherwise keep the Chat tab's badge
// on with nothing to open.
async function countUnreadChatNotifications(
  userId
) {
  const {
    data:
      rows,
    error
  } =
    await supabaseAdmin
      .from(
        'notifications'
      )
      .select(
        'data'
      )
      .eq(
        'user_id',
        userId
      )
      .eq(
        'is_read',
        false
      )
      .in(
        'type',
        CHAT_NOTIFICATION_TYPES
      );

  if (error) {
    throw error;
  }

  const responseIds = [
    ...new Set(
      (rows || [])
        .map(
          row =>
            row.data
              ?.response_id
        )
        .filter(Boolean)
    )
  ];

  if (
    !responseIds.length
  ) {
    return 0;
  }

  const {
    data:
      openResponses,
    error:
      responseError
  } =
    await supabaseAdmin
      .from(
        'blood_request_responses'
      )
      .select(
        'id'
      )
      .in(
        'id',
        responseIds
      )
      .in(
        'status',
        [
          'accepted',
          'no_show'
        ]
      );

  if (responseError) {
    throw responseError;
  }

  const openIds =
    new Set(
      (openResponses || [])
        .map(
          response =>
            response.id
        )
    );

  return rows.filter(
    row =>
      openIds.has(
        row.data
          ?.response_id
      )
  ).length;
}

async function getUnreadNotificationCount(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    // ?group=messages: the Chat tab's badge.
    if (
      req.query?.group ===
      'messages'
    ) {
      return res
        .status(200)
        .json({
          unread_count:
            await countUnreadChatNotifications(
              userId
            )
        });
    }

    const {
      count,
      error
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        )
        .eq(
          'user_id',
          userId
        )
        .eq(
          'is_read',
          false
        );

    if (error) {
      console.error(
        'GET UNREAD NOTIFICATION COUNT ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve unread notification count.'
        });
    }

    return res
      .status(200)
      .json({
        unread_count:
          count || 0
      });
  } catch (error) {
    console.error(
      'GET UNREAD NOTIFICATION COUNT ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// PATCH /api/notifications/:id/read
// ============================================================

async function markNotificationAsRead(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const notificationId =
      getNotificationId(
        req
      );

    if (
      !notificationId
    ) {
      return res
        .status(400)
        .json({
          error:
            'Notification ID is required.'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Attach the requested notification ID immediately.
    // This means failed lookup attempts can still identify
    // which notification ID was targeted.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'notification',
      notificationId
    );

    // --------------------------------------------------------
    // FIND NOTIFICATION
    // --------------------------------------------------------

    const {
      data:
        notification,
      error:
        findError
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .select('*')
        .eq(
          'id',
          notificationId
        )
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (findError) {
      console.error(
        'FIND NOTIFICATION ERROR:',
        findError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to retrieve notification.'
        });
    }

    if (
      !notification
    ) {
      return res
        .status(404)
        .json({
          error:
            'Notification not found.'
        });
    }

    // --------------------------------------------------------
    // CONFIRM ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'notification',
      notification.id
    );

    // --------------------------------------------------------
    // ALREADY READ
    // --------------------------------------------------------

    if (
      notification.is_read
    ) {
      return res
        .status(200)
        .json({
          message:
            'Notification already marked as read.',

          notification
        });
    }

    // --------------------------------------------------------
    // MARK READ
    // --------------------------------------------------------

    const {
      data:
        updatedNotification,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .update({
          is_read:
            true,

          read_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          notificationId
        )
        .eq(
          'user_id',
          userId
        )
        .select()
        .single();

    if (updateError) {
      console.error(
        'MARK NOTIFICATION READ ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to mark notification as read.'
        });
    }

    // --------------------------------------------------------
    // FINAL ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'notification',
      updatedNotification.id
    );

    return res
      .status(200)
      .json({
        message:
          'Notification marked as read.',

        notification:
          updatedNotification
      });
  } catch (error) {
    console.error(
      'MARK NOTIFICATION READ ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// PATCH /api/notifications/read-all
// ============================================================

async function markAllNotificationsAsRead(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // This action affects a collection rather than one row.
    // The authenticated user's ID identifies whose notification
    // collection was affected.
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'notification_batch',
      userId
    );

    const {
      data:
        updatedNotifications,
      error:
        updateError
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .update({
          is_read:
            true,

          read_at:
            new Date()
              .toISOString()
        })
        .eq(
          'user_id',
          userId
        )
        .eq(
          'is_read',
          false
        )
        .select(
          'id'
        );

    if (updateError) {
      console.error(
        'MARK ALL NOTIFICATIONS READ ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to mark notifications as read.'
        });
    }

    return res
      .status(200)
      .json({
        message:
          'All notifications marked as read.',

        updated_count:
          updatedNotifications
            ?.length ||
          0
      });
  } catch (error) {
    console.error(
      'MARK ALL NOTIFICATIONS READ ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// REGISTER THIS PHONE FOR PUSH NOTIFICATIONS
//
// PUT /api/notifications/push-token
// Body: { token, platform }
//
// A token belongs to one phone: if another account registered
// it before, it moves to the signed-in account.
// ============================================================

async function registerPushToken(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const token =
      String(
        req.body?.token ||
        ''
      ).trim();

    const platform =
      ['ios', 'android'].includes(
        req.body?.platform
      )
        ? req.body.platform
        : null;

    if (
      !isExpoPushToken(
        token
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'A valid Expo push token is required.'
        });
    }

    const {
      error
    } =
      await supabaseAdmin
        .from(
          'push_tokens'
        )
        .upsert(
          {
            user_id:
              userId,

            token,

            platform,

            updated_at:
              new Date()
                .toISOString()
          },
          {
            onConflict:
              'token'
          }
        );

    if (error) {
      console.error(
        'REGISTER PUSH TOKEN ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to turn on notifications for this phone.'
        });
    }

    return res
      .status(200)
      .json({
        message:
          'Push notifications are on for this phone.'
      });
  } catch (error) {
    console.error(
      'REGISTER PUSH TOKEN ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// UNREGISTER THIS PHONE (sign out)
//
// DELETE /api/notifications/push-token
// Body: { token }
//
// Only removes the token from the signed-in account.
// ============================================================

async function removePushToken(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const token =
      String(
        req.body?.token ||
        ''
      ).trim();

    if (!token) {
      return res
        .status(400)
        .json({
          error:
            'Push token is required.'
        });
    }

    const {
      error
    } =
      await supabaseAdmin
        .from(
          'push_tokens'
        )
        .delete()
        .eq(
          'user_id',
          userId
        )
        .eq(
          'token',
          token
        );

    if (error) {
      console.error(
        'REMOVE PUSH TOKEN ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to turn off notifications for this phone.'
        });
    }

    return res
      .status(200)
      .json({
        message:
          'Push notifications are off for this phone.'
      });
  } catch (error) {
    console.error(
      'REMOVE PUSH TOKEN ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

// ============================================================
// NOTIFICATION SETTINGS
//
// GET /api/notifications/preferences
// PUT /api/notifications/preferences
// Body (any of, true/false):
//   push_enabled, donation_requests, request_updates,
//   messages, donations
//
// These choose which notifications alert the user's phones.
// Account and donor application updates always alert.
// ============================================================

async function getNotificationPreferences(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    return res
      .status(200)
      .json({
        preferences:
          await getPreferences(
            userId
          )
      });
  } catch (error) {
    console.error(
      'GET NOTIFICATION SETTINGS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

async function updateNotificationPreferences(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const check =
      readPreferenceUpdates(
        req.body
      );

    if (!check.valid) {
      return res
        .status(400)
        .json({
          error:
            check.error
        });
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'notification_preferences'
        )
        .upsert(
          {
            user_id:
              userId,

            ...check.updates,

            updated_at:
              new Date()
                .toISOString()
          },
          {
            onConflict:
              'user_id'
          }
        )
        .select('*')
        .single();

    if (error) {
      console.error(
        'UPDATE NOTIFICATION SETTINGS ERROR:',
        error
      );

      return res
        .status(
          isMissingTable(
            error
          )
            ? 503
            : 500
        )
        .json({
          error:
            isMissingTable(
              error
            )
              ? 'Notification settings are not set up on the server yet.'
              : 'Unable to save your notification settings.'
        });
    }

    setActivityEntity(
      res,
      'notification_preferences',
      userId
    );

    return res
      .status(200)
      .json({
        message:
          'Notification settings saved.',

        preferences:
          toPreferences(
            data
          )
      });
  } catch (error) {
    console.error(
      'UPDATE NOTIFICATION SETTINGS ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerPushToken,
  removePushToken,
  getNotificationPreferences,
  updateNotificationPreferences
};