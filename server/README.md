# Hemo-Hero Server

Express API for the Hemo-Hero mobile app and admin portal. Data, sign-in and file storage use Supabase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase values (Supabase dashboard → Project Settings → API).
3. Set up the database (below).
4. `npm run dev` (restarts when files change) or `npm start`.
5. Open http://localhost:5000/health. At start-up the server also prints the address that phones on the same network use.

## Environment variables

| Variable | Required | Default | Used for |
|---|---|---|---|
| `SUPABASE_URL` | yes | | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | | Public key for sign-up and sign-in calls |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | | Secret key for server-side database access. It bypasses Row Level Security, so keep it in this server's `.env` only, never in an app. |
| `PORT` | no | `5000` | Server port. The mobile app expects 5000. |
| `FRONTEND_URL` | no | `http://localhost:8081` | Where links in sign-up and password-reset emails point |
| `DONATION_INTERVAL_DAYS` | no | `90` | Days a donor waits between donations. Use `0` when testing the cycle repeatedly with the same accounts. |
| `OSRM_URL` | no | `https://router.project-osrm.org` | Routing server for the live trip map |
| `NOMINATIM_URL` | no | `https://nominatim.openstreetmap.org` | Address lookup that fills in the profile address from GPS |

## Database

In the Supabase SQL editor, run:

1. `sql/auth_trigger.sql`: creates a `public.users` row whenever someone signs up.
2. `sql/notifications.sql`
3. Every file in `database/migrations/`, oldest first (the file names start with the date). Each file explains what it changes.

Create two storage buckets (Supabase → Storage):

- `profile-photos`: public
- `donor-verification`: private. It holds government IDs and blood type proof photos; admins open them through links that expire after 5 minutes.

The base tables (`users`, `donor_applications`, `blood_requests`, `blood_request_responses`, `blood_request_invitations`, `blood_request_coordination_messages`, `blood_request_coordination_schedules` and `facility_locations`) were created in the Supabase dashboard and are not in this repository yet. A new database needs them before the migrations run.

### Admin account

Admins are regular accounts with `role = 'admin'`. Sign up (for example in the mobile app), then run in the SQL editor:

```sql
update public.users set role = 'admin' where email = 'admin@example.com';
```

## API

All routes are under `/api`. Routes for signed-in users need `Authorization: Bearer <access_token>`; `/api/admin/*` and `/api/requests/admin/*` also need an admin account. The files in `src/routes/` list every endpoint.

| Prefix | What it covers |
|---|---|
| `/api/auth` | Sign-up and email verification, sign-in, session refresh, password reset, account settings, blood type (only with a proof photo), profile photo, deactivating or deleting an account |
| `/api/donors` | Donor applications (ID upload, apply, withdraw), donor settings, nearby donor search, public donor profiles |
| `/api/donor-invitations` | A donor's invitations: list, accept, decline |
| `/api/requests` | Blood requests, donor offers, coordination chat and schedule, live trips, donation confirmation, ratings, reports and no-shows, fulfil and cancel. `/api/requests/admin` is the admin view. |
| `/api/requests/nearby` | Active requests near a donor |
| `/api/donations` | A user's donation history, as donor and as requester |
| `/api/facilities` | Nearby hospitals and blood banks |
| `/api/geocode` | Barangay, city and province for a GPS point (fills in the profile address) |
| `/api/notifications` | In-app notifications and push tokens |
| `/api/admin/donor-applications` | Review donor applications |
| `/api/admin/users` | Manage user accounts |
| `/api/admin/donations` | Donation records; review flagged ones |
| `/api/admin/reports` | Issues: user reports and feedback |
| `/api/admin/activity-logs` | Log trail |

## Background jobs

Shortly after start-up, and then every 30 minutes, the server closes active requests that are past their time:

- scheduled requests, 24 hours after the needed date and time
- urgent requests, after 3 days
- requests without a date, after 7 days

A request with a recorded donation becomes **fulfilled**; otherwise it becomes **expired**. Open offers and invitations are closed, live trips end, and everyone involved is notified.

## Tests

`npm test` runs the tests in `tests/` with Node's built-in test runner. They don't need a database.

## Notes

- If email confirmation is on in Supabase (the default), new accounts verify their email before signing in.
- Push notifications go through Expo's push service. Admin notifications stay in the admin portal and are never pushed.
