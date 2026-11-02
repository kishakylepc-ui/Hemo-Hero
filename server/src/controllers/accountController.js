const {
  isAdminRole
} = require(
  '../utils/roles'
);

const {
  supabaseAnon,
  supabaseAdmin,
} = require(
  '../config/supabase'
);

const {
  isMissingMigration,
} = require(
  '../services/accountReviewService'
);

// ============================================================
// ACTIVITY LOG HELPERS
// ============================================================

const {
  setActivityUser,
  setActivityEntity,
  setActivityOutcome,
} = require(
  '../middleware/activityLogMiddleware'
);

// 10-minute codes, 5 wrong tries, 60 s between codes.
const {
  OTP_TTL_MS,
  OTP_RESEND_WAIT_MS,
  getResendBlock,
  recordCodeSent,
  getVerifyBlock,
  recordWrongCode,
  recordCodeUsed,
} = require(
  '../services/otpGuardService'
);

const {
  releaseDeactivatedAccount,
} = require(
  '../services/accountReleaseService'
);

// ============================================================
// HELPERS
// ============================================================

function cleanText(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

// ============================================================
// EMAIL VALIDATION
// ============================================================

function validateEmail(
  email
) {
  const cleanEmail =
    cleanText(
      email
    ).toLowerCase();

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(
      cleanEmail
    )
  ) {
    return {
      valid: false,

      error:
        'Please enter a valid email address.',
    };
  }

  return {
    valid: true,

    value:
      cleanEmail,
  };
}

// ============================================================
// PASSWORD VALIDATION
// ============================================================

function validatePassword(
  password
) {
  if (
    typeof password !==
    'string'
  ) {
    return {
      valid: false,

      error:
        'Password must be text.',
    };
  }

  if (
    password.length < 8
  ) {
    return {
      valid: false,

      error:
        'Password must be at least 8 characters.',
    };
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one lowercase letter.',
    };
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one uppercase letter.',
    };
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one number.',
    };
  }

  if (
    !/[^A-Za-z0-9]/.test(
      password
    )
  ) {
    return {
      valid: false,

      error:
        'Password must contain at least one special character.',
    };
  }

  return {
    valid: true,
  };
}

// ============================================================
// VERIFY CURRENT PASSWORD
// ============================================================

async function verifyCurrentPassword(
  email,
  password
) {
  try {
    const {
      data,
      error,
    } =
      await supabaseAnon
        .auth
        .signInWithPassword({
          email,
          password,
        });

    if (
      error ||
      !data?.user
    ) {
      return {
        valid: false,
      };
    }

    return {
      valid: true,
    };
  } catch (
    error
  ) {
    console.error(
      'CURRENT PASSWORD VERIFICATION ERROR:',
      error
    );

    return {
      valid: false,
    };
  }
}

// ============================================================
// SET CURRENT ACCOUNT ACTIVITY
// ============================================================

function setCurrentAccountActivity(
  req,
  res
) {
  if (
    !req?.dbUser
  ) {
    return;
  }

  setActivityUser(
    res,
    {
      id:
        req.dbUser.id,

      email:
        req.dbUser.email,

      role:
        req.dbUser.role,
    }
  );

  setActivityEntity(
    res,
    'user_account',
    req.dbUser.id
  );
}

// ============================================================
// PATCH /api/auth/me/password
//
// CHANGE PASSWORD
// ============================================================

