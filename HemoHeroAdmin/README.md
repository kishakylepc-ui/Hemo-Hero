# Hemo-Hero Admin Portal

The admin side of Hemo-Hero: approve donors, manage users, monitor blood requests and donations, handle reports, and see analytics and the log trail.

Built with Expo SDK 57 and Expo Router. It runs in a web browser and on iPad (Expo Go), and fills the screen in both orientations. It was designed for the iPad Pro 13".

## Run it

1. Start the server first (`npm run dev` in `server/`).
2. Copy `.env.example` to `.env`. The default, `EXPO_PUBLIC_API_URL=http://localhost:5000`, works in a browser on the same computer.
3. Install and start:
   ```bash
   npm install
   npx expo start --web --port 8082
   ```
   Then open http://localhost:8082. Port 8082 keeps it apart from the mobile app's Expo server, which uses 8081.

**On an iPad:** set `EXPO_PUBLIC_API_URL` to the computer's network address, for example `http://192.168.1.5:5000` (the server prints it at start-up). Then run `npx expo start` and open the project in Expo Go.

Only admin and super admin accounts can sign in. The [server README](../server/README.md#admin-accounts) explains the roles and how to create the first admin.

**Sessions:**
- After 15 minutes without a click, key press, scroll or touch, the portal signs out. A warning with a countdown shows 1 minute before.
- Activity in any open tab counts for all of them, and signing out in one tab signs out every tab.
- Pages other than sign-in open only when signed in, so a typed address or the Back button after signing out returns to sign-in.
- For a demo, set `EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES` in `.env` to a shorter time (see `.env.example`).

## Modules

| Tab | What it does |
|---|---|
| Dashboard | What needs attention now, totals, blood type demand, recent activity |
| Applications | Review donor applications and government IDs; approve or reject |
| Users | Search, create, edit, deactivate, lock or unlock, or delete user accounts. **Locked** lists accounts locked by an admin or after wrong passwords. The super admin also manages admin accounts and changes roles (User or Admin). |
| Requests | Every blood request, with filters and full details |
| Donations | Every donation record; mark flagged records valid or reject them |
| Analytics | Applications, accounts, request outcomes, donations, issues and activity |
| Issues | User reports and feedback: review, resolve or dismiss, and remove false requests |
| Log Trails | Record of user and admin actions |
| Settings | Your admin profile, password and email, and signing out. The super admin also gets **Data Backups**: back up now, the daily automatic backups, download and restore. |

## Project layout

| Path | Contents |
|---|---|
| `app/` | Screens (file-based routes) |
| `components/` | Header, bottom navigation, screen sizing (`AdminCanvas.ts`), animations |
| `lib/` | API calls and session |
| `assets/images/` | App icon, splash screen and logo |

## Checks

```bash
npx tsc --noEmit
npx expo-doctor
```
