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
  uploadVerificationId,
  submitDonorApplication,
  withdrawDonorApplication
} =
  require('../controllers/donorApplicationController');

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
// GET MY APPLICATION
// ============================================================

router.get(
  '/me',
  getMyDonorApplication
);

// ============================================================
// UPLOAD VERIFICATION ID
// ============================================================

router.post(
  '/verification-id',
  upload.single(
    'file'
  ),
  uploadVerificationId
);

// ============================================================
// SUBMIT APPLICATION
// ============================================================

router.post(
  '/apply',
  submitDonorApplication
);

// ============================================================
// WITHDRAW APPLICATION
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

    if (error) {
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