async function changePassword(
  req,
  res
) {
  try {
    if (
      !req.dbUser?.id ||
      !req.dbUser?.email
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setCurrentAccountActivity(
      req,
      res
    );

    const {
      current_password,
      new_password,
      confirm_password,
    } =
      req.body || {};

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (
      !current_password ||
      !new_password ||
      !confirm_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'Current password, new password, and confirm password are required.',

          code:
            'PASSWORD_FIELDS_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // CONFIRM PASSWORD
    // --------------------------------------------------------

    if (
      new_password !==
      confirm_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'New password and confirm password do not match.',

          code:
            'PASSWORDS_DO_NOT_MATCH',
        });
    }

    // --------------------------------------------------------
    // NEW PASSWORD MUST BE DIFFERENT
    // --------------------------------------------------------

    if (
      current_password ===
      new_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'Your new password must be different from your current password.',

          code:
            'PASSWORD_UNCHANGED',
        });
    }

    // --------------------------------------------------------
    // PASSWORD POLICY
    // --------------------------------------------------------

    const validation =
      validatePassword(
        new_password
      );

    if (
      !validation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error,

          code:
            'INVALID_PASSWORD',
        });
    }

    // --------------------------------------------------------
    // VERIFY CURRENT PASSWORD
    // --------------------------------------------------------

    const verification =
      await verifyCurrentPassword(
        req.dbUser.email,
        current_password
      );

    if (
      !verification.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            'Your current password is incorrect.',

          code:
            'CURRENT_PASSWORD_INCORRECT',
        });
    }

    // --------------------------------------------------------
    // UPDATE AUTH PASSWORD
    // --------------------------------------------------------

    const {
      error:
        passwordError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .updateUserById(
          req.dbUser.id,
          {
            password:
              new_password,
          }
        );

    if (
      passwordError
    ) {
      console.error(
        'CHANGE PASSWORD ERROR:',
        passwordError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to change your password.',

          code:
            'PASSWORD_UPDATE_FAILED',
        });
    }

    // --------------------------------------------------------
    // REVOKE CURRENT SESSION
    // --------------------------------------------------------

    if (
      req.authToken
    ) {
      try {
        await supabaseAdmin
          .auth
          .admin
          .signOut(
            req.authToken
          );
      } catch (
        signOutError
      ) {
        console.error(
          'CHANGE PASSWORD SIGNOUT ERROR:',
          signOutError
        );
      }
    }

    return res
      .status(200)
      .json({
        message:
          'Password changed successfully. Please sign in again.',

        requires_relogin:
          true,
      });
  } catch (
    error
  ) {
    console.error(
      'CHANGE PASSWORD CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to change your password.',

        code:
          'PASSWORD_UPDATE_FAILED',
      });
  }
}

// ============================================================
// CHANGE EMAIL (verified with a code)
//
// 1. POST /api/auth/me/email/request
//    { current_password, new_email, confirm_email }
//    Supabase emails a 6-digit code to the new address, and
//    another to the current address when its "Secure email
//    change" setting is on. Nothing changes yet.
//
// 2. POST /api/auth/me/email/verify
//    { new_email, code, target: 'new' | 'current' }
//    Once every code is confirmed the email changes, every
//    session ends, and the person signs in with the new email.
//
// 3. POST /api/auth/me/email/resend { new_email }
//    New codes, at most one a minute.
//
// Codes follow otpGuardService.js (10 minutes, 5 tries, one
// use). Supabase's "Change Email Address" template must show
// {{ .Token }} (see server/README.md).
// ============================================================

// Starts a Supabase email change for the signed-in user, which
// emails the codes. Returns { ok } or { ok: false, status, body }.
async function startAuthEmailChange(
  accessToken,
  newEmail
) {
  const failed = {
    ok: false,

    status:
      502,

    body: {
      error:
        'Unable to send the verification code. Please try again.',

      code:
        'EMAIL_CODE_SEND_FAILED',
    },
  };

  try {
    const response =
      await fetch(
        `${process.env.SUPABASE_URL}/auth/v1/user`,
        {
          method:
            'PUT',

          headers: {
            apikey:
              process.env
                .SUPABASE_ANON_KEY,

            Authorization:
              `Bearer ${accessToken}`,

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              email:
                newEmail,
            }),
        }
      );

    if (response.ok) {
      return {
        ok: true,
      };
    }

    const data =
      await response
        .json()
        .catch(() => null);

    const message =
      String(
        data?.msg ||
          data?.message ||
          data?.error_description ||
          ''
      );

    console.error(
      'EMAIL CHANGE SUPABASE ERROR:',
      response.status,
      data?.error_code,
      message
    );

    if (
      data?.error_code ===
        'email_exists' ||
      /already/i.test(
        message
      )
    ) {
      return {
        ok: false,

        status:
          409,

        body: {
          error:
            'An account with this email already exists.',

          code:
            'EMAIL_ALREADY_EXISTS',
        },
      };
    }

    // Supabase's own limit on how often it sends emails.
    if (
      response.status ===
      429
    ) {
      const seconds =
        Number(
          (message.match(
            /after (\d+) seconds?/i
          ) || [])[1]
        ) || 60;

      return {
        ok: false,

        status:
          429,

        body: {
          error:
            `Please wait ${seconds} seconds before requesting another code.`,

          code:
            'OTP_RESEND_COOLDOWN',

          retry_after_seconds:
            seconds,
        },
      };
    }

    return failed;
  } catch (error) {
    console.error(
      'EMAIL CHANGE REQUEST ERROR:',
      error
    );

    return failed;
  }
}

