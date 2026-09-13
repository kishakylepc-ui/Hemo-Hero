require('dotenv').config();

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

const notificationRoutes =
  require('./routes/notificationRoutes');

// ============================================================
// APP
// ============================================================

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
    origin: true,

    credentials: true,
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

app.listen(
  PORT,
  () => {
    console.log(
      '========================================'
    );

    console.log(
      `Hemo-Hero server running on port ${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/health`
    );

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