const {
  supabaseAdmin,
} = require('../config/supabase');

// ============================================================
// CONSTANTS
// ============================================================

const PROFILE_PHOTO_BUCKET =
  'profile-photos';

// ============================================================
// DETECT IMAGE TYPE
//
// We check the actual file bytes instead of trusting only
// the filename or MIME type sent by the client.
// ============================================================

function detectImageType(
  buffer
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 12
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // JPEG
  // FF D8 FF
  // ----------------------------------------------------------

  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      extension: 'jpg',
      contentType:
        'image/jpeg',
    };
  }

  // ----------------------------------------------------------
  // PNG
  // 89 50 4E 47 0D 0A 1A 0A
  // ----------------------------------------------------------

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      extension: 'png',
      contentType:
        'image/png',
    };
  }

  // ----------------------------------------------------------
  // WEBP
  //
  // RIFF....WEBP
  // ----------------------------------------------------------

  const riff =
    buffer
      .subarray(0, 4)
      .toString('ascii');

  const webp =
    buffer
      .subarray(8, 12)
      .toString('ascii');

  if (
    riff === 'RIFF' &&
    webp === 'WEBP'
  ) {
    return {
      extension: 'webp',
      contentType:
        'image/webp',
    };
  }

  return null;
}

// ============================================================
// EXTRACT STORAGE PATH FROM PUBLIC URL
// ============================================================

