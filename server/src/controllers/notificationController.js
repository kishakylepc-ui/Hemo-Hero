const {
  supabaseAdmin
} = require('../config/supabase');

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
// EXPORTS
// ============================================================

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
};