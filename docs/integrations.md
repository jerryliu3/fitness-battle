# Fitness integrations

Cloud OAuth token exchange runs on the web server. The mobile app starts the same connect flow in an in-app auth session (ASWebAuthenticationSession / Chrome Custom Tabs); callbacks return via `overtaek:///you` (browser fallback `/you`). Apple Health and Health Connect run on the phone and post into the same API. Missing keys keep a provider on the stub path. A stub is never shown as a live connection.

## Status matrix

| Integration | Kind | Maturity | Without credentials | With credentials |
| --- | --- | --- | --- | --- |
| Strava | Activity | Stub-ready, live path coded | `status=stub`, mock activities | OAuth → token exchange → refresh → activity pull |
| Mock | Activity | Always on | Demo workouts | Same |
| Garmin | Activity | Stub-ready, plus file import | Stub sync. FIT/GPX/TCX/zip import is real | OAuth 1.0a pull and Health API ping |
| Apple Health | Activity | Device ingest (iOS only) | Web cannot read HealthKit | iOS build posts workouts to `/api/fitness/ingest` (HealthKit via call-time `NativeModules` bind; Expo Go unsupported) |
| Health Connect | Activity | Device ingest (Android only) | Web cannot read Health Connect | Expo Android build posts to `/api/fitness/ingest` |
| WHOOP | Readiness + workouts | Stub-ready, live path coded | Stub sync | OAuth → recovery score and workouts |
| Oura | Readiness + workouts | Stub-ready, live path coded | Stub sync | OAuth → daily readiness and workouts |

Catalog source: `packages/shared/src/fitness/providers.ts`.

## Push notifications

| Surface | Token | Delivery |
| --- | --- | --- |
| iOS / Android (dev/prod build) | Expo push token via `expo-notifications` | Server → Expo Push API → APNs/FCM |
| Simulator / demo | Stub token (`stub-*`) | Outbox `stubbed` only |
| Web | Browser permission + stub device row | Local `Notification` API; no web-push VAPID yet |

Tables: `notification_preferences`, `push_devices`, `notification_outbox`. Routes: `GET/PUT /api/notifications`, `POST /api/notifications/test`, `POST /api/notifications/send`. Optional env: `EXPO_ACCESS_TOKEN`.

API auth: cookie session (web) or `Authorization: Bearer <access_token>` (mobile). The request-scoped Supabase client must carry that Bearer so RLS can write `push_devices`.

