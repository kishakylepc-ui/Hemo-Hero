const {
  supabaseAdmin,
} = require('../config/supabase');

const {
  createNotification,
} = require('../services/notificationService');

const {
  setActivityEntity,
} = require(
  '../middleware/activityLogMiddleware'
);

// ============================================================
// CONSTANTS
// ============================================================

const VERIFICATION_BUCKET =
  'donor-verification';

const SIGNED_URL_EXPIRES_IN =
  300;

const VALID_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'withdrawn',
];

// ============================================================
// SAFE USER PROFILE
// ============================================================

function buildSafeUserProfile(user) {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    email:
      user.email ?? null,

    first_name:
      user.first_name ?? null,

    middle_name:
      user.middle_name ?? null,

    last_name:
      user.last_name ?? null,

    suffix:
      user.suffix ?? null,

    phone:
      user.phone ?? null,

    date_of_birth:
      user.date_of_birth ?? null,

    gender:
      user.gender ?? null,

    blood_type:
      user.blood_type ?? null,

    city:
      user.city ?? null,

    province:
      user.province ?? null,

    role:
      user.role ?? null,
  };
}

// ============================================================
// ENRICH APPLICATIONS WITH PUBLIC.USERS
// ============================================================

async function attachUsersToApplications(
  applications
) {
  if (
    !Array.isArray(applications) ||
    applications.length === 0
  ) {
    return [];
  }

  const userIds = [
    ...new Set(
      applications
        .map(
          application =>
            application.user_id
        )
        .filter(Boolean)
    ),
  ];

  if (
    userIds.length === 0
  ) {
    return applications.map(
      application => ({
        ...application,

        user:
          null,
      })
    );
  }

  const {
    data: users,
    error: usersError,
  } =
    await supabaseAdmin
      .from('users')
      .select('*')
      .in(
        'id',
        userIds
      );

  if (usersError) {
    console.error(
      'ADMIN DONOR USERS FETCH ERROR:',
      usersError
    );

    throw new Error(
      'Unable to load donor profile information.'
    );
  }

  const userMap =
    new Map();

  for (
    const user of users || []
  ) {
    userMap.set(
      user.id,
      buildSafeUserProfile(
        user
      )
    );
  }

  return applications.map(
    application => ({
      ...application,

      user:
        userMap.get(
          application.user_id
        ) || null,
    })
  );
}

// ============================================================
// GET SUMMARY
// ============================================================

async function getDonorApplicationSummary(
  req,
  res
) {
  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(
          'status'
        );

    if (error) {
      console.error(
        'ADMIN DONOR SUMMARY ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor application summary.',
        });
    }

    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
    };

    for (
      const application of
        data || []
    ) {
      summary.total += 1;

      if (
        application.status ===
        'pending'
      ) {
        summary.pending +=
          1;
      }

      if (
        application.status ===
        'approved'
      ) {
        summary.approved +=
          1;
      }

      if (
        application.status ===
        'rejected'
      ) {
        summary.rejected +=
          1;
      }

      if (
        application.status ===
        'withdrawn'
      ) {
        summary.withdrawn +=
          1;
      }
    }

    return res.json({
      summary,
    });
  } catch (error) {
    console.error(
      'ADMIN DONOR SUMMARY SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// GET APPLICATIONS
// ============================================================

async function getDonorApplications(
  req,
  res
) {
  try {
    const {
      status,
    } = req.query;

    if (
      status &&
      !VALID_STATUSES.includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Invalid donor application status.',
        });
    }

    let query =
      supabaseAdmin
        .from(
          'donor_applications'
        )
        .select('*')
        .order(
          'submitted_at',
          {
            ascending:
              false,
          }
        );

    if (status) {
      query =
        query.eq(
          'status',
          status
        );
    }

    const {
      data:
        applications,
      error,
    } =
      await query;

    if (error) {
      console.error(
        'ADMIN DONOR APPLICATIONS ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor applications.',
        });
    }

    const enrichedApplications =
      await attachUsersToApplications(
        applications || []
      );

    return res.json({
      applications:
        enrichedApplications,
    });
  } catch (error) {
    console.error(
      'ADMIN DONOR APPLICATIONS SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Internal server error.',
      });
  }
}

