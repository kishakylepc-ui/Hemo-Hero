# Changelog

All notable changes to Hemo-Hero. The server, the mobile app and the admin portal share one version number, which follows [semantic versioning](https://semver.org/):

- **Major** (2.0.0): a change that breaks older apps or existing data.
- **Minor** (1.1.0): new features.
- **Patch** (1.0.1): fixes only.

Write each change under **Unreleased** as you make it. `node scripts/version.js minor` (or `patch`, `major`) moves those notes under the new version and updates every version number (see [Versions](README.md#versions)).

## Unreleased

- Mobile: new **Sign In** and **Sign Up** design. A red top with a large see-through blood drop meets the white form with a liquid wave.
  - Sign In says "Give blood. Save lives." above a "Welcome back" form, and Sign Up says "Join Hemo-Hero". The Sign In / Sign Up switch is now a link under each form ("Create an account" / "Sign in").
  - Outlined fields with a soft red ring while you type. Forgot Password, Reset Password and the Account & Security password fields use the same style.
  - Sign Up has a five-step password strength bar and rule chips that turn green.
  - Forgot Password, Reset Password and Verify Email have the same red top and wave, so the whole sign-in flow matches.
- Mobile: new **Home** design to match. The red top has the same drop and wave, and it now scrolls with the page.
  - The request banner is a white card floating over the wave: "Need blood now?" with Create Blood Request, or "Your blood request is active" with View My Request.
  - The greeting follows the time of day ("Good morning"), and the location chip shows just your city.
  - Active Request only shows when you have a request. It shows the progress as four bars with labels. The whole card opens the request, so its own button is gone.
  - Nearby requests are one compact row each: distance, bags, and when it's needed (or how long ago, for urgent ones). Tap a row to open it.
  - Dates on Home leave out the year when it's this year.
  - Verified donors see one green row with when they can donate next. Tap it to open the application. Pending, rejected and new donors keep their button.
  - Find Donors is a full-width button that names the chosen type, e.g. "Find O+ Donors".
- Mobile: the Profile and Notifications headers end in the same curved wave as Home. Profile no longer has a back button, since it's a tab.

## 1.2.0 - 2026-10-25

- Mobile, Edit Profile: the **Account** section now holds the username instead of the read-only email. It says while you type whether a new username is available or taken, like Sign Up.
- Mobile: iPhone-style icons and spacing on Home and in every pop-up and bottom sheet.
  - Icons are Ionicons (Apple's SF Symbols look) on rounded-square tiles, with even 8-point spacing.
  - Close buttons are round and grey, and Cancel buttons are light grey.
  - The blood type and location chips under your name are now the same size and line up.
- Fixed: the Deactivate Account pop-up squeezed its two buttons, cutting off "Deactivate".
- Mobile: notifications in the installed app (APK) show the Hemo-Hero logo instead of a default icon. Expo Go always shows its own icon.

- **Usernames.** Sign in with a username or an email, in both apps. A lockout and the CAPTCHA follow the account whichever one is typed.
  - Sign Up asks for a username and checks while you type whether it's free.
  - It can be changed in Edit Profile (mobile) and Settings (admin), and admins set it in Create User and Edit User.
  - The Users list shows and searches usernames.
  - Usernames are 3 to 20 lowercase letters, numbers, periods or underscores, and they're unique regardless of letter case. So are emails now, in the app's own table.
  - Existing accounts get a username made from their email.
  - Needs migration `20261022_usernames.sql`.
- Admin portal: **Forgot Password** now opens a reset popup with three steps: email, the 6-digit code (with Resend), and a new password with its rules shown while typing. Before, it only sent the code, with nowhere to enter it.

- The log trail records blocked requests as **Unauthorized Access** (module Access Control), with the user, route, IP address and reason. That covers:
  - no or a bad sign-in token
  - a deactivated or locked account
  - a user opening an admin feature, or an admin opening a super-admin feature
  - a non-admin signing in to the Admin Portal, who now gets no session there at all

  Each caller and reason is recorded at most once a minute.
- Log Trails: a **Date** filter: All time, Today, Last 7 days, Last 30 days, or **Custom**, a range picked in a calendar.

- Sign-in lockouts now last 1, 5, then 15 minutes (they were 1, 3, 5 and 10). Both apps count down to the second, and the countdown comes back after a refresh or after reopening the app. The admin portal used to show only a message, with no timer.
- After an account has been locked once, signing in to it needs a CAPTCHA until a sign-in succeeds or a day passes without a wrong password. The server makes the picture (`svg-captcha`), and each one works once and expires after 5 minutes. The admin portal now uses `react-native-svg` to show it.
- A lockout that ended more than 15 minutes earlier used to reset the account to a 1-minute lockout. The account now keeps its lockout level.
- The log trail records lockouts as **Account Lockout** and wrong CAPTCHAs as **Captcha Failed**. A wrong password entry now says how many attempts were left.
- Both apps sign out after 15 minutes without activity. A warning ("Are you still there?") counts down for the last minute, and Sign In then explains what happened. The log trail records **Auto Logout**. `EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES` sets a shorter time for demos.
- Coming back after 15 minutes counts as inactivity too: reopening the mobile app, or reopening the admin portal with **Remember me** checked, signs out instead of continuing the session.
- Admin portal: activity in any tab keeps every tab signed in, and signing out in one tab sends every open tab to sign-in. Pages other than sign-in are covered until the session is checked, so a typed address or Back after signing out can't show them.
- After signing out, Back (Android, the browser, or the iPad back swipe) no longer returns to signed-in screens.
- Change Email now sends a 6-digit code to the new address, and the email changes only after the code is entered. Before, the new email was saved straight away without being checked.
  - With Supabase's secure email change on, the current address gets a code too.
  - Both apps have the code step, with Resend.
  - The old `PATCH /api/auth/me/email` is gone, replaced by `/me/email/request`, `/me/email/verify` and `/me/email/resend`.
  - The Supabase "Change Email Address" template must show `{{ .Token }}` (see the server README).
- One-time codes (account verification, Forgot Password, Change Email) now expire after 10 minutes and allow 5 wrong tries. Each wrong try says how many are left. A new code can be sent once a minute, and the apps count down to it, including the Reset Password screen, which had no wait before. Needs migration `20261022_otp_attempts.sql`.
- Resetting a password now signs the account out everywhere and clears any sign-in lockout.
- Admin portal, user page: **Lock / Unlock**.
  - A locked account can't sign in, its current sessions stop working in both apps, and Supabase bans the sign-in until it's unlocked. Nothing else about the account changes.
  - The admin can give a reason, which is shown on the user page and in the log trail.
  - Unlock also clears a lockout from wrong passwords.
  - The Users list has a **Locked** filter and a lock icon on locked rows.
  - The user page's Account Information shows sign-in status: locked, locked until a time, or recent wrong passwords.
  - Needs migration `20261022_account_lock.sql`.
- Admin portal, user page: **Change Role** (super admin only) switches an account between User and Admin. It's logged as **Admin Change Role**.
- Fixed: the super admin's edit, deactivate, activate and delete actions on admin accounts failed with "Unable to …", because the server only updated accounts with the User role.
- Both apps now run on **Expo SDK 58** (React Native 0.88, React 19.3). They need Expo Go for SDK 58, or a new development build or APK.

## 1.1.1 - 2026-10-18

- Permanently deleting an account, by an admin or by the person, now first does what deactivating does: their open offers are withdrawn, invitations to them are cancelled, their active requests close, and everyone affected is notified. Before, the delete removed their requests, offers and chats without telling anyone. Donation records, ratings and reports were already kept.

## 1.1.0 - 2026-10-14

- Chat: a meeting time is now a suggestion until the other person agrees. They can tap Agree or suggest another time, back and forth, until one side agrees. Changing an agreed time asks the other person again. Only an agreed time counts for the Scheduled step and for no-show reports. Needs migration `20261014_schedule_agreement.sql`.
- Chat: when the donor is marked as arrived, the requester's top card has **Not here yet** next to Confirm. It works like the trip map: the trip goes back to "on the way" and the donor gets a message. If the donor is still "on the way" after the agreed time, the card has **Didn't show up** next to Track.
- Admin donation details show when a meeting time was suggested but never agreed.
- Database: removed five empty, unused `blood_requests` columns left over from the original dashboard table (`patient_name`, `hospital`, `location_lat`, `location_lng`, `needed_by`) and the unused `haversine_km` function. Needs migration `20261014_remove_unused_columns.sql`.
- Sign in, Sign up, Forgot password, Reset password and Verify email are full screen like Home. The red header and its circles now run behind the clock instead of starting below a flat red strip, and the logo moves down with the header.
- Home: a pending donor application's button is now an orange **View Application** that matches the Pending badge. It used to be a red "Application Under Review →" action that repeated the card's subtitle. The button also widens to fit its label instead of squeezing it into a fixed 200 width.
- Complete your Profile and Apply as a Donor: steps now fade into each other instead of sliding in like a slideshow, so the header stays still. The progress bar keeps finished steps filled, and the new step's segment fills in from the left. Complete your Profile used to light up only the current step.
- Complete your Profile and Apply as a Donor: on iPhone, the top of the form card was hidden behind the header (cutting off the progress bar, the step title and the photo or map picture), and pink-red gaps showed at the sides and bottom. These screens now use the same frame as Request Blood: a compact header with a full-width rounded sheet over it.
- Request Blood and the chat: on phones, the Pick a Time wheels stretched across the whole sheet and pushed the AM/PM buttons off the edge. They now keep their size and sit centered.
- Live trips: when the database is missing an update, the error now names the right migration (it pointed to `20261003_donor_trips.sql` even when only `20261011_trip_arrival_check.sql` was missing).

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
