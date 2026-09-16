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
// ACCOUNT CONTROLLER
// ============================================================

const {
  changePassword,
  changeEmail,
  deactivateAccount,
  deleteAccountPermanently,
} = require(
  '../controllers/accountController'
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

// ============================================================
// PROFILE PHOTO UPLOAD HANDLER
// ============================================================

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

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

router.post(
  '/register',
  register
);

// ------------------------------------------------------------
// VERIFY EMAIL
// ------------------------------------------------------------

router.post(
  '/verify-email',
  verifyEmail
);

// ------------------------------------------------------------
// RESEND VERIFICATION
// ------------------------------------------------------------

router.post(
  '/resend-verification',
  resendVerification
);

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

router.post(
  '/login',
  loginLimiter,
  login
);

// ------------------------------------------------------------
// FORGOT PASSWORD
// ------------------------------------------------------------

router.post(
  '/forgot-password',
  forgotPassword
);

// ------------------------------------------------------------
// VERIFY RECOVERY CODE
// ------------------------------------------------------------

router.post(
  '/verify-recovery-code',
  verifyRecoveryCode
);

// ------------------------------------------------------------
// RESET PASSWORD
// ------------------------------------------------------------

router.post(
  '/reset-password',
  resetPassword
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

router.post(
  '/logout',
  requireAuth,
  logout
);

// ------------------------------------------------------------
// GET CURRENT USER
//
// USER CRUD:
// READ
// ------------------------------------------------------------

router.get(
  '/me',
  requireAuth,
  getProfile
);

// ------------------------------------------------------------
// UPDATE PROFILE
//
// USER CRUD:
// UPDATE
// ------------------------------------------------------------

router.patch(
  '/me',
  requireAuth,
  updateProfile
);

// ============================================================
// ACCOUNT SECURITY
// ============================================================

// ------------------------------------------------------------
// CHANGE PASSWORD
//
// PATCH /api/auth/me/password
// ------------------------------------------------------------

router.patch(
  '/me/password',
  requireAuth,
  changePassword
);

// ------------------------------------------------------------
// CHANGE EMAIL
//
// PATCH /api/auth/me/email
// ------------------------------------------------------------

router.patch(
  '/me/email',
  requireAuth,
  changeEmail
);

// ------------------------------------------------------------
// DEACTIVATE ACCOUNT
//
// DELETE /api/auth/me
//
// Reversible soft deletion.
// ------------------------------------------------------------

router.delete(
  '/me',
  requireAuth,
  deactivateAccount
);

// ------------------------------------------------------------
// PERMANENTLY DELETE ACCOUNT
//
// DELETE /api/auth/me/permanent
//
// Requires:
// - current password
// - confirmation = DELETE
//
// Permanent operation.
// ------------------------------------------------------------

router.delete(
  '/me/permanent',
  requireAuth,
  deleteAccountPermanently
);

// ============================================================
// PROFILE PHOTO
// ============================================================

// ------------------------------------------------------------
// UPLOAD / REPLACE PROFILE PHOTO
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
// REMOVE PROFILE PHOTO
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