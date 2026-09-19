const express =
  require('express');

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} =
  require(
    '../controllers/notificationController'
  );

const {
  requireAuth
} =
  require(
    '../middleware/authMiddleware'
  );

const {
  activityLog
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const router =
  express.Router();

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(
  requireAuth
);

// ============================================================
// GET NOTIFICATIONS
//
// Read-only.
// Not logged to avoid repeated audit entries caused by
// notification screen refreshes.
// ============================================================

router.get(
  '/',

  getMyNotifications
);

// ============================================================
// UNREAD COUNT
//
// Keep before /:id routes.
//
// Read-only.
// Not logged because this endpoint may be called repeatedly
// by badges and notification indicators.
// ============================================================

router.get(
  '/unread-count',

  getUnreadNotificationCount
);

// ============================================================
// MARK ALL READ
//
// PATCH /api/notifications/read-all
//
// This records that the authenticated user marked all of
// their currently unread notifications as read.
// ============================================================

router.patch(
  '/read-all',

  activityLog({
    action:
      'MARK_ALL_NOTIFICATIONS_READ',

    module:
      'Notifications',

    successDescription:
      'User marked all notifications as read.',

    failureDescription:
      'User attempt to mark all notifications as read failed.',

    entityType:
      'notification_batch'
  }),

  markAllNotificationsAsRead
);

// ============================================================
// MARK ONE READ
//
// PATCH /api/notifications/:id/read
//
// The notification controller will attach the exact
// notification UUID to the audit record.
// ============================================================

router.patch(
  '/:id/read',

  activityLog({
    action:
      'MARK_NOTIFICATION_READ',

    module:
      'Notifications',

    successDescription:
      'User marked a notification as read.',

    failureDescription:
      'User attempt to mark a notification as read failed.',

    entityType:
      'notification'
  }),

  markNotificationAsRead
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;