Migrations under `supabase/migrations/` are applied by `.github/workflows/supabase-migrate.yml` on push to `main` (needs GitHub Actions secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`). You can also enable Supabase → Project Settings → Integrations → GitHub for the same effect.

Product hooks (web play shell):

| Category | When |
| --- | --- |
| `week_summary` | New `periodResults` row after week settlement |
| `rival_moves` | Your open-board place worsens |
| `lesson_reminder` | Once per Eastern day if today’s lesson is still open |
| `connection_alerts` | Tracker sync/connect failure on You |

## Keys

Set these on the web server. Leave them empty until you have them. Demo mode (`NEXT_PUBLIC_USE_DEMO_DATA=true`) refuses to finish OAuth even if the keys are present.

| Provider | Variables | Redirect |
| --- | --- | --- |
| Strava | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | `/api/fitness/strava/callback` |
| WHOOP | `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` | `/api/fitness/whoop/callback` |
| Oura | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` | `/api/fitness/oura/callback` |
| Garmin | `GARMIN_CONSUMER_KEY`, `GARMIN_CONSUMER_SECRET` | `/api/fitness/garmin/callback` |

### WHOOP developer dashboard

WHOOP asks for public URLs when you create an app. Privacy and the app website are product-wide (same URLs you’d give Strava or Oura). The OAuth redirect is provider-specific — each tracker’s developer console registers its own callback, which is the usual consumer-app pattern.

Use your deployed web origin (production example: `https://fitness-battle-one.vercel.app`):

| Dashboard field | Public URL |
| --- | --- |
| Privacy policy | `{origin}/privacy` |
| App / website link | `{origin}/` |
| Redirect URI | `{origin}/api/fitness/whoop/callback` |

Set `WHOOP_REDIRECT_URI` to the same Redirect URI value (including `http://localhost:3000/...` for local). After WHOOP sends the user back with an auth code, the callback exchanges the token and redirects into Athlete (`/you?tracker=...&provider=whoop`).

Garmin also needs `POST /api/fitness/garmin/ping` registered as the Health API notification URL after approval. The consumer key is not self-serve.

Apple Health and Health Connect have no server keys. The phone app needs a development or TestFlight build (`EXPO_PUBLIC_API_URL` pointing at this web app) and a signed-in Supabase session. Expo Go cannot read HealthKit or Health Connect. On iOS, sync resolves `NativeModules.AppleHealthKit` at call time so New Architecture lazy loading does not leave `initHealthKit` undefined. The mobile You trackers list shows Apple Health only on iOS and Health Connect only on Android; tapping the row syncs from the device (there is no nested connections screen).

Mobile can start Strava / Garmin / WHOOP / Oura connect itself: `POST /api/fitness/connect` with Bearer auth, then `WebBrowser.openAuthSessionAsync(authorizeUrl, overtaek://)`. Connect signs OAuth `state` with a `bearer` or `session` channel: Bearer (mobile) callbacks do not need a web cookie; cookie-session (web) callbacks still require the browser session to match (CSRF bind). The HTTPS callback deep-links to `overtaek:///you`, which dismisses the auth sheet. The app listens for that deep link for the whole auth attempt (and briefly after Android `dismiss`) so Custom Tabs races do not report a false cancel; stale `getInitialURL` values are ignored.

## Garmin file import

`POST /api/fitness/import` accepts one `.fit`, `.gpx`, `.tcx`, or `.zip` of those files. Parsed activities are stored as Garmin and applied to the local effort board. This does not require Garmin API approval.

## Sync evidence (UI)

| Evidence | Meaning |
| --- | --- |
| `never_asked` | Not linked |
| `disconnected` | Was linked, now off |
| `stub` | Demo sync — not live OAuth |
| `asked` | Linked, no samples yet |
| `receiving_data` | Fresh sample within 36h |
| `stale` | Linked but last sample is old |

## API surface

| Route | Auth | Role |
| --- | --- | --- |
| `POST /api/fitness/connect` | Required. Body `provider` | Start OAuth or stub |
| `GET /api/fitness/strava/callback` | Signed `state` + session match | Strava token exchange |
| `GET /api/fitness/whoop/callback` | Signed `state` + session match | WHOOP token exchange |
| `GET /api/fitness/oura/callback` | Signed `state` + session match | Oura token exchange |
| `GET /api/fitness/garmin/callback` | Request token must belong to a user | Garmin access token |
| `POST /api/fitness/garmin/ping` | Garmin server. Callback host must be `apis.garmin.com` | Pull summaries after a ping |
| `POST /api/fitness/sync` | Required. Body `provider` | Pull a window |
| `POST /api/fitness/disconnect` | Required. Body `provider` | Clear connection and tokens |
| `GET /api/fitness/status` | Required | Every connection + catalog |
| `POST /api/fitness/ingest` | Required. `apple_health` or `google_health` | Phone workout upload |
| `POST /api/fitness/import` | Required. Multipart `file` | Garmin file import |

Tokens live in `private.fitness_tokens`. The mobile app sends `Authorization: Bearer` from the Supabase session.

## One-time backfill

Onboarding (and You, until used) offers a one-time 90-day calibration (`import-history` / `mark_backfill_complete`). After `calibrated` / `backfill_completed_at` is set, it cannot run again. A live provider sync uses the same 90-day horizon on the first pull.

## Connected fitness privacy disclosures

The public policy at `/privacy` covers all connected fitness services, with
Garmin as an example rather than a separate policy. It describes activity uses,
Vercel and Supabase processing, competition/crew visibility, no sale or advertising
use, no AI processing or model training/evaluation/improvement, and email requests
for access, correction, export and deletion. Disconnect stops future sync;
deletion of previously imported records is a separate request. Keep disclosures
current before adding a processor or new data use. Publish the updated policy
before submitting its URL to a provider. The existing `/icons/icon-192.png` asset
fits Garmin’s developer application maximum 300×300 branding size.