// ============================================================
// GET APPLICATION BY ID
// ============================================================

async function getDonorApplicationById(
  req,
  res
) {
  try {
    const {
      id,
    } = req.params;

    const {
      data:
        application,
      error:
        applicationError,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select('*')
        .eq(
          'id',
          id
        )
        .maybeSingle();

    if (
      applicationError
    ) {
      console.error(
        'ADMIN DONOR APPLICATION DETAIL ERROR:',
        applicationError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor application.',
        });
    }

    if (!application) {
      return res
        .status(404)
        .json({
          error:
            'Donor application not found.',
        });
    }

    // ========================================================
    // USER PROFILE
    // ========================================================

    const {
      data: user,
      error: userError,
    } =
      await supabaseAdmin
        .from('users')
        .select('*')
        .eq(
          'id',
          application.user_id
        )
        .maybeSingle();

    if (userError) {
      console.error(
        'ADMIN DONOR USER DETAIL ERROR:',
        userError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor profile.',
        });
    }

    // ========================================================
    // VERIFICATION ID SIGNED URL
    // ========================================================

    let verification = {
      available:
        false,

      url:
        null,

      expires_in_seconds:
        SIGNED_URL_EXPIRES_IN,
    };

    if (
      application.verification_id_path
    ) {
      const {
        data:
          signedUrlData,
        error:
          signedUrlError,
      } =
        await supabaseAdmin
          .storage
          .from(
            VERIFICATION_BUCKET
          )
          .createSignedUrl(
            application
              .verification_id_path,

            SIGNED_URL_EXPIRES_IN
          );

      if (
        signedUrlError
      ) {
        console.error(
          'ADMIN VERIFICATION SIGNED URL ERROR:',
          signedUrlError
        );
      } else {
        verification = {
          available:
            true,

          url:
            signedUrlData
              ?.signedUrl ||
            null,

          expires_in_seconds:
            SIGNED_URL_EXPIRES_IN,
        };
      }
    }

    return res.json({
      application: {
        ...application,

        user:
          buildSafeUserProfile(
            user
          ),

        verification,
      },
    });
  } catch (error) {
    console.error(
      'ADMIN DONOR DETAIL SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// APPROVE APPLICATION
// ============================================================

async function approveDonorApplication(
  req,
  res
) {
  try {
    const {
      id,
    } = req.params;

    const adminId =
      req.dbUser?.id;

    const {
      admin_note,
    } = req.body || {};

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Set immediately so even a failed approval attempt
    // points to the donor application that was targeted.
    // --------------------------------------------------------

    if (id) {
      setActivityEntity(
        res,
        'donor_application',
        id
      );
    }

    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------

    if (!adminId) {
      return res
        .status(401)
        .json({
          error:
            'Administrator profile not found.',
        });
    }

    // --------------------------------------------------------
    // ADMIN NOTE
    // --------------------------------------------------------

    if (
      admin_note &&
      String(
        admin_note
      ).trim().length >
        500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Admin note must be 500 characters or fewer.',
        });
    }

    // --------------------------------------------------------
    // LOAD APPLICATION
    // --------------------------------------------------------

    const {
      data:
        existing,
      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(
          `
            id,
            user_id,
            blood_type,
            status
          `
        )
        .eq(
          'id',
          id
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        'ADMIN APPROVE FETCH ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor application.',
        });
    }

    if (!existing) {
      return res
        .status(404)
        .json({
          error:
            'Donor application not found.',
        });
    }

    // --------------------------------------------------------
    // CONFIRM ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      existing.id
    );

    // --------------------------------------------------------
    // MUST STILL BE PENDING
    // --------------------------------------------------------

    if (
      existing.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only pending donor applications can be approved.',
        });
    }

    // --------------------------------------------------------
    // USER ID REQUIRED
    // --------------------------------------------------------

    if (
      !existing.user_id
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor application is not connected to a user account.',
        });
    }

    // --------------------------------------------------------
    // BLOOD TYPE REQUIRED
    // --------------------------------------------------------

    const verifiedBloodType =
      String(
        existing.blood_type ||
        ''
      )
        .trim()
        .toUpperCase();

    if (
      !verifiedBloodType
    ) {
      return res
        .status(409)
        .json({
          error:
            'This donor application cannot be approved because no blood type is recorded.',
        });
    }

    const now =
      new Date()
        .toISOString();

    const cleanAdminNote =
      admin_note
        ? String(
            admin_note
          ).trim()
        : null;

    // --------------------------------------------------------
    // APPROVE DONOR APPLICATION
    // --------------------------------------------------------

    const {
      data:
        updated,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .update({
          status:
            'approved',

          admin_note:
            cleanAdminNote,

          reviewed_by:
            adminId,

          reviewed_at:
            now,

          updated_at:
            now,
        })
        .eq(
          'id',
          id
        )
        .eq(
          'status',
          'pending'
        )
        .select('*')
        .maybeSingle();

    if (updateError) {
      console.error(
        'ADMIN APPROVE UPDATE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to approve donor application.',
        });
    }

    if (!updated) {
      return res
        .status(409)
        .json({
          error:
            'The donor application is no longer pending.',
        });
    }

    // --------------------------------------------------------
    // CONFIRM UPDATED ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      updated.id
    );

    // ========================================================
    // SYNC VERIFIED BLOOD TYPE TO USERS TABLE
    // ========================================================

    const {
      data:
        updatedUser,
      error:
        userUpdateError,
    } =
      await supabaseAdmin
        .from('users')
        .update({
          blood_type:
            verifiedBloodType,
        })
        .eq(
          'id',
          existing.user_id
        )
        .select('*')
        .maybeSingle();

    // ========================================================
    // BLOOD TYPE SYNC FAILED
    // ========================================================

    if (
      userUpdateError ||
      !updatedUser
    ) {
      console.error(
        'ADMIN DONOR BLOOD TYPE SYNC ERROR:',
        userUpdateError ||
          'User profile not found.'
      );

      const rollbackTime =
        new Date()
          .toISOString();

      const {
        error:
          rollbackError,
      } =
        await supabaseAdmin
          .from(
            'donor_applications'
          )
          .update({
            status:
              'pending',

            admin_note:
              null,

            reviewed_by:
              null,

            reviewed_at:
              null,

            updated_at:
              rollbackTime,
          })
          .eq(
            'id',
            id
          )
          .eq(
            'status',
            'approved'
          );

      if (
        rollbackError
      ) {
        console.error(
          'CRITICAL: DONOR APPROVAL ROLLBACK ERROR:',
          rollbackError
        );

        return res
          .status(500)
          .json({
            error:
              'The donor application was approved, but the verified blood type could not be synchronized to the user profile. Manual review is required.',
          });
      }

      return res
        .status(500)
        .json({
          error:
            'Unable to synchronize the verified blood type with the donor profile. The approval was cancelled. Please try again.',
        });
    }

    // ========================================================
    // NOTIFY DONOR
    // ========================================================

    await createNotification({
      userId:
        existing.user_id,

      type:
        'donor_application_approved',

      title:
        'Donor Application Approved',

      message:
        `Your donor application has been approved. Your verified blood type is ${verifiedBloodType}. You can now respond to compatible blood requests.`,

      data: {
        application_id:
          updated.id,

        status:
          'approved',

        blood_type:
          verifiedBloodType,

        admin_note:
          cleanAdminNote,
      },
    });

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.json({
      message:
        'Donor application approved successfully.',

      application:
        updated,

      user:
        buildSafeUserProfile(
          updatedUser
        ),
    });
  } catch (error) {
    console.error(
      'ADMIN APPROVE SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// REJECT APPLICATION
// ============================================================

async function rejectDonorApplication(
  req,
  res
) {
  try {
    const {
      id,
    } = req.params;

    const adminId =
      req.dbUser?.id;

    const {
      admin_note,
    } = req.body || {};

    // --------------------------------------------------------
    // ACTIVITY ENTITY
    //
    // Set immediately so both successful and failed attempts
    // retain the targeted donor application ID.
    // --------------------------------------------------------

    if (id) {
      setActivityEntity(
        res,
        'donor_application',
        id
      );
    }

    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------

    if (!adminId) {
      return res
        .status(401)
        .json({
          error:
            'Administrator profile not found.',
        });
    }

    // --------------------------------------------------------
    // REJECTION REASON
    // --------------------------------------------------------

    const cleanNote =
      String(
        admin_note || ''
      ).trim();

    if (!cleanNote) {
      return res
        .status(400)
        .json({
          error:
            'A rejection reason is required.',
        });
    }

    if (
      cleanNote.length >
      500
    ) {
      return res
        .status(400)
        .json({
          error:
            'Admin note must be 500 characters or fewer.',
        });
    }

    // --------------------------------------------------------
    // LOAD APPLICATION
    // --------------------------------------------------------

    const {
      data:
        existing,
      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(
          `
            id,
            user_id,
            blood_type,
            status
          `
        )
        .eq(
          'id',
          id
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        'ADMIN REJECT FETCH ERROR:',
        existingError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to load donor application.',
        });
    }

    if (!existing) {
      return res
        .status(404)
        .json({
          error:
            'Donor application not found.',
        });
    }

    // --------------------------------------------------------
    // CONFIRM ACTIVITY ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      existing.id
    );

    // --------------------------------------------------------
    // ONLY PENDING CAN BE REJECTED
    // --------------------------------------------------------

    if (
      existing.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          error:
            'Only pending donor applications can be rejected.',
        });
    }

    const now =
      new Date()
        .toISOString();

    // --------------------------------------------------------
    // REJECT
    // --------------------------------------------------------

    const {
      data:
        updated,
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .update({
          status:
            'rejected',

          admin_note:
            cleanNote,

          reviewed_by:
            adminId,

          reviewed_at:
            now,

          updated_at:
            now,
        })
        .eq(
          'id',
          id
        )
        .eq(
          'status',
          'pending'
        )
        .select('*')
        .maybeSingle();

    if (updateError) {
      console.error(
        'ADMIN REJECT UPDATE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to reject donor application.',
        });
    }

    if (!updated) {
      return res
        .status(409)
        .json({
          error:
            'The donor application is no longer pending.',
        });
    }

    // --------------------------------------------------------
    // CONFIRM UPDATED ENTITY
    // --------------------------------------------------------

    setActivityEntity(
      res,
      'donor_application',
      updated.id
    );

    // ========================================================
    // NOTIFY DONOR
    // ========================================================

    if (
      existing.user_id
    ) {
      await createNotification({
        userId:
          existing.user_id,

        type:
          'donor_application_rejected',

        title:
          'Donor Application Update',

        message:
          `Your donor application was not approved. Reason: ${cleanNote}`,

        data: {
          application_id:
            updated.id,

          status:
            'rejected',

          blood_type:
            existing.blood_type ||
            null,

          admin_note:
            cleanNote,
        },
      });
    } else {
      console.warn(
        'DONOR REJECTION NOTIFICATION SKIPPED: application has no user_id:',
        id
      );
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return res.json({
      message:
        'Donor application rejected successfully.',

      application:
        updated,
    });
  } catch (error) {
    console.error(
      'ADMIN REJECT SERVER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error.',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getDonorApplicationSummary,

  getDonorApplications,

  getDonorApplicationById,

  approveDonorApplication,

  rejectDonorApplication,
};