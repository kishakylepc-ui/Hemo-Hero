const express =
  require('express');

const multer =
  require('multer');

const router =
  express.Router();

// ============================================================
// AUTH CONTROLLER
// ============================================================

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  forgotPassword,
  verifyRecoveryCode,
  resetPassword,
  getProfile,
  updateProfile,
} = require(
  '../controllers/authController'
);

// ============================================================
// PROFILE PHOTO CONTROLLER
// ============================================================

const {
  uploadProfilePhoto,
  deleteProfilePhoto,
} = require(
  '../controllers/profilePhotoController'
);

// ============================================================
// MIDDLEWARE
// ============================================================

const {
  requireAuth,
} = require(
  '../middleware/authMiddleware'
);

const {
  loginLimiter,
} = require(
  '../middleware/loginRateLimiter'
);

// ============================================================
// PROFILE PHOTO UPLOAD
// ============================================================

const MAX_PROFILE_PHOTO_SIZE =
  5 * 1024 * 1024;

const profilePhotoUploader =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        MAX_PROFILE_PHOTO_SIZE,

      files:
        1,
    },
  });

// ------------------------------------------------------------
// MULTER ERROR HANDLER
// ------------------------------------------------------------

function handleProfilePhotoUpload(
  req,
  res,
  next
) {
  const middleware =
    profilePhotoUploader.single(
      'photo'
    );

  middleware(
    req,
    res,
    error => {
      if (!error) {
        return next();
      }

      // ------------------------------------------------------
      // FILE TOO LARGE
      // ------------------------------------------------------

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(413)
          .json({
            error:
              'Profile photo must be 5 MB or smaller.',
          });
      }

      // ------------------------------------------------------
      // TOO MANY FILES
      // ------------------------------------------------------

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          'LIMIT_FILE_COUNT'
      ) {
        return res
          .status(400)
          .json({
            error:
              'Please upload only one profile photo.',
          });
      }

      console.error(
        'PROFILE PHOTO MULTER ERROR:',
        error
      );

      return res
        .status(400)
        .json({
          error:
            'Unable to process the selected profile photo.',
        });
    }
  );
}

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

router.post(
  '/register',
  register
);

router.post(
  '/verify-email',
  verifyEmail
);

router.post(
  '/resend-verification',
  resendVerification
);

router.post(
  '/login',
  loginLimiter,
  login
);

router.post(
  '/forgot-password',
  forgotPassword
);

// Verify recovery OTP first.

router.post(
  '/verify-recovery-code',
  verifyRecoveryCode
);

// Change password only after OTP verification.

router.post(
  '/reset-password',
  resetPassword
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

router.post(
  '/logout',
  requireAuth,
  logout
);

router.get(
  '/me',
  requireAuth,
  getProfile
);

router.patch(
  '/me',
  requireAuth,
  updateProfile
);

// ============================================================
// PROFILE PHOTO
// ============================================================

// ------------------------------------------------------------
// UPLOAD / REPLACE
//
// multipart/form-data
// field name: photo
// max size: 5 MB
// ------------------------------------------------------------

router.post(
  '/profile-photo',
  requireAuth,
  handleProfilePhotoUpload,
  uploadProfilePhoto
);

// ------------------------------------------------------------
// REMOVE
// ------------------------------------------------------------

router.delete(
  '/profile-photo',
  requireAuth,
  deleteProfilePhoto
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;