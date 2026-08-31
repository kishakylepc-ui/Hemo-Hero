require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

const app = express();

// ------------------------------------------------------------
// BASIC SECURITY / APP CONFIGURATION
// ------------------------------------------------------------

// Avoid advertising that the API is powered by Express.
app.disable('x-powered-by');

// ------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------

// Development CORS configuration.
//
// This is intentionally open while developing Hemo-Hero.
// We can restrict allowed origins later before deployment.
app.use(cors());

// Parse incoming JSON requests.
// A size limit prevents unnecessarily large request bodies.
app.use(
  express.json({
    limit: '1mb'
  })
);

// ------------------------------------------------------------
// DEVELOPMENT REQUEST LOGGER
// ------------------------------------------------------------

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'hemo-hero-server'
  });
});

// ------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------

app.use('/api/auth', authRoutes);

// Future modules will go here:
//
// app.use('/api/donors', donorRoutes);
// app.use('/api/requests', requestRoutes);
// app.use('/api/matches', matchRoutes);
// app.use('/api/notifications', notificationRoutes);

// ------------------------------------------------------------
// 404 HANDLER
// Must remain AFTER all valid routes.
// ------------------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    error: 'Route not found'
  });
});

// ------------------------------------------------------------
// GLOBAL ERROR HANDLER
// Must have four parameters so Express recognizes it as an
// error-handling middleware.
// ------------------------------------------------------------

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  return res.status(500).json({
    error: 'Internal server error'
  });
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Hemo-Hero server running on port ${PORT}`);
});