const {
  supabaseAdmin
} = require('../config/supabase');

// ============================================================
// AUTHENTICATED USER
// ============================================================

function getAuthenticatedUserId(req) {
  return (
    req.user?.id ||
    req.authUser?.id ||
    req.dbUser?.id ||
    null
  );
}

// ============================================================
// REQUIRE APPROVED DONOR
//
// This protects actions such as:
// POST /api/requests/:id/respond
//
// A normal Hemo-Hero account is NOT enough.
// The donor application must be approved.
// ============================================================

async function requireApprovedDonor(
  req,
  res,
  next
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          error:
            'Unauthorized'
        });
    }

    const {
      data:
        donorApplication,
      error
    } =
      await supabaseAdmin
        .from(
          'donor_applications'
        )
        .select(`
          id,
          user_id,
          blood_type,
          availability_status,
          allow_urgent_requests,
          status,
          submitted_at,
          reviewed_at
        `)
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (error) {
      console.error(
        'DONOR VERIFICATION ERROR:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify donor status.'
        });
    }

    // --------------------------------------------------------
    // NO APPLICATION
    // --------------------------------------------------------

    if (!donorApplication) {
      return res
        .status(403)
        .json({
          error:
            'Donor registration is required before responding to blood requests.',

          donor_status:
            'not_registered'
        });
    }

    // --------------------------------------------------------
    // PENDING
    // --------------------------------------------------------

    if (
      donorApplication.status ===
      'pending'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Your donor application is still under review.',

          donor_status:
            'pending'
        });
    }

    // --------------------------------------------------------
    // REJECTED
    // --------------------------------------------------------

    if (
      donorApplication.status ===
      'rejected'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Your donor application has not been approved.',

          donor_status:
            'rejected'
        });
    }

    // --------------------------------------------------------
    // WITHDRAWN
    // --------------------------------------------------------

    if (
      donorApplication.status ===
      'withdrawn'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Your donor application has been withdrawn.',

          donor_status:
            'withdrawn'
        });
    }

    // --------------------------------------------------------
    // MUST BE APPROVED
    // --------------------------------------------------------

    if (
      donorApplication.status !==
      'approved'
    ) {
      return res
        .status(403)
        .json({
          error:
            'An approved donor account is required.',

          donor_status:
            donorApplication.status
        });
    }

    // --------------------------------------------------------
    // ATTACH DONOR INFORMATION TO REQUEST
    // --------------------------------------------------------

    req.donorApplication =
      donorApplication;

    next();
  } catch (error) {
    console.error(
      'REQUIRE APPROVED DONOR ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  requireApprovedDonor
};