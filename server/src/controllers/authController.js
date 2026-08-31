const { supabaseAnon, supabaseAdmin } = require('../config/supabase');

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function cleanRequiredText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();
  return cleaned || null;
}

function validateDateOfBirth(dateOfBirth) {
  // Expected format: YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dateOfBirth)) {
    return {
      valid: false,
      error: 'date_of_birth must use YYYY-MM-DD format'
    };
  }

  const [year, month, day] = dateOfBirth.split('-').map(Number);

  // Use UTC so local timezone does not accidentally shift the date.
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  // Reject impossible dates such as 2020-02-31.
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return {
      valid: false,
      error: 'Invalid date of birth'
    };
  }

  const today = new Date();

  const todayUtc = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  if (birthDate > todayUtc) {
    return {
      valid: false,
      error: 'Date of birth cannot be in the future'
    };
  }

  return {
    valid: true,
    birthDate
  };
}

// ------------------------------------------------------------
// POST /api/auth/register
// Creates a Supabase Auth account.
//
// The database trigger creates the corresponding public.users
// profile using the metadata supplied here.
// ------------------------------------------------------------

async function register(req, res) {
  try {
    const {
      email,
      password,
      confirm_password,
      first_name,
      middle_name,
      last_name,
      suffix,
      phone,
      date_of_birth
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (
      !email ||
      !password ||
      !confirm_password ||
      !first_name ||
      !last_name ||
      !date_of_birth
    ) {
      return res.status(400).json({
        error:
          'email, password, confirm_password, first_name, last_name, and date_of_birth are required'
      });
    }

    if (
      typeof password !== 'string' ||
      typeof confirm_password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Password values must be text'
      });
    }

    // --------------------------------------------------------
    // Clean input
    // --------------------------------------------------------

    const cleanEmail = cleanRequiredText(email).toLowerCase();
    const cleanFirstName = cleanRequiredText(first_name);
    const cleanMiddleName = cleanOptionalText(middle_name);
    const cleanLastName = cleanRequiredText(last_name);
    const cleanSuffix = cleanOptionalText(suffix);
    const cleanPhone = cleanOptionalText(phone);

    if (!cleanFirstName || !cleanLastName) {
      return res.status(400).json({
        error: 'first_name and last_name cannot be empty'
      });
    }

    // --------------------------------------------------------
    // Email validation
    // --------------------------------------------------------

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    // --------------------------------------------------------
    // Password validation
    // --------------------------------------------------------

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return res.status(400).json({
        error: 'Password must contain at least one letter and one number'
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        error: 'Passwords do not match'
      });
    }

    // --------------------------------------------------------
    // Date of birth validation
    //
    // We store and validate DOB during account registration.
    // Donor age eligibility will be enforced later when the
    // user applies to become a donor.
    // --------------------------------------------------------

    const dobValidation = validateDateOfBirth(date_of_birth);

    if (!dobValidation.valid) {
      return res.status(400).json({
        error: dobValidation.error
      });
    }

    // --------------------------------------------------------
    // Supabase Auth registration
    // --------------------------------------------------------

    const { data, error } = await supabaseAnon.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: cleanFirstName,
          middle_name: cleanMiddleName,
          last_name: cleanLastName,
          suffix: cleanSuffix,
          phone: cleanPhone,
          date_of_birth
        }
      }
    });

    if (error) {
      console.error('Supabase register error:', error.message);

      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(201).json({
      message: data.session
        ? 'Registered and logged in.'
        : 'Registered. Please check your email to verify your account.',
      user: data.user,
      session: data.session
    });
  } catch (err) {
    console.error('register error:', err);

    return res.status(500).json({
      error: 'Registration failed'
    });
  }
}

// ------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'email and password are required'
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'email and password must be text'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Retrieve Hemo-Hero application profile.
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (dbError || !dbUser) {
      console.error('login profile lookup error:', dbError);

      return res.status(404).json({
        error: 'User profile not found'
      });
    }

    return res.status(200).json({
      session: data.session,
      user: data.user,
      profile: dbUser
    });
  } catch (err) {
    console.error('login error:', err);

    return res.status(500).json({
      error: 'Login failed'
    });
  }
}

// ------------------------------------------------------------
// POST /api/auth/logout
//
// authRoutes.js should protect this route using requireAuth.
// ------------------------------------------------------------

async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization || '';

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Missing authentication token'
      });
    }

    // Revoke the Supabase session server-side.
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      console.error('logout Supabase error:', error.message);

      return res.status(400).json({
        error: 'Unable to log out'
      });
    }

    // React Native should also remove its locally stored session.
    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('logout error:', err);

    return res.status(500).json({
      error: 'Logout failed'
    });
  }
}

// ------------------------------------------------------------
// POST /api/auth/forgot-password
// ------------------------------------------------------------

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'email is required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(
      cleanEmail
    );

    if (error) {
      // Keep the public response generic.
      console.error('forgot password Supabase error:', error.message);
    }

    // Generic response helps avoid revealing whether an account exists.
    return res.status(200).json({
      message: 'If an account exists for this email, a password reset email will be sent.'
    });
  } catch (err) {
    console.error('forgotPassword error:', err);

    return res.status(500).json({
      error: 'Request failed'
    });
  }
}

// ------------------------------------------------------------
// GET /api/auth/me
//
// requireAuth has already populated req.dbUser.
// ------------------------------------------------------------

async function getProfile(req, res) {
  return res.status(200).json({
    user: req.dbUser
  });
}

// ------------------------------------------------------------
// PATCH /api/auth/me
//
// Allows safe profile fields to be updated.
// Email, role, DOB, and password are intentionally excluded.
// ------------------------------------------------------------

async function updateProfile(req, res) {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      suffix,
      phone
    } = req.body;

    const updates = {};

    if (first_name !== undefined) {
      const cleanFirstName = cleanRequiredText(first_name);

      if (!cleanFirstName) {
        return res.status(400).json({
          error: 'first_name cannot be empty'
        });
      }

      updates.first_name = cleanFirstName;
    }

    if (middle_name !== undefined) {
      updates.middle_name = cleanOptionalText(middle_name);
    }

    if (last_name !== undefined) {
      const cleanLastName = cleanRequiredText(last_name);

      if (!cleanLastName) {
        return res.status(400).json({
          error: 'last_name cannot be empty'
        });
      }

      updates.last_name = cleanLastName;
    }

    if (suffix !== undefined) {
      updates.suffix = cleanOptionalText(suffix);
    }

    if (phone !== undefined) {
      updates.phone = cleanOptionalText(phone);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.dbUser.id)
      .select('*')
      .single();

    if (error) {
      console.error('updateProfile Supabase error:', error);

      return res.status(400).json({
        error: 'Unable to update profile'
      });
    }

    return res.status(200).json({
      user: data
    });
  } catch (err) {
    console.error('updateProfile error:', err);

    return res.status(500).json({
      error: 'Update failed'
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  getProfile,
  updateProfile
};