// The Supabase account, for the pending change (new_email).
async function getAuthAccount(
  userId
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .auth
      .admin
      .getUserById(
        userId
      );

  if (error) {
    console.error(
      'AUTH ACCOUNT LOOKUP ERROR:',
      error.message
    );

    return null;
  }

  return data?.user ||
    null;
}

function sendReply(
  res,
  reply
) {
  return res
    .status(
      reply.status
    )
    .json(
      reply.body
    );
}

// Codes are on their way to both addresses (the current one
// only gets one when Supabase's secure email change is on).
async function recordEmailChangeCodesSent(
  newEmail,
  currentEmail
) {
  await recordCodeSent(
    'email_change',
    newEmail
  );

  await recordCodeSent(
    'email_change',
    currentEmail
  );
}

// ------------------------------------------------------------
// POST /api/auth/me/email/request
// ------------------------------------------------------------

async function requestEmailChange(
  req,
  res
) {
  try {
    if (
      !req.dbUser?.id ||
      !req.dbUser?.email ||
      !req.authToken
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    setCurrentAccountActivity(
      req,
      res
    );

    const {
      current_password,
      new_email,
      confirm_email,
    } =
      req.body || {};

    // --------------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------------

    if (
      !current_password ||
      !new_email ||
      !confirm_email
    ) {
      return res
        .status(400)
        .json({
          error:
            'Current password, new email, and confirm email are required.',

          code:
            'EMAIL_FIELDS_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------------

    const validation =
      validateEmail(
        new_email
      );

    if (
      !validation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error,

          code:
            'INVALID_EMAIL',
        });
    }

    const cleanEmail =
      validation.value;

    if (
      cleanEmail !==
      cleanText(
        confirm_email
      ).toLowerCase()
    ) {
      return res
        .status(400)
        .json({
          error:
            'New email and confirm email do not match.',

          code:
            'EMAILS_DO_NOT_MATCH',
        });
    }

    const currentEmail =
      String(
        req.dbUser.email
      )
        .trim()
        .toLowerCase();

    if (
      cleanEmail ===
      currentEmail
    ) {
      return res
        .status(400)
        .json({
          error:
            'Please enter a different email address.',

          code:
            'EMAIL_UNCHANGED',
        });
    }

    // --------------------------------------------------------
    // VERIFY CURRENT PASSWORD
    // --------------------------------------------------------

    const verification =
      await verifyCurrentPassword(
        currentEmail,
        current_password
      );

    if (
      !verification.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            'Your current password is incorrect.',

          code:
            'CURRENT_PASSWORD_INCORRECT',
        });
    }

    // --------------------------------------------------------
    // EMAIL MUST BE FREE
    // --------------------------------------------------------

    const {
      data:
        existingUser,

      error:
        lookupError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .select(
          'id'
        )
        .eq(
          'email',
          cleanEmail
        )
        .neq(
          'id',
          req.dbUser.id
        )
        .maybeSingle();

    if (
      lookupError
    ) {
      console.error(
        'CHANGE EMAIL LOOKUP ERROR:',
        lookupError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to verify email availability.',

          code:
            'EMAIL_LOOKUP_FAILED',
        });
    }

    if (
      existingUser
    ) {
      return res
        .status(409)
        .json({
          error:
            'An account with this email already exists.',

          code:
            'EMAIL_ALREADY_EXISTS',
        });
    }

    // --------------------------------------------------------
    // SEND THE CODES (60 seconds between)
    // --------------------------------------------------------

    const wait =
      await getResendBlock(
        'email_change',
        cleanEmail
      );

    if (wait) {
      return sendReply(
        res,
        wait
      );
    }

    const started =
      await startAuthEmailChange(
        req.authToken,
        cleanEmail
      );

    if (
      !started.ok
    ) {
      return sendReply(
        res,
        started
      );
    }

    await recordEmailChangeCodesSent(
      cleanEmail,
      currentEmail
    );

    setActivityOutcome(
      res,
      {
        description:
          'User asked to change their email address; a code was sent to the new address.',
      }
    );

    return res
      .status(200)
      .json({
        message:
          `We sent a 6-digit code to ${cleanEmail}.`,

        new_email:
          cleanEmail,

        resend_after_seconds:
          OTP_RESEND_WAIT_MS /
          1000,

        expires_in_seconds:
          OTP_TTL_MS /
          1000,
      });
  } catch (
    error
  ) {
    console.error(
      'REQUEST EMAIL CHANGE ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to start the email change.',

        code:
          'EMAIL_UPDATE_FAILED',
      });
  }
}

