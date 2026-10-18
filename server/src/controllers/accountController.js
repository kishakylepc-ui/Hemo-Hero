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

// ============================================================
// ACTIVITY LOG HELPERS
// ============================================================

const {
  setActivityUser,
  setActivityEntity,
} = require(
  '../middleware/activityLogMiddleware'
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
// PATCH /api/auth/me/email
//
// CHANGE EMAIL
// ============================================================

async function changeEmail(
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

    const cleanConfirmEmail =
      cleanText(
        confirm_email
      ).toLowerCase();

    // --------------------------------------------------------
    // CONFIRM EMAIL
    // --------------------------------------------------------

    if (
      cleanEmail !==
      cleanConfirmEmail
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

    // --------------------------------------------------------
    // EMAIL MUST CHANGE
    // --------------------------------------------------------

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
    // CHECK DUPLICATE EMAIL
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
    // UPDATE SUPABASE AUTH EMAIL
    // --------------------------------------------------------

    const {
      error:
        authEmailError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .updateUserById(
          req.dbUser.id,
          {
            email:
              cleanEmail,

            email_confirm:
              true,
          }
        );

    if (
      authEmailError
    ) {
      console.error(
        'CHANGE AUTH EMAIL ERROR:',
        authEmailError
      );

      const message =
        String(
          authEmailError.message ||
            ''
        ).toLowerCase();

      if (
        message.includes(
          'already'
        ) ||
        message.includes(
          'registered'
        )
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

      return res
        .status(500)
        .json({
          error:
            'Unable to change your email address.',

          code:
            'AUTH_EMAIL_UPDATE_FAILED',
        });
    }

    // --------------------------------------------------------
    // UPDATE PUBLIC USERS EMAIL
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
            cleanEmail,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          req.dbUser.id
        );

    // --------------------------------------------------------
    // ROLLBACK AUTH EMAIL IF PUBLIC UPDATE FAILS
    // --------------------------------------------------------

    if (
      profileEmailError
    ) {
      console.error(
        'CHANGE PUBLIC USER EMAIL ERROR:',
        profileEmailError
      );

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

    // --------------------------------------------------------
    // UPDATE ACTIVITY SNAPSHOT
    //
    // The account still has the same ID, but its email has
    // changed. Store the new email in the successful log.
    // --------------------------------------------------------

    setActivityUser(
      res,
      {
        id:
          req.dbUser.id,

        email:
          cleanEmail,

        role:
          req.dbUser.role,
      }
    );

    setActivityEntity(
      res,
      'user_account',
      req.dbUser.id
    );

    // --------------------------------------------------------
    // REVOKE SESSION
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
          'CHANGE EMAIL SIGNOUT ERROR:',
          signOutError
        );
      }
    }

    return res
      .status(200)
      .json({
        message:
          'Email address changed successfully. Please sign in again using your new email.',

        email:
          cleanEmail,

        requires_relogin:
          true,
      });
  } catch (
    error
  ) {
    console.error(
      'CHANGE EMAIL CONTROLLER ERROR:',
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

    const {
      data:
        deactivatedUser,

      error:
        updateError,
    } =
      await supabaseAdmin
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
  changeEmail,
  deactivateAccount,
  deleteAccountPermanently,
};