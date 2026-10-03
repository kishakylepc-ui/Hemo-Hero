// Shared test setup: the services load the Supabase config,
// which requires these variables. Placeholders are enough
// because the tests only cover pure logic (no network).
process.env.SUPABASE_URL =
  process.env.SUPABASE_URL || 'http://localhost:54321';

process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'test-anon-key';

process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Tests expect the default 90-day donation interval.
delete process.env.DONATION_INTERVAL_DAYS;
