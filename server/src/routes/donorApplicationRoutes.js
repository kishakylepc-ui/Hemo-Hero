const express =
  require('express');

const multer =
  require('multer');

const {
  requireAuth
} =
  require('../middleware/authMiddleware');

const {
  activityLog
} =
  require(
    '../middleware/activityLogMiddleware'
  );

const {
  getMyDonorApplication,
  getNearbyDonors,
  uploadVerificationId,
  submitDonorApplication,
  withdrawDonorApplication,
  updateDonorPreferences
} =
  require(
    '../controllers/donorApplicationController'
  );

const {
  getPublicDonorProfile
} =
  require(
    '../controllers/donorProfileController'
  );

const router =
  express.Router();

// ============================================================
// MULTER
// ============================================================

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      if (
        !allowedTypes.includes(
          file.mimetype
        )
      ) {
        return callback(
          new Error(
            'Only JPG, PNG, and WEBP images are allowed.'
          )
        );
      }

      callback(
        null,
        true
      );
    }
  });

// ============================================================
// AUTH
// ============================================================

router.use(
  requireAuth
);

// ============================================================
// GET NEARBY DONORS
//
// GET /api/donors/nearby
// ============================================================

router.get(
  '/nearby',
  getNearbyDonors
);

// ============================================================
// GET MY DONOR APPLICATION
//
// GET /api/donors/me
// ============================================================

router.get(
  '/me',
  getMyDonorApplication
);

// ============================================================
// GET PUBLIC DONOR PROFILE
//
// GET /api/donors/:id
//
// Keep this GET route after /nearby and /me.
// ============================================================

router.get(
  '/:id',
  getPublicDonorProfile
);

// ============================================================
// UPLOAD VERIFICATION ID
//
// POST /api/donors/verification-id
//
// IMPORTANT:
// activityLog is placed BEFORE multer so failed upload
// attempts such as oversized/invalid files are also logged.
// ============================================================

router.post(
  '/verification-id',

  activityLog({
    action:
      'UPLOAD_DONOR_VERIFICATION_ID',

    module:
      'Donor Applications',

    successDescription:
      'User uploaded a donor verification ID.',

    failureDescription:
      'Donor verification ID upload attempt failed.',

    entityType:
      'donor_verification'
  }),

  upload.single(
    'file'
  ),

  uploadVerificationId
);

// ============================================================
// SUBMIT DONOR APPLICATION
//
// POST /api/donors/apply
//
// Covers:
// - New application
// - Reapplication after rejection/withdrawal
// ============================================================

router.post(
  '/apply',

  activityLog({
    action:
      'SUBMIT_DONOR_APPLICATION',

    module:
      'Donor Applications',

    successDescription:
      'User submitted a donor application.',

    failureDescription:
      'Donor application submission attempt failed.',

    entityType:
      'donor_application'
  }),

  submitDonorApplication
);

// ============================================================
// WITHDRAW DONOR APPLICATION
//
// PATCH /api/donors/me/withdraw
// ============================================================

router.patch(
  '/me/withdraw',

  activityLog({
    action:
      'WITHDRAW_DONOR_APPLICATION',

    module:
      'Donor Applications',

    successDescription:
      'User withdrew their donor application.',

    failureDescription:
      'Donor application withdrawal attempt failed.',

    entityType:
      'donor_application'
  }),

  withdrawDonorApplication
);

// ============================================================
// DONOR SETTINGS (availability, travel distance, urgent)
//
// PATCH /api/donors/me/preferences
// ============================================================

router.patch(
  '/me/preferences',

  activityLog({
    action:
      'UPDATE_DONOR_PREFERENCES',

    module:
      'Donor Applications',

    successDescription:
      'Donor updated their availability or travel settings.',

    failureDescription:
      'Donor settings update failed.',

    entityType:
      'donor_application'
  }),

  updateDonorPreferences
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(400)
          .json({
            error:
              'Verification image must not exceed 5 MB.'
          });
      }

      return res
        .status(400)
        .json({
          error:
            error.message
        });
    }

    if (
      error
    ) {
      return res
        .status(400)
        .json({
          error:
            error.message ||
            'Unable to upload file.'
        });
    }

    next();
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;