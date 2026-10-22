# Hemo-Hero Mobile

The Hemo-Hero app for donors and requesters: sign up, apply as a donor, post or answer blood requests, coordinate in chat with a live trip map, confirm donations and rate each other.

Built with Expo SDK 57 (React Native 0.86) and Expo Router. It talks only to the [Hemo-Hero server](../server/README.md).

## Run it

1. Start the server first (`npm run dev` in `server/`).
2. Install and start the app:
   ```bash
   npm install
   npx expo start
   ```
3. Open it in **Expo Go**: scan the QR code with Expo Go on Android, or with the Camera app on iPhone. The phone must be on the same Wi-Fi or hotspot as the computer.

To open it in a browser instead, press `w` in the terminal (or run `npx expo start --web`).

The app finds the server by itself: it uses the address of the computer running `npx expo start`, port 5000. A `.env` file is only needed to use a server somewhere else (see `.env.example`).

## Good to know

- **Notifications:** Expo Go on Android can't receive push notifications, so the app shows new notifications itself while it's open. On iPhone, Expo Go receives push notifications. Profile → Notification Settings chooses which kinds of updates alert the phone; the Notifications inbox always keeps everything.
- **Location:** used for nearby searches and for sharing a trip with the requester. Expo Go only shares location while the app is open, so the screen stays on during a trip.
- **Signing out after inactivity:**
  - After 15 minutes without a touch or typing, the app signs out. A warning with a countdown shows 1 minute before. Coming back after 15 minutes in the background, or with the app closed, also signs out.
  - Like any sign-out, this turns off push notifications for that phone until the person signs in again.
  - For a demo, set `EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES` in `.env` to a shorter time (see `.env.example`).
- After installing or updating packages, start with `npx expo start -c` to clear the cache.

## Project layout

| Path | Contents |
|---|---|
| `src/app/` | Screens (file-based routes) |
| `src/components/` | Shared components: sheets, modals, the trip map, animations |
| `src/lib/` | API calls, session, notifications, image uploads |
| `src/constants/theme.ts` | Colors, fonts and sizes |
| `assets/images/` | App icon, splash screen and logo |

## Checks

```bash
npx tsc --noEmit
npx expo-doctor
```
