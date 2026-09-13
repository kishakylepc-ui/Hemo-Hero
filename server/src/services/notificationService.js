const {
  supabaseAdmin
} = require(
  '../config/supabase'
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
// EXPORTS
// ============================================================

module.exports = {
  createNotification,
  createNotifications
};