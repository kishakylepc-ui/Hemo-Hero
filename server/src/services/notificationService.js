const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  sendPushForNotifications
} = require(
  './pushService'
);

// ============================================================
// HELPERS
// ============================================================

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(
    value
  ).trim();
}

function normalizeData(data) {
  if (
    !data ||
    typeof data !==
      'object' ||
    Array.isArray(data)
  ) {
    return {};
  }

  return data;
}

// ============================================================
// CREATE ONE NOTIFICATION
//
// IMPORTANT:
// Notification failure should NOT break the main action.
//
// Example:
// A donor response should still succeed even if creating the
// notification temporarily fails.
// ============================================================

async function createNotification({
  userId,
  type,
  title,
  message,
  data = {}
}) {
  try {
    const cleanUserId =
      cleanText(
        userId
      );

    const cleanType =
      cleanText(
        type
      );

    const cleanTitle =
      cleanText(
        title
      );

    const cleanMessage =
      cleanText(
        message
      );

    if (
      !cleanUserId ||
      !cleanType ||
      !cleanTitle ||
      !cleanMessage
    ) {
      console.error(
        'CREATE NOTIFICATION ERROR: Missing required notification data.'
      );

      return null;
    }

    const {
      data:
        notification,
      error
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .insert({
          user_id:
            cleanUserId,

          type:
            cleanType,

          title:
            cleanTitle,

          message:
            cleanMessage,

          data:
            normalizeData(
              data
            ),

          is_read:
            false,

          read_at:
            null
        })
        .select()
        .single();

    if (error) {
      console.error(
        'CREATE NOTIFICATION DATABASE ERROR:',
        error
      );

      return null;
    }

    // Also to the user's phones. Not awaited: the action that
    // created the notification doesn't wait for delivery.
    void sendPushForNotifications([
      notification
    ]);

    return notification;
  } catch (error) {
    console.error(
      'CREATE NOTIFICATION ERROR:',
      error
    );

    return null;
  }
}

// ============================================================
// CREATE MULTIPLE NOTIFICATIONS
// ============================================================

async function createNotifications(
  notifications
) {
  try {
    if (
      !Array.isArray(
        notifications
      ) ||
      notifications.length ===
        0
    ) {
      return [];
    }

    const rows =
      notifications
        .map(
          item => {
            const userId =
              cleanText(
                item?.userId
              );

            const type =
              cleanText(
                item?.type
              );

            const title =
              cleanText(
                item?.title
              );

            const message =
              cleanText(
                item?.message
              );

            if (
              !userId ||
              !type ||
              !title ||
              !message
            ) {
              return null;
            }

            return {
              user_id:
                userId,

              type,

              title,

              message,

              data:
                normalizeData(
                  item?.data
                ),

              is_read:
                false,

              read_at:
                null
            };
          }
        )
        .filter(Boolean);

    if (
      rows.length === 0
    ) {
      return [];
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'notifications'
        )
        .insert(
          rows
        )
        .select();

    if (error) {
      console.error(
        'CREATE MULTIPLE NOTIFICATIONS DATABASE ERROR:',
        error
      );

      return [];
    }

    void sendPushForNotifications(
      data || []
    );

    return data || [];
  } catch (error) {
    console.error(
      'CREATE MULTIPLE NOTIFICATIONS ERROR:',
      error
    );

    return [];
  }
}

// ============================================================
// NOTIFY ALL ADMINS
//
// Creates one notification row for every ACTIVE admin account.
// Admins then read them through the normal /api/notifications
// routes (each admin only sees their own rows).
//
// Like the functions above, failure never throws - the main
// action (e.g. submitting an application) must still succeed.
//
// data.route tells the Admin Portal which screen to open,
// e.g. '/applications/<id>' or '/issues/<id>'.
// ============================================================

async function notifyAdmins({
  type,
  title,
  message,
  data = {}
}) {
  try {
    const {
      data:
        admins,
      error
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          'id'
        )
        .eq(
          'role',
          'admin'
        )
        .eq(
          'is_active',
          true
        );

    if (error) {
      console.error(
        'NOTIFY ADMINS LOOKUP ERROR:',
        error
      );

      return [];
    }

    if (
      !admins ||
      admins.length === 0
    ) {
      return [];
    }

    return createNotifications(
      admins.map(
        admin => ({
          userId:
            admin.id,

          type,

          title,

          message,

          data
        })
      )
    );
  } catch (error) {
    console.error(
      'NOTIFY ADMINS ERROR:',
      error
    );

    return [];
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createNotification,
  createNotifications,
  notifyAdmins
};