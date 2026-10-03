const {
  supabaseAdmin
} = require(
  '../config/supabase'
);

const {
  setActivityEntity
} = require(
  '../middleware/activityLogMiddleware'
);

const {
  normalizeBloodType
} = require(
  '../utils/bloodCompatibility'
);

const {
  saveBloodTypeProof
} = require(
  '../services/bloodTypeProofService'
);

// ============================================================
// PUT /api/auth/me/blood-type
//
// Sets the user's blood type together with a photo that proves
// it (multipart: blood_type + proof). A blood type can't be set
// without proof; people who don't know theirs get tested first.
// ============================================================

async function updateBloodType(
  req,
  res
) {
  try {
    const user =
      req.dbUser;

    if (!user) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const bloodType =
      normalizeBloodType(
        req.body
          ?.blood_type
      );

    if (!bloodType) {
      return res
        .status(400)
        .json({
          error:
            'Please choose a valid blood type.'
        });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            'Add a photo that shows your blood type.'
        });
    }

    let proof;

    try {
      proof =
        await saveBloodTypeProof(
          user.id,
          req.file
        );
    } catch (uploadError) {
      console.error(
        'BLOOD TYPE PROOF UPLOAD ERROR:',
        uploadError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to upload the blood type proof.'
        });
    }

    const {
      data,
      error
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          blood_type:
            bloodType,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          user.id
        )
        .select(
          '*'
        )
        .single();

    if (error) {
      console.error(
        'UPDATE BLOOD TYPE ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to save your blood type.'
        });
    }

    setActivityEntity(
      res,
      'user_profile',
      user.id
    );

    return res
      .status(200)
      .json({
        message:
          'Blood type saved.',

        user: {
          ...data,

          blood_type_proof: {
            uploaded_at:
              proof.uploaded_at
          }
        }
      });
  } catch (error) {
    console.error(
      'UPDATE BLOOD TYPE CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to save your blood type.'
      });
  }
}

module.exports = {
  updateBloodType
};
