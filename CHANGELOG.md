# Changelog

All notable changes to Hemo-Hero. The server, the mobile app and the admin portal share one version number, which follows [semantic versioning](https://semver.org/):

- **Major** (2.0.0): a change that breaks older apps or existing data.
- **Minor** (1.1.0): new features.
- **Patch** (1.0.1): fixes only.

Write each change under **Unreleased** as you make it. `node scripts/version.js minor` (or `patch`, `major`) moves those notes under the new version and updates every version number (see [Versions](README.md#versions)).

## Unreleased

## 1.0.0 - 2026-10-13

The first numbered release. It covers all the work from 2026-08-28 to 2026-10-11.

### Mobile app
- Sign up with email verification, sign in, and password reset by one-time code. Passwords must be at least 8 characters with upper and lower case letters, a number and a symbol. Three wrong passwords lock sign-in for 1, 3, 5, then 10 minutes.
- Donor application with a photo proving the blood type, donation history, availability and a government ID.
- Blood requests, urgent or scheduled. Donors see nearby requests with a compatible blood type, and requesters can invite donors.
- Offers, acceptance, chat, an agreed meeting time and a live trip map.
- Donations are recorded automatically when the requester confirms: one bag per donor, and at least 90 days between donations. Both sides rate each other afterwards.
- Reports for no-shows, false requests and other problems.
- In-app and push notifications, with a setting for which updates alert the phone.
- Home tour, address autofill, an About screen, and a full-screen layout with a floating tab bar.

### Admin portal
- Dashboard, analytics, users (create, edit, deactivate), donor application review, blood requests, donations waiting for review, and the activity log trail.
- Issues: warn or deactivate the reported account, record the outcome and notify the reporter.
- Super admin: manages admin accounts, and backs up and restores the database, with a daily automatic backup.
- Fits the iPad Pro 13 and desktop browsers.

### Server
- Express API on Supabase (database, sign-in and file storage).
- Requests close automatically once they are past their time.
- Deactivating an account releases its open offers, invitations and requests.
- Server tests (`npm test`) and the database structure document (`npm run schema:doc`).
- Android APK build (EAS `preview` profile) that reaches the server through ngrok.
- One version number for all three parts. The server reports it at `/health`, the mobile About screen shows it with the Android build number, and admin Settings shows the admin portal and server versions side by side.
