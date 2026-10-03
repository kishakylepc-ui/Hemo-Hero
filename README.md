# Hemo-Hero

Hemo-Hero connects people who need blood with verified donors nearby. Requesters post blood requests, compatible donors offer to help or accept an invitation, and both sides coordinate in an in-app chat with a live trip map. Every donation is recorded and rated. Administrators verify donors and monitor the whole cycle from a web portal.

## Parts

| Folder | What it is | Built with |
|---|---|---|
| [server](server/) | API server for both apps | Node.js, Express, Supabase (database, sign-in, file storage) |
| [HemoHeroMobile](HemoHeroMobile/) | App for donors and requesters (Android, iPhone, web) | Expo SDK 57, React Native, Expo Router |
| [HemoHeroAdmin](HemoHeroAdmin/) | Admin portal (browser, iPad) | Expo SDK 57, React Native Web, Expo Router |

Maps use OpenStreetMap with OSRM routing; notifications use Expo's push service.

## The donation cycle

1. A user signs up and applies to be a donor (blood type with a photo as proof, donation history, availability, government ID).
2. An admin reviews the application and approves the donor.
3. A requester posts a blood request (blood type, units, facility, urgent or scheduled).
4. A nearby donor whose blood type is compatible, and who has waited long enough since their last donation, offers to donate or accepts the requester's invitation.
5. The requester accepts the donor. They agree on a time in the chat, and the donor can share a live trip on the map.
6. The requester confirms the donation (one bag, 450 mL, per donor). It is recorded automatically; only records that fail a check, or that the donor reports, go to an admin for review.
7. Both sides rate each other.

Requests close automatically once they are past their time (see [server/README.md](server/README.md#background-jobs)).

## Running everything on one laptop

You need Node.js 22 or newer, a Supabase project, and the Expo Go app on the phones.

1. **Server** (port 5000)
   ```bash
   cd server
   npm install
   # create .env from .env.example
   npm run dev
   ```
2. **Admin portal** (browser, port 8082)
   ```bash
   cd HemoHeroAdmin
   npm install
   # create .env from .env.example
   npx expo start --web --port 8082
   ```
3. **Mobile app** (Expo Go)
   ```bash
   cd HemoHeroMobile
   npm install
   npx expo start
   ```
   Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The phones must be on the same Wi-Fi or hotspot as the laptop.

First-time database setup and creating the admin account are in [server/README.md](server/README.md).

### If a phone can't connect

- School and public Wi-Fi networks often stop devices from reaching each other. Use the laptop's mobile hotspot, or connect the laptop to a phone's hotspot.
- On Windows, allow Node.js through the firewall on private networks, and set the Wi-Fi network's profile to Private.
- After installing or updating packages, start Expo with `npx expo start -c` to clear its cache.

## Checks

Run these inside each folder:

| Folder | Command |
|---|---|
| `server` | `npm test` |
| `HemoHeroMobile`, `HemoHeroAdmin` | `npx tsc --noEmit` and `npx expo-doctor` |
