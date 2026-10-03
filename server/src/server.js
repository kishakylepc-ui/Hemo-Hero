require('dotenv').config();

const os =
  require('os');

const express =
  require('express');

const cors =
  require('cors');

// ============================================================
// ROUTES
// ============================================================

const authRoutes =
  require('./routes/authRoutes');

const facilitiesRoutes =
  require('./routes/facilitiesRoutes');

const geocodeRoutes =
  require('./routes/geocodeRoutes');

const nearbyBloodRequestRoutes =
  require('./routes/nearbyBloodRequestRoutes');

const bloodRequestRoutes =
  require('./routes/bloodRequestRoutes');

const donorApplicationRoutes =
  require('./routes/donorApplicationRoutes');

const donorInvitationRoutes =
  require('./routes/donorInvitationRoutes');

const adminDonorRoutes =
  require('./routes/adminDonorRoutes');

const adminActivityLogRoutes =
  require('./routes/adminActivityLogRoutes');

const adminUserRoutes =
  require('./routes/adminUserRoutes');

const adminReportRoutes =
  require('./routes/adminReportRoutes');

const notificationRoutes =
  require('./routes/notificationRoutes');

const donationRoutes =
  require('./routes/donationRoutes');

const adminDonationRoutes =
  require('./routes/adminDonationRoutes');

// ============================================================
// APP
// ============================================================

const {
  startRequestExpiry
} = require(
  './services/requestExpiryService'
);

const app =
  express();

const PORT =
  process.env.PORT ||
  5000;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin:
      true,

    credentials:
      true,
  })
);

// ============================================================
// JSON
// ============================================================

app.use(
  express.json()
);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use(
  (
    req,
    res,
    next
  ) => {
    console.log(
      `${req.method} ${req.originalUrl}`
    );

    next();
  }
);

// ============================================================
// HEALTH
// ============================================================

app.get(
  '/health',
  (
    req,
    res
  ) => {
    res.json({
      status:
        'ok',

      service:
        'hemo-hero-server',
    });
  }
);

// ============================================================
// API ROUTES
// ============================================================

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

app.use(
  '/api/auth',
  authRoutes
);

// ------------------------------------------------------------
// FACILITIES
// ------------------------------------------------------------

app.use(
  '/api/facilities',
  facilitiesRoutes
);

// ------------------------------------------------------------
// ADDRESS FROM GPS (Complete Profile autofill)
// ------------------------------------------------------------

app.use(
  '/api/geocode',
  geocodeRoutes
);

// ============================================================
// DONOR APPLICATIONS
// ============================================================

app.use(
  '/api/donors',
  donorApplicationRoutes
);

// ============================================================
// DONOR INVITATIONS
//
// GET   /api/donor-invitations/me
// PATCH /api/donor-invitations/:invitationId/accept
// PATCH /api/donor-invitations/:invitationId/decline
// ============================================================

app.use(
  '/api/donor-invitations',
  donorInvitationRoutes
);

// ============================================================
// ADMIN DONOR APPLICATION REVIEW
// ============================================================

app.use(
  '/api/admin/donor-applications',
  adminDonorRoutes
);

// ============================================================
// ADMIN ACTIVITY LOGS
//
// GET /api/admin/activity-logs
// GET /api/admin/activity-logs/summary
//
// ADMIN ONLY
// ============================================================

app.use(
  '/api/admin/activity-logs',
  adminActivityLogRoutes
);

// ============================================================
// ADMIN USER MANAGEMENT
//
// GET   /api/admin/users
// GET   /api/admin/users/summary
// GET   /api/admin/users/:id
// PATCH /api/admin/users/:id/deactivate
// PATCH /api/admin/users/:id/activate
//
// ADMIN ONLY
// ============================================================

app.use(
  '/api/admin/users',
  adminUserRoutes
);

