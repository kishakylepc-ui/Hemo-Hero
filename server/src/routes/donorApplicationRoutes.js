const express =
  require('express');

const multer =
  require('multer');

const {
  requireAuth
} =
  require('../middleware/authMiddleware');

const {
  getMyDonorApplication,
  getNearbyDonors,
  uploadVerificationId,
  submitDonorApplication,
  withdrawDonorApplication
} =
  require('../controllers/donorApplicationController');

const {
  getPublicDonorProfile
} =
  require('../controllers/donorProfileController');

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
//
// Query:
// latitude
// longitude
// radius
// blood_type
// urgent
// limit
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
// Optional query:
// latitude
// longitude
//
// IMPORTANT:
// Keep this route AFTER /nearby and /me so Express does not
// interpret "nearby" or "me" as a donor ID.
// ============================================================

router.get(
  '/:id',
  getPublicDonorProfile
);

// ============================================================
// UPLOAD VERIFICATION ID
//
// POST /api/donors/verification-id
// ============================================================

router.post(
  '/verification-id',
  upload.single(
    'file'
  ),
  uploadVerificationId
);

// ============================================================
// SUBMIT DONOR APPLICATION
//
// POST /api/donors/apply
// ============================================================

router.post(
  '/apply',
  submitDonorApplication
);

// ============================================================
// WITHDRAW DONOR APPLICATION
//
// PATCH /api/donors/me/withdraw
// ============================================================

router.patch(
  '/me/withdraw',
  withdrawDonorApplication
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

module.exports =
  router;