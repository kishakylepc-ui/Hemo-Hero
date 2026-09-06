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

const adminDonorRoutes =
  require('./routes/adminDonorRoutes');

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
//
// User / donor-facing routes:
//
// GET   /api/donors/me
// POST  /api/donors/verification-id
// POST  /api/donors/apply
// PATCH /api/donors/me/withdraw
// ============================================================

app.use(
  '/api/donors',
  donorApplicationRoutes
);

// ============================================================
// ADMIN DONOR APPLICATION REVIEW
//
// Every route inside adminDonorRoutes must pass:
//
// requireAuth
// requireAdmin
//
// Available routes:
//
// GET  /api/admin/donor-applications/summary
//
// GET  /api/admin/donor-applications
//
// GET  /api/admin/donor-applications?status=pending
//
// GET  /api/admin/donor-applications/:id
//
// POST /api/admin/donor-applications/:id/approve
//
// POST /api/admin/donor-applications/:id/reject
// ============================================================

app.use(
  '/api/admin/donor-applications',
  adminDonorRoutes
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
      `Admin Donor Reviews: http://localhost:${PORT}/api/admin/donor-applications`
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