# BakuNights

BakuNights is a dark, mobile-first nightlife and dining discovery experience for Baku. It highlights tonight’s restaurants, bars, pubs, lounges, and limited-time offers in a polished single-page interface.

The repository contains both the original web/PWA experience and a native Expo application for iOS and Android.

## Stack

- React 19 and TypeScript
- Expo SDK 54 and React Native 0.81 for the native app
- Apple Maps on iOS through `react-native-maps`
- Native foreground location through `expo-location`
- Vite 8
- Tailwind CSS 4 through `@tailwindcss/vite`
- Fraunces and Outfit via Google Fonts
- OpenStreetMap embeds—no map key required
- Custom UI components and inline SVG icons; no component library

## Run locally

```powershell
cd C:\Users\kanan\Desktop\Haragedek
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

To view it on an iPhone or Android phone, keep the phone and computer on the same Wi-Fi and open `http://<computer-ip>:5173`. Run `ipconfig` to find the computer’s IPv4 address.

## Run the native app with Expo Go

The mobile dependency tree is intentionally isolated from the web workspace so Expo Go always resolves SDK 54.

```powershell
cd C:\Users\kanan\Desktop\Haragedek\apps\mobile
npm.cmd install
npx.cmd expo start --lan --clear
```

Keep the iPhone and computer on the same Wi-Fi. Open the iPhone Camera, scan the terminal QR code, and choose **Open in Expo Go**. When BakuNights asks for location access, choose **Allow While Using App**.

If the router blocks local device connections, use a tunnel instead:

```powershell
npx.cmd expo start --tunnel --clear
```

## Commands

```powershell
npm.cmd run dev          # BakuNights Vite server
npm.cmd run build        # production frontend build
npm.cmd run typecheck    # frontend TypeScript validation
npm.cmd run lint         # frontend ESLint
npm.cmd run test:mobile  # WebKit/iPhone + Chromium/Android interaction checks
npm.cmd run dev:mobile   # native Expo/Metro server
npm.cmd run lint:mobile
npm.cmd run typecheck:mobile
```

## Frontend structure

- `apps/web/src/App.tsx`: venue data and all application components
- `apps/web/src/index.css`: Tailwind import, theme tokens, global styles, glass effects, map filter, and animations
- `apps/web/public`: PWA manifest, icon, and service worker
- `apps/mobile/app`: native Expo Router screens
- `apps/mobile/src`: native venue data and taxi UI

The former API workspace remains in the repository for potential future persistence, but the current BakuNights prototype is intentionally self-contained and uses the six specified hardcoded venues.

## Venue onboarding and moderation

The API now includes admin and merchant tooling for getting real venue deals onto BakuNights without publishing unreviewed offers.

Local setup:

```powershell
cd C:\Users\kanan\Desktop\Haragedek
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev:fullstack
```

Seeded admin accounts:

- `admin@bakunights.test` / `admin1234`
- `ops@bakunights.test` / `admin1234`

Seeded merchant account:

- `merchant@grubstub.test` / `merchant123`

Admin approval walkthrough:

1. Open `http://localhost:5173/login?next=/admin` and log in with `admin@bakunights.test`.
2. Go to `/admin`.
3. Review the dashboard counts: active venues, deals live today, and pending reviews.
4. In the moderation queue, approve a pending merchant deal or reject it with a note.
5. Approved deals become publicly visible because the consumer feed only returns deals with `status = approved`.
6. Rejected deals stay hidden and show the merchant the admin's review note in `/merchant`.

Merchant walkthrough:

1. Open `http://localhost:5173/login?next=/merchant` and log in with `merchant@grubstub.test`.
2. Go to `/merchant`.
3. Create or edit a deal. Merchant submissions are saved as `pending_review` and stay inactive until admin approval.
4. If the merchant has no verified venue, search for an unclaimed venue and submit a claim with phone, email, and proof notes. Admins review these from `/admin`.

Phase 3 trust logic later:

The schema already stores deal submitters, reviewers, timestamps, statuses, and audit logs, so a later trusted-merchant rule can calculate consecutive approvals per venue. To finish that phase, add a revocable venue trust flag, complaint/flag records for live deals, and an approval job that auto-approves only when the venue remains trusted and unflagged. Every auto-approval should still write `AuditLog`.
