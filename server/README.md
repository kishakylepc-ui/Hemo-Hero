# Hemo-Hero Server — Week 2 (Auth)

## Setup

1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your Supabase project URL + keys
   (Supabase dashboard → Project Settings → API)
4. In the Supabase SQL editor, run `sql/auth_trigger.sql` — this makes sure
   a `public.users` row is created automatically whenever someone signs up.
5. `npm run dev` (or `npm start`)
6. Visit `http://localhost:4000/health` — should return `{ "status": "ok" }`

## Endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Create account (email, password, first_name, last_name, phone) |
| POST | /api/auth/login | No | Returns session (access_token) + profile |
| POST | /api/auth/logout | Yes | Invalidate session |
| POST | /api/auth/forgot-password | No | Sends password reset email |
| GET | /api/auth/me | Yes | Get current user's profile |
| PATCH | /api/auth/me | Yes | Update first_name/last_name/phone |

## Auth flow for React Native

1. Call `/api/auth/register` or `/api/auth/login`
2. Store `session.access_token` (and `refresh_token`) securely
   (e.g. `expo-secure-store`, not AsyncStorage)
3. Send it on every authenticated request:
   ```
   Authorization: Bearer <access_token>
   ```
4. When a request returns 401, use the refresh_token to get a new
   access_token via Supabase's client SDK, or prompt re-login.

## Important

- `SUPABASE_SERVICE_ROLE_KEY` must NEVER be sent to or embedded in the
  React Native app. It bypasses Row Level Security. It only belongs
  in this server's `.env`.
- If Supabase email confirmation is enabled (default), `register`
  won't return a session until the user clicks the verification link
  in their email — the response will say so.
- Run `sql/auth_trigger.sql` before testing registration, or new
  signups will succeed in `auth.users` but have no matching
  `public.users` row, which will break `/api/auth/me` and anything
  that joins against `users`.