// ------------------------------------------------------------
// POST /api/auth/me/email/resend
// ------------------------------------------------------------

async function resendEmailChange(
  req,
  res
) {
  try {
    if (
      !req.dbUser?.id ||
      !req.authToken
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    setCurrentAccountActivity(
      req,
      res
    );

    const validation =
      validateEmail(
        req.body
          ?.new_email
      );

    if (
      !validation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error,

          code:
            'INVALID_EMAIL',
        });
    }

    const cleanEmail =
      validation.value;

    // Only a change this account already started (with its
    // password).
    const account =
      await getAuthAccount(
        req.dbUser.id
      );

    if (
      String(
        account?.new_email ||
          ''
      ).toLowerCase() !==
      cleanEmail
    ) {
      return res
        .status(400)
        .json({
          error:
            'This email change is no longer waiting for a code. Please start again.',

          code:
            'EMAIL_CHANGE_NOT_PENDING',
        });
    }

    const wait =
      await getResendBlock(
        'email_change',
        cleanEmail
      );

    if (wait) {
      return sendReply(
        res,
        wait
      );
    }

    const started =
      await startAuthEmailChange(
        req.authToken,
        cleanEmail
      );

    if (
      !started.ok
    ) {
      return sendReply(
        res,
        started
      );
    }

    await recordEmailChangeCodesSent(
      cleanEmail,
      String(
        req.dbUser.email
      ).toLowerCase()
    );

    return res
      .status(200)
      .json({
        message:
          `We sent a new code to ${cleanEmail}. Codes sent earlier no longer work.`,

        resend_after_seconds:
          OTP_RESEND_WAIT_MS /
          1000,
      });
  } catch (
    error
  ) {
    console.error(
      'RESEND EMAIL CHANGE ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to send a new code.',
      });
  }
}

// ------------------------------------------------------------
// POST /api/auth/me/email/verify
// ------------------------------------------------------------

