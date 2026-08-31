const { createClient } = require('@supabase/supabase-js');

// ------------------------------------------------------------
// SUPABASE CONFIGURATION
//
// Two separate clients:
//
// supabaseAnon
//   - Authentication operations
//   - signUp
//   - signInWithPassword
//   - getUser
//   - resetPasswordForEmail
//
// supabaseAdmin
//   - Trusted server-side operations
//   - Uses the secret/service-role credential
//   - Can bypass Row Level Security
//
// NEVER expose the admin credential to React Native,
// Postman screenshots, GitHub, or client-side code.
// ------------------------------------------------------------

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

// ------------------------------------------------------------
// Environment validation
// ------------------------------------------------------------

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
  );
}

// Prevent accidentally using the public/anon key as the
// privileged backend credential.
if (SUPABASE_ANON_KEY === SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be different'
  );
}

// ------------------------------------------------------------
// Public/auth client
//
// No persistent session storage is needed because this client
// runs inside the Node.js API.
// ------------------------------------------------------------

const supabaseAnon = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ------------------------------------------------------------
// Admin client
//
// This credential must remain SERVER-SIDE ONLY.
// ------------------------------------------------------------

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

module.exports = {
  supabaseAnon,
  supabaseAdmin
};