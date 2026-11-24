# Fitness Battle Project Context

## Overview

**Fitness Battle** (product name: **Overtaek**) is a mobile-first athletic competition platform combining weekly asynchronous workout competition with road race leaderboards.

The core product features:
- **Weekly Compete Engine**: Daily 06:00 Eastern registration waves with a shared Sunday-night finish and Monday 06:00 renewal, where athletes log workouts (running, cycling, walking, strength) to compete on native sport volume. Per-sport Effort Scores combine weekly training capacity, cumulative training history, and a bounded competition adjustment; ranks finalize at the weekly recap.
- **Focus shell**: Home / Compete / Progress / Crew (route IDs `/today`, `/arena`, `/you`, `/field`), with Athlete settings behind the profile entry (`/athlete`). Vertical competition lanes and optional portrait perspective; private crew shared fields; Progress training, effort scores, records and history.
- **Race Rankings**: Public road race leaderboards (5K, 10K, half, marathon) backed by verified open-data results.
- **Multi-tracker Ingestion**: Strava OAuth sync, Apple HealthKit sync, Garmin FIT/TCX/GPX imports, and manual logging with synthetic demo fallback.

## Architecture

- **`apps/mobile`**: React Native & Expo Router application targeting iOS and Android with HealthKit sync, SecureStore auth token handling, native 2D lanes and portrait perspective. The earlier WebView-hosted Three.js pursuit remains available in code.
- **`apps/web`**: Next.js App Router application delivering the mobile phone shell, PWA support, OAuth callbacks, API endpoints, and rankings explorer.
- **`packages/shared`**: Pure TypeScript library containing:
  - Compete engine (`engine.ts`, `ledger.ts`, `effort.ts`, `sports.ts`, `elo.ts`)
  - Period calculation (`period.ts`)
  - Shared domain types and mock data generator
  - Strictly platform-agnostic (no DOM, no React, no React Native).
- **`packages/pursuit`**: Shared Three.js Arena 3D scene for web and Expo web.
- **`packages/rankings`**: Parser fixtures and data ingestion tools for official race results.
- **`supabase/`**: PostgreSQL database schema, migrations, and Row-Level Security (RLS) policies.

## Planned activity detail

The owner wants FIT and health-source metrics imported, retained and displayed for non-GPS activities too, including strength sessions with no route. This is a follow-up to v1 GPS maps; do not invent coordinates or treat the absence of a route as the absence of an activity. Current FIT session import retains duration and average heart rate. Activity details now include session-level scatterplots, five-session trends (including a relative Speed / HR index), and the selected session's contribution to seven-day logged volume; see [implementation review](reviews/activity-detail/README.md). These use recorded session summaries. Rich within-session sample-series storage and charts remain future work.


## Native startup loading

Startup shows the canvas while bundled fonts load, followed by the launch animation
running on the UI thread. Native auth, privacy and compete providers mount immediately,
and navigation and screen requests mount underneath the cover right after the initial
splash frame paints so loading happens in the background without stalling the animation.
The splash must still finish its full race animation before revealing the home screen,
holding its final frame with a spinner if account/privacy readiness, screen requests,
images or layout are still settling.
The blocked-athlete privacy read stays behind that cover; ordinary loading never
shows safety-settings copy. Privacy failures still expose Retry and Sign out. The
launch gate remains mounted across sign-in and foreground privacy refresh, so later
reads do not replay startup. Account and privacy reads still gate protected content.

Activity training uses shared Training XP (1,000 XP per sport reference week). Activity details, sync summaries and training totals share that input with the profile Effort Score. Session effort bars compare session volume rather than intensity. No separate XP balance is persisted.

### Crew invite links

Mobile shares `https://overtaek.xyz/invite?invite=CODE`. The native app routes the
recipient to Crew with the code prefilled after account setup. The browser
landing page offers Open in app or Continue on web with the same code.

Public athlete links use `https://overtaek.xyz/athlete?id=USER_ID` (web
redirects to `/app/athlete`). Crew invite links should use
`https://overtaek.xyz/invite?invite=CODE`, not bare `/field` URLs.

For automatic opening, deploy the web app on `overtaek.xyz` with
`INVITE_APPLE_APP_ID` set to the signed iOS app's application identifier
(typically `TEAMID.com.overtaek.app`) and `INVITE_ANDROID_SHA256` set to the
colon-separated SHA-256 fingerprint of the certificate signing the installed
Android app. For Play Store builds use the Play app signing certificate.
Multiple fingerprints can be comma-separated. Check that both
`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
return JSON directly, then install fresh native builds and tap an invite from
Messages with the app installed and again without it.