async function verifyEmailChange(
  req,
  res
) {
  try {
    if (
      !req.dbUser?.id ||
      !req.dbUser?.email
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    setCurrentAccountActivity(
      req,
      res
    );

    const validation =
      validateEmail(
        req.body
          ?.new_email
      );

    if (
      !validation.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            validation.error,

          code:
            'INVALID_EMAIL',
        });
    }

    const newEmail =
      validation.value;

    const code =
      cleanText(
        req.body?.code
      );

    if (
      !/^\d{6}$/.test(
        code
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Enter the 6-digit code from the email.',

          code:
            'OTP_FORMAT',
        });
    }

    const target =
      req.body?.target ===
      'current'
        ? 'current'
        : 'new';

    const currentEmail =
      String(
        req.dbUser.email
      )
        .trim()
        .toLowerCase();

    const targetEmail =
      target ===
      'current'
        ? currentEmail
        : newEmail;

    // --------------------------------------------------------
    // THE CHANGE MUST STILL BE WAITING
    // --------------------------------------------------------

    const before =
      await getAuthAccount(
        req.dbUser.id
      );

    if (
      String(
        before?.new_email ||
          ''
      ).toLowerCase() !==
      newEmail
    ) {
      return res
        .status(400)
        .json({
          error:
            'This email change is no longer waiting for a code. Please start again.',

          code:
            'EMAIL_CHANGE_NOT_PENDING',
        });
    }

    // --------------------------------------------------------
    // CHECK THE CODE
    // --------------------------------------------------------

    const blocked =
      await getVerifyBlock(
        'email_change',
        targetEmail
      );

    if (blocked) {
      setActivityOutcome(
        res,
        {
          description:
            `Email change code blocked: ${blocked.body.error}`,
        }
      );

      return sendReply(
        res,
        blocked
      );
    }

    const {
      error:
        verifyError,
    } =
      await supabaseAnon
        .auth
        .verifyOtp({
          email:
            targetEmail,

          token:
            code,

          type:
            'email_change',
        });

    if (
      verifyError
    ) {
      console.error(
        'VERIFY EMAIL CHANGE ERROR:',
        verifyError.message
      );

      const wrong =
        await recordWrongCode(
          'email_change',
          targetEmail
        );

      setActivityOutcome(
        res,
        {
          description:
            `Email change code failed: ${wrong.body.error}`,
        }
      );

      return sendReply(
        res,
        wrong
      );
    }

    // Each code works once.
    await recordCodeUsed(
      'email_change',
      targetEmail
    );

    const after =
      await getAuthAccount(
        req.dbUser.id
      );

    // --------------------------------------------------------
    // ONE OF TWO CODES (secure email change)
    // --------------------------------------------------------

    if (
      String(
        after?.email ||
          ''
      ).toLowerCase() !==
      newEmail
    ) {
      const nextTarget =
        target ===
        'new'
          ? 'current'
          : 'new';

      setActivityOutcome(
        res,
        {
          action:
            'VERIFY_EMAIL_CHANGE_CODE',

          description:
            `User confirmed the email change code sent to their ${target} address; the ${nextTarget} address must confirm too.`,
        }
      );

      return res
        .status(200)
        .json({
          status:
            'confirm_other',

          next_target:
            nextTarget,

          message:
            nextTarget ===
            'current'
              ? `Code confirmed. Now enter the code we sent to your current email, ${currentEmail}.`
              : `Code confirmed. Now enter the code we sent to ${newEmail}.`,
        });
    }

    // --------------------------------------------------------
    // CHANGED: COPY TO PUBLIC USERS
    // --------------------------------------------------------

    const {
      error:
        profileEmailError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .update({
          email:
            newEmail,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          req.dbUser.id
        );

    if (
      profileEmailError
    ) {
      console.error(
        'CHANGE PUBLIC USER EMAIL ERROR:',
        profileEmailError
      );

      // Keep sign-in and profile on the same email.
      try {
        await supabaseAdmin
          .auth
          .admin
          .updateUserById(
            req.dbUser.id,
            {
              email:
                currentEmail,

              email_confirm:
                true,
            }
          );
      } catch (
        rollbackError
      ) {
        console.error(
          'CHANGE EMAIL ROLLBACK ERROR:',
          rollbackError
        );
      }

      return res
        .status(500)
        .json({
          error:
            'Unable to change your email address.',

          code:
            'PROFILE_EMAIL_UPDATE_FAILED',
        });
    }

    setActivityUser(
      res,
      {
        id:
          req.dbUser.id,

        email:
          newEmail,

        role:
          req.dbUser.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      req.dbUser.id
    );

    setActivityOutcome(
      res,
      {
        description:
          `User changed their email address from ${currentEmail} after confirming the code sent to the new address. Every session was signed out.`,
      }
    );

    // --------------------------------------------------------
    // END EVERY SESSION
    // --------------------------------------------------------

    if (
      req.authToken
    ) {
      try {
        await supabaseAdmin
          .auth
          .admin
          .signOut(
            req.authToken,
            'global'
          );
      } catch (
        signOutError
      ) {
        console.error(
          'CHANGE EMAIL SIGNOUT ERROR:',
          signOutError
        );
      }
    }

    return res
      .status(200)
      .json({
        status:
          'changed',

        message:
          'Email address changed. Please sign in again using your new email.',

        email:
          newEmail,

        requires_relogin:
          true,
      });
  } catch (
    error
  ) {
    console.error(
      'VERIFY EMAIL CHANGE CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to change your email address.',

        code:
          'EMAIL_UPDATE_FAILED',
      });
  }
}

// ============================================================
// DELETE /api/auth/me
//
// DEACTIVATE ACCOUNT
//
// SOFT DELETE
// ============================================================