// ============================================================
// ADMIN ISSUES (USER FEEDBACK / REPORTS)
//
// GET   /api/admin/reports
// GET   /api/admin/reports/summary
// GET   /api/admin/reports/:id
// PATCH /api/admin/reports/:id
//
// ADMIN ONLY
// ============================================================

app.use(
  '/api/admin/reports',
  adminReportRoutes
);

// ============================================================
// ADMIN DONATION RECORDS (review flagged records only)
//
// GET   /api/admin/donations
// GET   /api/admin/donations/summary
// GET   /api/admin/donations/:id
// PATCH /api/admin/donations/:id/approve
// PATCH /api/admin/donations/:id/reject
//
// ADMIN ONLY
// ============================================================

app.use(
  '/api/admin/donations',
  adminDonationRoutes
);

// ============================================================
// DONATION HISTORY
//
// GET /api/donations/me
// ============================================================

app.use(
  '/api/donations',
  donationRoutes
);

// ============================================================
// NOTIFICATIONS
//
// GET   /api/notifications
// GET   /api/notifications/unread-count
// PATCH /api/notifications/read-all
// PATCH /api/notifications/:id/read
// ============================================================

app.use(
  '/api/notifications',
  notificationRoutes
);

// ============================================================
// NEARBY BLOOD REQUESTS
//
// Keep this before the general request route.
// ============================================================

app.use(
  '/api/requests/nearby',
  nearbyBloodRequestRoutes
);

// ============================================================
// BLOOD REQUESTS
//
// Includes:
// POST /api/requests/:id/invitations
// ============================================================

app.use(
  '/api/requests',
  bloodRequestRoutes
);

// ============================================================
// 404
// ============================================================

app.use(
  (
    req,
    res
  ) => {
    res
      .status(404)
      .json({
        error:
          'Route not found',
      });
  }
);

// ============================================================
// START SERVER
// ============================================================

// IPv4 addresses of this computer on its local networks
// (Wi-Fi, hotspot, Ethernet).
function getLanAddresses() {
  return Object.values(
    os.networkInterfaces()
  )
    .flat()
    .filter(
      item =>
        item &&
        item.family === 'IPv4' &&
        !item.internal
    )
    .map(
      item =>
        item.address
    );
}

app.listen(
  PORT,
  () => {
    // Closes requests that are past their time (see service).
    startRequestExpiry();

    console.log(
      '========================================'
    );

    console.log(
      `Hemo-Hero server running on port ${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/health`
    );

    // Addresses a phone on the same Wi-Fi / hotspot can use
    // (Expo Go builds the API address from the same IP).
    for (const address of getLanAddresses()) {
      console.log(
        `Phone (same network): http://${address}:${PORT}/health`
      );
    }

    console.log(
      `Donors: http://localhost:${PORT}/api/donors`
    );

    console.log(
      `Donor Invitations: http://localhost:${PORT}/api/donor-invitations`
    );

    console.log(
      `Admin Donor Reviews: http://localhost:${PORT}/api/admin/donor-applications`
    );

    console.log(
      `Admin Activity Logs: http://localhost:${PORT}/api/admin/activity-logs`
    );

    console.log(
      `Admin Activity Summary: http://localhost:${PORT}/api/admin/activity-logs/summary`
    );

    console.log(
      `Admin Users: http://localhost:${PORT}/api/admin/users`
    );

    console.log(
      `Admin User Summary: http://localhost:${PORT}/api/admin/users/summary`
    );

    console.log(
      `Admin Issues: http://localhost:${PORT}/api/admin/reports`
    );

    console.log(
      `Admin Donations: http://localhost:${PORT}/api/admin/donations`
    );

    console.log(
      `Notifications: http://localhost:${PORT}/api/notifications`
    );

    console.log(
      `Blood Requests: http://localhost:${PORT}/api/requests`
    );

    console.log(
      `Nearby Requests: http://localhost:${PORT}/api/requests/nearby`
    );

    console.log(
      '========================================'
    );
  }
);