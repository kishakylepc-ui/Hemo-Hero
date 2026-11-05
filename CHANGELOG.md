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
- Mobile: new **Complete your profile** design, matching Sign In and Sign Up.
  - Red top with the drop and the wave, a short title per step ("Where are you based?", "Your blood type"), and labeled step bars (Personal · Location · Medical).
  - Same outlined fields as Sign Up. First and last name sit side by side, and gender is a three-way switch.
  - "Use my current location" is a large card that shows what it found. Back and Next stay in a bar at the bottom on every step; it hides while the keyboard is open.
  - The last screen says "You're all set!" with a summary of what was saved.
- **Deactivation reasons and account reviews.** Needs migration `20261102_account_reviews.sql`.
  - Admins must give a reason to deactivate or delete an account, and can tap a common one to fill it in. Deactivating from a report uses the admin note as the reason.
  - When a deactivated person signs in, they see when it happened and why (or "you deactivated your account"), and can send a **review request**.
  - Admins get a notification. Users has a **Review Requests** filter, and the person's page shows their message with **Reactivate** (approves it) or **Decline** (with a note the person sees next time).
  - Signing in with the email of a deleted account shows that it was removed and why.
  - Sign-in only says an account is deactivated after the password is right, so nobody learns it from an email alone.
- Mobile: the donor application status screen updates by itself when an admin approves or rejects it. While pending it checks every 10 seconds, right away when the notification arrives or the app comes back, and you can pull down to refresh.
- Mobile, donor profile: when the donor already offered to help with your active request, the profile says so with **View Their Offer** (or **Open Chat** once accepted) instead of **Request Help**. After you ask a donor, it shows "Request sent". The header has the curved edge, and the donations and rating card shows again (the app had been dropping those figures).
- Mobile: confirming and rating a donation now happen only in the chat.
  - The request page no longer has **Confirm Donation** or **Rate Donor**. Each accepted donor's card has **Open Chat** and a line saying what to do next, and still shows the donation record and ratings.
  - Accepting an offer asks you to **Open Chat**.
  - The donor's view of a request no longer has **Rate the Requester** or **Report a problem**. It still shows the record and ratings, and says to use the chat. **Report a problem** is now also in the chat's menu.
  - Donation notifications open the chat with the other person, for both sides.
  - **Mark as Fulfilled** and **Cancel Request** stay on the request page, because they apply to the whole request and it can have several donors.
- **Live statuses in both apps.** Screens that show a status now update by themselves while they're open.
  - Mobile: Home, Requests, your request, the donor's view of a request, donor profiles, Donation History, Notifications and Profile check every 10 seconds. Search and the nearby requests on Home check every 30 seconds, using your last location instead of the GPS each time. Every screen also checks right away when a notification arrives.
  - Admin: Dashboard, Applications, Users, Requests, Donations, Issues and Log Trails, with their detail pages, check every 10 seconds. Analytics and Backups check every 30 seconds. The bell checks every 10 seconds instead of every minute, and its open panel stays current.
  - Both apps check when you come back to the app or tab, and stop checking when you leave the screen.
  - Updates are quiet: no spinners, nothing you're typing gets replaced (offer messages, admin notes), and a failed check leaves the screen as it was. Checks don't count as activity, so the inactivity sign-out still works.
  - The server terminal prints a repeated GET once a minute, so the checks don't flood it.
- Mobile: the **Chat** tab shows how many unread chat alerts you have, on every screen that has the bottom bar. It updates every 15 seconds, when an alert arrives, and when you come back to a screen or the app. Chats that can no longer be opened aren't counted.
- Fixed: a donation could be confirmed before a meeting was agreed. Accepting an offer showed **Confirm Donation** right away, and the chat's Details section always offered it. Confirming now needs an agreed meeting time or a donor who has arrived. A record that was not accepted can still be confirmed again. The server checks this too.
- **First sign-in code for accounts made by an admin.** Accounts from Create User now confirm their email like any new account: the first sign-in with the right password emails a 6-digit code. The Admin Portal has a new **Verify Your Email** popup for it. In both apps, signing in with an unverified email now sends a code and opens the code screen right away.
- Admin accounts sign in only through the Admin Portal. In the user app they see a message pointing there, and the attempt is logged as unauthorized access.
- Admin, User Management: **Users** and **Admins** are now separate tabs that say who each is for, with a labelled **Status** row (All, Active, Inactive, Locked, Review Requests) that works in both. **Admins** used to look like one more status, and "All Users" left admins out.
- Admin, Analytics: a new **Trends** section with four charts from real data: line graphs of requests and donations, and of successful and failed system activity, each week; columns of bags needed and donated by blood type; and where requests and applications stand. Hover, focus or tap for the values, and the line and column charts can switch to a table.
- Admin, Data Backups: **Download** now saves the backup as a file in the browser instead of opening a new tab, which a popup blocker could stop. **Back Up Now** also offers **Download File** as soon as the backup is made.
- Admin, Data Backups: **Restore from File** (in a browser, Super Admin only) puts back a backup file downloaded earlier. The file is checked first, you type RESTORE to confirm, and a "Before restore" backup is made so you can undo it. Logged as `RESTORE_BACKUP_FILE`.
- Admin, Data Backups: every backup can also be downloaded as a **.sql** file (in a browser) to run in the Supabase SQL editor. It does the same as Restore, in one transaction. JSON stays, and Restore from File still uses it. Logged as `DOWNLOAD_BACKUP_SQL`.
- Admin: the Log Trails table has an **IP Address** column.
- Admin: the name at the top right now opens an account menu with your details, **Account Settings**, **Change Password**, **Data Backups** (Super Admin only) and **Sign Out**, which asks once before ending the session.
- Fixed: **Create User** in the Admin Portal always failed with "Please enter a username", and choosing **Admin** would have made a regular user. The portal wasn't sending the username or the role to the server.
- Fixed: server errors could expose internal details. A malformed request returned a page with a stack trace and file paths, and 17 error replies passed on raw internal messages. Replies now use plain messages, and the details stay in the server log.
- Fixed: you could invite a donor who had already offered to help with the same request. The server now refuses with a message that their offer is on your request.
- Fixed: **Browse Blood Requests** on the approved donor application opened your own Requests tab. It now opens Search on the Requests tab, showing requests near you.
- Fixed: Verify Email, Forgot Password and Reset Password showed a red band above the keyboard on phones.
- Fixed: in Complete your Profile, tapping a day in the birthday calendar saved it and closed the calendar before you'd set the month and year. The day is now only highlighted; change the year or month in any order (the day carries over), then tap **Use This Date**.
- Fixed: the admin portal on an iPad (Expo Go) couldn't reach the server, because `.env` pointed at `localhost` (the iPad itself). It now finds the server on the computer running Expo, like the mobile app, so no IP needs typing in.
- Fixed: the back button on the first Complete your Profile step did nothing. It now asks "Leave setup?" and signs you out (Android's back button too); you finish the profile the next time you sign in. The "Thank You" screen no longer has a back button, since the profile is already saved.

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
