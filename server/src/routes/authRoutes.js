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
  requestAccountReview,
  getLoginCaptcha,
  getUsernameAvailability,
  refreshSession,
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
  requestEmailChange,
  resendEmailChange,
  verifyEmailChange,
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
// BLOOD TYPE CONTROLLER
// ============================================================

const {
  updateBloodType,
} = require(
  '../controllers/bloodTypeController'
);

// ============================================================
// AUTH MIDDLEWARE
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

const {
  rateLimit,
} = require(
  'express-rate-limit'
);

const {
  resolveLoginIdentifier,
} = require(
  '../middleware/loginIdentifier'
);

// Account review requests from deactivated people: 5 an hour
// per network (each also needs a token from a real sign-in).
const accountReviewLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    limit:
      5,

    standardHeaders:
      false,

    legacyHeaders:
      false,

    message: {
      error:
        'Too many review requests. Please try again later.',
    },
  });

// Username checks while typing: 60 a minute per network.
const usernameCheckLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit:
      60,

    standardHeaders:
      false,

    legacyHeaders:
      false,

    message: {
      error:
        'Too many username checks. Please wait a minute.',
    },
  });

// New CAPTCHAs per network: 20 a minute is plenty for people
// and stops a script from filling the server's memory.
const captchaLimiter =
  rateLimit({
    windowMs:
      60 * 1000,

    limit:
      20,

    standardHeaders:
      false,

    legacyHeaders:
      false,

    message: {
      error:
        'Too many CAPTCHA requests. Please wait a minute.',

      code:
        'CAPTCHA_RATE_LIMIT',
    },
  });

// ============================================================
// ACTIVITY LOG MIDDLEWARE
// ============================================================

