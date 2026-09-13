const express =
  require('express');

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} =
  require('../controllers/notificationController');

const {
  requireAuth
} =
  require('../middleware/authMiddleware');

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
// ============================================================

router.get(
  '/',
  getMyNotifications
);

// ============================================================
// UNREAD COUNT
//
// Keep before /:id routes.
// ============================================================

router.get(
  '/unread-count',
  getUnreadNotificationCount
);

// ============================================================
// MARK ALL READ
//
// Keep before /:id routes.
// ============================================================

router.patch(
  '/read-all',
  markAllNotificationsAsRead
);

// ============================================================
// MARK ONE READ
// ============================================================

router.patch(
  '/:id/read',
  markNotificationAsRead
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;