async function deactivateAccount(
  req,
  res
) {
  try {
    if (
      !req.dbUser ||
      !req.dbUser.id
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // ACTIVITY IDENTITY
    // --------------------------------------------------------

    setCurrentAccountActivity(
      req,
      res
    );

    // --------------------------------------------------------
    // ADMIN PROTECTION
    // --------------------------------------------------------

    if (
      isAdminRole(
        req.dbUser.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Administrator accounts cannot be deactivated from the user application.',

          code:
            'ADMIN_SELF_DEACTIVATION_NOT_ALLOWED',
        });
    }

    const userId =
      req.dbUser.id;

    const now =
      new Date()
        .toISOString();

    // --------------------------------------------------------
    // SOFT DELETE
    // --------------------------------------------------------

    // deactivated_by = themselves, so sign-in says "you
    // deactivated your account" (migration 20261102).
    const deactivate =
      fields =>
        supabaseAdmin
          .from(
            'users'
          )
          .update({
            is_active:
              false,

            deactivated_at:
              now,

            updated_at:
              now,

            ...fields,
          })
          .eq(
            'id',
            userId
          )
          .eq(
            'is_active',
            true
          )
          .select(
            `
              id,
              email,
              role,
              is_active,
              deactivated_at,
              updated_at
            `
          )
          .maybeSingle();

    let {
      data:
        deactivatedUser,

      error:
        updateError,
    } =
      await deactivate({
        deactivated_by:
          userId,

        deactivation_reason:
          null,
      });

    if (
      isMissingMigration(
        updateError
      )
    ) {
      ({
        data:
          deactivatedUser,

        error:
          updateError,
      } =
        await deactivate({}));
    }

    if (
      updateError
    ) {
      console.error(
        'DEACTIVATE ACCOUNT DATABASE ERROR:',
        updateError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to deactivate your account.',

          code:
            'ACCOUNT_DEACTIVATION_FAILED',
        });
    }

    if (
      !deactivatedUser
    ) {
      return res
        .status(409)
        .json({
          error:
            'This account is already deactivated.',

          code:
            'ACCOUNT_ALREADY_DEACTIVATED',
        });
    }

    // --------------------------------------------------------
    // UPDATE ACTIVITY SNAPSHOT
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          deactivatedUser.id,

        email:
          deactivatedUser.email,

        role:
          deactivatedUser.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      deactivatedUser.id
    );

    // --------------------------------------------------------
    // RELEASE OPEN OFFERS AND REQUESTS
    //
    // Donors and requesters waiting on this person are told.
    // --------------------------------------------------------

    await releaseDeactivatedAccount(
      deactivatedUser.id
    );

    // --------------------------------------------------------
    // REVOKE SESSION
    // --------------------------------------------------------

    if (
      req.authToken
    ) {
      try {
        const {
          error:
            signOutError,
        } =
          await supabaseAdmin
            .auth
            .admin
            .signOut(
              req.authToken
            );

        if (
          signOutError
        ) {
          console.error(
            'DEACTIVATE ACCOUNT SESSION REVOCATION ERROR:',
            signOutError.message
          );
        }
      } catch (
        signOutError
      ) {
        console.error(
          'DEACTIVATE ACCOUNT SESSION REVOCATION ERROR:',
          signOutError
        );
      }
    }

    return res
      .status(200)
      .json({
        message:
          'Your account has been deactivated successfully.',

        user:
          deactivatedUser,
      });
  } catch (
    error
  ) {
    console.error(
      'DEACTIVATE ACCOUNT CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to deactivate your account.',

        code:
          'ACCOUNT_DEACTIVATION_FAILED',
      });
  }
}

// ============================================================
// DELETE /api/auth/me/permanent
//
// PERMANENTLY DELETE ACCOUNT
// ============================================================