const {
  activityLog,
} = require(
  '../middleware/activityLogMiddleware'
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
// BLOOD TYPE PROOF UPLOAD
//
// One photo (field "proof"), up to 5 MB.
// ============================================================

const bloodTypeProofUploader =
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

function handleBloodTypeProofUpload(
  req,
  res,
  next
) {
  bloodTypeProofUploader.single(
    'proof'
  )(
    req,
    res,
    error => {
      if (!error) {
        return next();
      }

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
              'The proof photo must be 5 MB or smaller.',
          });
      }

      console.error(
        'BLOOD TYPE PROOF MULTER ERROR:',
        error
      );

      return res
        .status(400)
        .json({
          error:
            'Unable to process the selected photo.',
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

  activityLog({
    action:
      'REGISTER',

    module:
      'Authentication',

    successDescription:
      'User registered a new account.',

    failureDescription:
      'Account registration attempt failed.',

    entityType:
      'user_account',
  }),

  register
);

// ------------------------------------------------------------
// VERIFY EMAIL
// ------------------------------------------------------------

router.post(
  '/verify-email',

  activityLog({
    action:
      'VERIFY_EMAIL',

    module:
      'Authentication',

    // Verifying also signs the person in when their profile is
    // ready (res.locals.signedIn, set by verifyEmail).
    successDescription: ({ res }) =>
      res.locals?.signedIn
        ? 'User verified their email address and was signed in.'
        : 'User verified their email address.',

    failureDescription:
      'Email verification attempt failed.',

    entityType:
      'user_account',
  }),

  verifyEmail
);

// ------------------------------------------------------------
// RESEND VERIFICATION
// ------------------------------------------------------------

router.post(
  '/resend-verification',

  activityLog({
    action:
      'RESEND_VERIFICATION',

    module:
      'Authentication',

    successDescription:
      'User requested a new email verification code.',

    failureDescription:
      'Verification-code resend request failed.',

    entityType:
      'user_account',
  }),

  resendVerification
);

// ------------------------------------------------------------
// LOGIN
//
// Activity logger comes BEFORE loginLimiter so blocked
// login attempts are also included in the log trail.
// ------------------------------------------------------------

router.post(
  '/login',

  activityLog({
    action:
      'LOGIN',

    module:
      'Authentication',

    successDescription:
      'User logged in successfully.',

    failureDescription:
      'User login attempt failed.',

    entityType:
      'user_account',
  }),

  // A username becomes the account's email before the lockout
  // check, so both count against the same account.
  resolveLoginIdentifier,

  loginLimiter,

  login
);

// ------------------------------------------------------------
// REQUEST AN ACCOUNT REVIEW (deactivated accounts)
// ------------------------------------------------------------

router.post(
  '/account-review',

  activityLog({
    action:
      'REQUEST_ACCOUNT_REVIEW',

    module:
      'Authentication',

    successDescription:
      'A deactivated user asked for their account to be reviewed.',

    failureDescription:
      'Account review request failed.',

    entityType:
      'user_account',
  }),

  accountReviewLimiter,

  requestAccountReview
);

// ------------------------------------------------------------
// USERNAME AVAILABLE?
//
// GET /api/auth/username-available?username=
// ------------------------------------------------------------

router.get(
  '/username-available',
  usernameCheckLimiter,
  getUsernameAvailability
);

// ------------------------------------------------------------
// SIGN-IN CAPTCHA
//
// GET /api/auth/captcha
//
// Needed for sign-in after an account has been locked. Not
// logged: the attempt that uses it is.
// ------------------------------------------------------------

router.get(
  '/captcha',
  captchaLimiter,
  getLoginCaptcha
);

// ------------------------------------------------------------
// REFRESH SESSION
//
// POST /api/auth/refresh
//
// Not activity-logged: apps refresh roughly every hour, which
// would flood the Log Trails with routine entries.
// ------------------------------------------------------------

router.post(
  '/refresh',
  refreshSession
);

// ------------------------------------------------------------
// FORGOT PASSWORD
// ------------------------------------------------------------

router.post(
  '/forgot-password',

  activityLog({
    action:
      'FORGOT_PASSWORD',

    module:
      'Authentication',

    successDescription:
      'User requested password recovery.',

    failureDescription:
      'Password recovery request failed.',

    entityType:
      'user_account',
  }),

  forgotPassword
);

// ------------------------------------------------------------
// VERIFY RECOVERY CODE
// ------------------------------------------------------------

router.post(
  '/verify-recovery-code',

  activityLog({
    action:
      'VERIFY_RECOVERY_CODE',

    module:
      'Authentication',

    successDescription:
      'User verified a password recovery code.',

    failureDescription:
      'Password recovery-code verification failed.',

    entityType:
      'user_account',
  }),

  verifyRecoveryCode
);

// ------------------------------------------------------------
// RESET PASSWORD
// ------------------------------------------------------------

router.post(
  '/reset-password',

  activityLog({
    action:
      'RESET_PASSWORD',

    module:
      'Authentication',

    successDescription:
      'User reset their account password.',

    failureDescription:
      'Password reset attempt failed.',

    entityType:
      'user_account',
  }),

  resetPassword
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// ------------------------------------------------------------
// LOGOUT
//
// Logger is before requireAuth so unsuccessful attempts are
// also visible in the audit trail.
// ------------------------------------------------------------

router.post(
  '/logout',

  activityLog({
    action:
      'LOGOUT',

    module:
      'Authentication',

    successDescription:
      'User logged out successfully.',

    failureDescription:
      'User logout attempt failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  logout
);

// ------------------------------------------------------------
// GET CURRENT USER
//
// USER CRUD:
// READ
// ------------------------------------------------------------

// Not logged: the apps load the profile on most screens, and
// reading your own profile isn't an action worth auditing.
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

  activityLog({
    action:
      'EDIT_PROFILE',

    module:
      'Profile',

    successDescription:
      'User edited their profile.',

    failureDescription:
      'Profile edit attempt failed.',

    entityType:
      'user_profile',

    metadata: ({
      req,
    }) => ({
      changed_fields:
        Object.keys(
          req.body ||
            {}
        ),
    }),
  }),

  requireAuth,

  updateProfile
);

// ============================================================
// ACCOUNT SECURITY
// ============================================================

// ------------------------------------------------------------
// CHANGE PASSWORD
// ------------------------------------------------------------

router.patch(
  '/me/password',

  activityLog({
    action:
      'CHANGE_PASSWORD',

    module:
      'Account Security',

    successDescription:
      'User changed their account password.',

    failureDescription:
      'Password change attempt failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  changePassword
);

// ------------------------------------------------------------
// CHANGE EMAIL
//
// The new address must be confirmed with a code first (see
// accountController.js):
//
// POST /me/email/request  current password + new email; sends
//                         the code
// POST /me/email/resend   a new code (60 s apart)
// POST /me/email/verify   the code; changes the email
// ------------------------------------------------------------

router.post(
  '/me/email/request',

  activityLog({
    action:
      'REQUEST_EMAIL_CHANGE',

    module:
      'Account Security',

    successDescription:
      'User asked to change their email address; a code was sent to the new address.',

    failureDescription:
      'Email change request failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  requestEmailChange
);

router.post(
  '/me/email/resend',

  activityLog({
    action:
      'RESEND_EMAIL_CHANGE_CODE',

    module:
      'Account Security',

    successDescription:
      'User requested a new email change code.',

    failureDescription:
      'Email change code resend failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  resendEmailChange
);

router.post(
  '/me/email/verify',

  activityLog({
    action:
      'CHANGE_EMAIL',

    module:
      'Account Security',

    successDescription:
      'User changed their account email address after confirming the code.',

    failureDescription:
      'Email change verification failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  verifyEmailChange
);

// ------------------------------------------------------------
// DEACTIVATE ACCOUNT
//
// DELETE /api/auth/me
// ------------------------------------------------------------

router.delete(
  '/me',

  activityLog({
    action:
      'DEACTIVATE_ACCOUNT',

    module:
      'Account Security',

    successDescription:
      'User deactivated their account.',

    failureDescription:
      'Account deactivation attempt failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  deactivateAccount
);

// ------------------------------------------------------------
// PERMANENTLY DELETE ACCOUNT
//
// DELETE /api/auth/me/permanent
// ------------------------------------------------------------

router.delete(
  '/me/permanent',

  activityLog({
    action:
      'DELETE_ACCOUNT',

    module:
      'Account Security',

    successDescription:
      'User permanently deleted their account.',

    failureDescription:
      'Permanent account deletion attempt failed.',

    entityType:
      'user_account',
  }),

  requireAuth,

  deleteAccountPermanently
);

// ============================================================
// PROFILE PHOTO
// ============================================================

// ------------------------------------------------------------
// UPLOAD / REPLACE PROFILE PHOTO
// ------------------------------------------------------------

router.post(
  '/profile-photo',

  activityLog({
    action:
      'UPDATE_PROFILE_PHOTO',

    module:
      'Profile',

    successDescription:
      'User updated their profile photo.',

    failureDescription:
      'Profile-photo update attempt failed.',

    entityType:
      'user_profile',
  }),

  requireAuth,

  handleProfilePhotoUpload,

  uploadProfilePhoto
);

// ------------------------------------------------------------
// REMOVE PROFILE PHOTO
// ------------------------------------------------------------

router.delete(
  '/profile-photo',

  activityLog({
    action:
      'DELETE_PROFILE_PHOTO',

    module:
      'Profile',

    successDescription:
      'User removed their profile photo.',

    failureDescription:
      'Profile-photo removal attempt failed.',

    entityType:
      'user_profile',
  }),

  requireAuth,

  deleteProfilePhoto
);

// ============================================================
// BLOOD TYPE (WITH PROOF)
// ============================================================

router.put(
  '/me/blood-type',
  activityLog({
    action:
      'UPDATE_BLOOD_TYPE',
    module:
      'Profile',
    successDescription:
      'User saved their blood type with proof.',
    failureDescription:
      'Blood type update attempt failed.',
    entityType:
      'user_profile',
  }),
  requireAuth,
  handleBloodTypeProofUpload,
  updateBloodType
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;