function getStoragePathFromUrl(
  url
) {
  if (
    !url ||
    typeof url !== 'string'
  ) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${PROFILE_PHOTO_BUCKET}/`;

  const markerIndex =
    url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const encodedPath =
    url
      .slice(
        markerIndex +
          marker.length
      )
      .split('?')[0];

  if (!encodedPath) {
    return null;
  }

  try {
    return decodeURIComponent(
      encodedPath
    );
  } catch {
    return encodedPath;
  }
}

// ============================================================
// POST /api/auth/profile-photo
// ============================================================

async function uploadProfilePhoto(
  req,
  res
) {
  let uploadedPath =
    null;

  try {
    // --------------------------------------------------------
    // FILE REQUIRED
    // --------------------------------------------------------

    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            'Please select a profile photo.',
        });
    }

    if (!req.file.buffer) {
      return res
        .status(400)
        .json({
          error:
            'Unable to read the uploaded image.',
        });
    }

    // --------------------------------------------------------
    // VALIDATE ACTUAL FILE TYPE
    // --------------------------------------------------------

    const imageType =
      detectImageType(
        req.file.buffer
      );

    if (!imageType) {
      return res
        .status(400)
        .json({
          error:
            'Profile photo must be a JPG, PNG, or WEBP image.',
        });
    }

    // --------------------------------------------------------
    // USER
    // --------------------------------------------------------

    const userId =
      req.dbUser?.id;

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unable to identify the authenticated user.',
        });
    }

    const oldPhotoUrl =
      req.dbUser
        ?.profile_photo_url ||
      null;

    // --------------------------------------------------------
    // STORAGE PATH
    //
    // Every user's photos stay inside their own folder.
    // --------------------------------------------------------

    uploadedPath =
      `${userId}/profile-${Date.now()}.${imageType.extension}`;

    // --------------------------------------------------------
    // UPLOAD TO SUPABASE STORAGE
    // --------------------------------------------------------

    const {
      error: uploadError,
    } =
      await supabaseAdmin
        .storage
        .from(
          PROFILE_PHOTO_BUCKET
        )
        .upload(
          uploadedPath,
          req.file.buffer,
          {
            contentType:
              imageType
                .contentType,

            cacheControl:
              '3600',

            upsert:
              false,
          }
        );

    if (uploadError) {
      console.error(
        'PROFILE PHOTO STORAGE UPLOAD ERROR:',
        uploadError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to upload profile photo.',
        });
    }

    // --------------------------------------------------------
    // PUBLIC URL
    // --------------------------------------------------------

    const {
      data: publicUrlData,
    } =
      supabaseAdmin
        .storage
        .from(
          PROFILE_PHOTO_BUCKET
        )
        .getPublicUrl(
          uploadedPath
        );

    const publicUrl =
      publicUrlData
        ?.publicUrl;

    if (!publicUrl) {
      await supabaseAdmin
        .storage
        .from(
          PROFILE_PHOTO_BUCKET
        )
        .remove([
          uploadedPath,
        ]);

      return res
        .status(500)
        .json({
          error:
            'Unable to create profile photo URL.',
        });
    }

    // --------------------------------------------------------
    // SAVE URL TO USERS TABLE
    // --------------------------------------------------------

    const {
      data: updatedUser,
      error: updateError,
    } =
      await supabaseAdmin
        .from('users')
        .update({
          profile_photo_url:
            publicUrl,
        })
        .eq(
          'id',
          userId
        )
        .select('*')
        .single();

    if (
      updateError ||
      !updatedUser
    ) {
      console.error(
        'PROFILE PHOTO DATABASE UPDATE ERROR:',
        updateError
      );

      // Delete newly uploaded file because DB update failed.

      await supabaseAdmin
        .storage
        .from(
          PROFILE_PHOTO_BUCKET
        )
        .remove([
          uploadedPath,
        ]);

      return res
        .status(500)
        .json({
          error:
            'Unable to save profile photo.',
        });
    }

    // --------------------------------------------------------
    // REMOVE OLD PHOTO
    //
    // Do this only after the new photo and DB update succeed.
    // --------------------------------------------------------

    const oldPhotoPath =
      getStoragePathFromUrl(
        oldPhotoUrl
      );

    if (
      oldPhotoPath &&
      oldPhotoPath !==
        uploadedPath
    ) {
      const {
        error: removeOldError,
      } =
        await supabaseAdmin
          .storage
          .from(
            PROFILE_PHOTO_BUCKET
          )
          .remove([
            oldPhotoPath,
          ]);

      if (removeOldError) {
        // Not fatal.
        // The new photo is already valid and stored.
        console.error(
          'OLD PROFILE PHOTO REMOVE ERROR:',
          removeOldError
        );
      }
    }

    return res
      .status(200)
      .json({
        message:
          'Profile photo updated successfully.',

        profile_photo_url:
          publicUrl,

        user:
          updatedUser,
      });
  } catch (error) {
    console.error(
      'UPLOAD PROFILE PHOTO ERROR:',
      error
    );

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    if (uploadedPath) {
      try {
        await supabaseAdmin
          .storage
          .from(
            PROFILE_PHOTO_BUCKET
          )
          .remove([
            uploadedPath,
          ]);
      } catch (
        cleanupError
      ) {
        console.error(
          'PROFILE PHOTO CLEANUP ERROR:',
          cleanupError
        );
      }
    }

    return res
      .status(500)
      .json({
        error:
          'Profile photo upload failed.',
      });
  }
}

// ============================================================
// DELETE /api/auth/profile-photo
// ============================================================

async function deleteProfilePhoto(
  req,
  res
) {
  try {
    const userId =
      req.dbUser?.id;

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unable to identify the authenticated user.',
        });
    }

    const currentPhotoUrl =
      req.dbUser
        ?.profile_photo_url ||
      null;

    // --------------------------------------------------------
    // NOTHING TO REMOVE
    // --------------------------------------------------------

    if (!currentPhotoUrl) {
      return res
        .status(200)
        .json({
          message:
            'No profile photo to remove.',

          profile_photo_url:
            null,

          user: {
            ...req.dbUser,

            profile_photo_url:
              null,
          },
        });
    }

    // --------------------------------------------------------
    // CLEAR DATABASE FIRST
    //
    // If storage cleanup fails afterward, only an unused file
    // remains. The user's profile will still be correct.
    // --------------------------------------------------------

    const {
      data: updatedUser,
      error: updateError,
    } =
      await supabaseAdmin
        .from('users')
        .update({
          profile_photo_url:
            null,
        })
        .eq(
          'id',
          userId
        )
        .select('*')
        .single();

    if (
      updateError ||
      !updatedUser
    ) {
      console.error(
        'PROFILE PHOTO DELETE DATABASE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to remove profile photo.',
        });
    }

    // --------------------------------------------------------
    // REMOVE STORAGE OBJECT
    // --------------------------------------------------------

    const storagePath =
      getStoragePathFromUrl(
        currentPhotoUrl
      );

    if (storagePath) {
      const {
        error: storageError,
      } =
        await supabaseAdmin
          .storage
          .from(
            PROFILE_PHOTO_BUCKET
          )
          .remove([
            storagePath,
          ]);

      if (storageError) {
        console.error(
          'PROFILE PHOTO STORAGE DELETE ERROR:',
          storageError
        );
      }
    }

    return res
      .status(200)
      .json({
        message:
          'Profile photo removed successfully.',

        profile_photo_url:
          null,

        user:
          updatedUser,
      });
  } catch (error) {
    console.error(
      'DELETE PROFILE PHOTO ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to remove profile photo.',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  uploadProfilePhoto,
  deleteProfilePhoto,
};