async function deleteAccountPermanently(
  req,
  res
) {
  try {
    // --------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------

    if (
      !req.dbUser?.id ||
      !req.dbUser?.email
    ) {
      return res
        .status(401)
        .json({
          error:
            'Authentication required.',

          code:
            'AUTH_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // INITIAL ACTIVITY IDENTITY
    //
    // Failed attempts before deletion can safely reference
    // the existing user row.
    // --------------------------------------------------------

    setCurrentAccountActivity(
      req,
      res
    );

    // --------------------------------------------------------
    // ADMIN PROTECTION
    // --------------------------------------------------------

    if (
      isAdminRole(
        req.dbUser.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Administrator accounts cannot be permanently deleted from the user application.',

          code:
            'ADMIN_SELF_DELETE_NOT_ALLOWED',
        });
    }

    const {
      current_password,
      confirmation,
    } =
      req.body || {};

    // --------------------------------------------------------
    // CURRENT PASSWORD REQUIRED
    // --------------------------------------------------------

    if (
      !current_password
    ) {
      return res
        .status(400)
        .json({
          error:
            'Enter your current password to delete your account.',

          code:
            'CURRENT_PASSWORD_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // DELETE CONFIRMATION REQUIRED
    // --------------------------------------------------------

    if (
      cleanText(
        confirmation
      ).toUpperCase() !==
      'DELETE'
    ) {
      return res
        .status(400)
        .json({
          error:
            'Type DELETE to confirm permanent account deletion.',

          code:
            'DELETE_CONFIRMATION_REQUIRED',
        });
    }

    // --------------------------------------------------------
    // VERIFY CURRENT PASSWORD
    // --------------------------------------------------------

    const verification =
      await verifyCurrentPassword(
        req.dbUser.email,
        current_password
      );

    if (
      !verification.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            'Your current password is incorrect.',

          code:
            'CURRENT_PASSWORD_INCORRECT',
        });
    }

    const userId =
      req.dbUser.id;

    const userEmail =
      req.dbUser.email;

    const userRole =
      req.dbUser.role;

    // --------------------------------------------------------
    // RELEASE OPEN OFFERS AND REQUESTS
    //
    // Same as deactivating: donors and requesters waiting on
    // this person are told before the delete removes their
    // requests, offers and chats. Runs first because it reads
    // the account (the notifications use their name).
    // --------------------------------------------------------

    await releaseDeactivatedAccount(
      userId
    );

    // --------------------------------------------------------
    // DELETE PUBLIC USER
    //
    // Database foreign keys handle:
    //
    // CASCADE:
    // - blood requests
    // - donor applications
    // - donor profiles
    // - responses
    // - invitations
    // - coordination messages
    // - notifications
    //
    // SET NULL:
    // - reviewed_by
    // - schedule created_by
    // - schedule updated_by
    // --------------------------------------------------------

    const {
      data:
        deletedUser,

      error:
        databaseDeleteError,
    } =
      await supabaseAdmin
        .from(
          'users'
        )
        .delete()
        .eq(
          'id',
          userId
        )
        .select(
          'id'
        )
        .maybeSingle();

    if (
      databaseDeleteError
    ) {
      console.error(
        'PERMANENT ACCOUNT DATABASE DELETE ERROR:',
        databaseDeleteError
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to delete your account data.',

          code:
            'ACCOUNT_DATA_DELETE_FAILED',
        });
    }

    if (
      !deletedUser
    ) {
      return res
        .status(404)
        .json({
          error:
            'Your account could not be found.',

          code:
            'ACCOUNT_NOT_FOUND',
        });
    }

    // --------------------------------------------------------
    // IMPORTANT AUDIT-LOG HANDLING
    //
    // public.users has now been deleted.
    //
    // activity_logs.user_id has a foreign key to public.users.
    // The log middleware writes after the response finishes.
    //
    // Therefore we MUST NOT try to insert the deleted UUID
    // into activity_logs.user_id.
    //
    // Instead:
    // - user_id becomes NULL
    // - email snapshot remains
    // - role snapshot remains
    // - entity_id keeps the deleted user's UUID as text
    //
    // This allows the DELETE_ACCOUNT audit record to survive.
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          null,

        email:
          userEmail,

        role:
          userRole,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      userId
    );

    // --------------------------------------------------------
    // DELETE SUPABASE AUTH USER
    // --------------------------------------------------------

    const {
      error:
        authDeleteError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .deleteUser(
          userId
        );

    if (
      authDeleteError
    ) {
      console.error(
        'PERMANENT ACCOUNT AUTH DELETE ERROR:',
        authDeleteError
      );

      return res
        .status(500)
        .json({
          error:
            'Your account data was removed, but the authentication account could not be fully deleted. Please contact an administrator.',

          code:
            'AUTH_ACCOUNT_DELETE_FAILED',

          data_deleted:
            true,
        });
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res
      .status(200)
      .json({
        message:
          'Your Hemo-Hero account has been permanently deleted.',

        deleted:
          true,
      });
  } catch (
    error
  ) {
    console.error(
      'PERMANENT ACCOUNT DELETE CONTROLLER ERROR:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Unable to permanently delete your account.',

        code:
          'ACCOUNT_DELETE_FAILED',
      });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  changePassword,
  requestEmailChange,
  resendEmailChange,
  verifyEmailChange,
  deactivateAccount,
  deleteAccountPermanently,
};