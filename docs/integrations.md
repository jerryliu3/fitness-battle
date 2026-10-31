# Fitness integrations

Cloud OAuth token exchange runs on the web server. The mobile app starts the same connect flow in an in-app auth session (ASWebAuthenticationSession / Chrome Custom Tabs); mobile callbacks return via `overtaek:///you` with `panel=connections`; web callbacks stay on the website. Apple Health and Health Connect run on the phone and post into the same API. Missing keys keep a provider on the stub path. A stub is never shown as a live connection.

## Status matrix

| Integration | Kind | Maturity | Without credentials | With credentials |
| --- | --- | --- | --- | --- |
| Strava | Activity | Stub-ready, live path coded | `status=stub`, mock activities | OAuth → token exchange → refresh → activity pull |
| Mock | Activity | Always on | Demo workouts | Same |
| Garmin | Activity | Stub-ready, plus file import | Stub sync. FIT/GPX/TCX/zip import is real | OAuth 2.0 PKCE and durable Starter push inbox; live delivery verification pending |
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
| App / website link | `{origin}/` (marketing) · `{origin}/app` (signed-in product) |
| Support & account deletion | `{origin}/support` (deletion: `{origin}/support#delete-account`) |
| Redirect URI | `{origin}/api/fitness/whoop/callback` |

Set `WHOOP_REDIRECT_URI` to the same Redirect URI value (including `http://localhost:3000/...` for local). After WHOOP sends the user back with an auth code, the callback exchanges the token and redirects into Athlete (`/you?tracker=...&provider=whoop`).

Garmin Starter delivers activity summaries through the push inbox. Configure the endpoint only after applying its migration and deploying the receiver. The existing ping handler remains for legacy ping/pull and is not the Starter receiver.

Apple Health and Health Connect have no server keys. The phone app needs a development or TestFlight build (`EXPO_PUBLIC_API_URL` pointing at this web app) and a signed-in Supabase session. Expo Go cannot read HealthKit or Health Connect. On iOS, sync resolves `NativeModules.AppleHealthKit` at call time so New Architecture lazy loading does not leave `initHealthKit` undefined. The Athlete tracker list shows Apple Health only on iOS and Health Connect only on Android; tapping the row syncs from the device (there is no nested connections screen). Health Connect reads exercise sessions and distance (`READ_EXERCISE`, `READ_DISTANCE`). Heart rate, sleep, and health writes are blocked in the manifest.

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
| `GET /api/fitness/garmin/callback` | Signed state and PKCE | Garmin OAuth 2 token exchange |
| `POST /api/fitness/garmin/ping` | Legacy ping/pull | Not compatible with Garmin Starter push |
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

## Garmin Starter push inbox

Apply the `garmin_push_inbox` migration before deploying the receiver. Set independent random `GARMIN_WEBHOOK_SECRET` and `CRON_SECRET` values of at least 32 characters in Vercel. Configure Garmin's Activities push URL as `https://www.overtaek.xyz/api/fitness/garmin/push/<GARMIN_WEBHOOK_SECRET>` and enable it only after deployment and a delivery test. This URL contains a credential: limit access to the Garmin dashboard and any request logs, and rotate it if exposed.

The receiver authenticates the URL, writes the payload to a private service-role-only inbox and acknowledges after the write. It processes after the response and runs a daily Vercel cron as a retry fallback. Jobs use five-minute leases and failed work remains in the inbox; duplicate identical deliveries are deduplicated and successful payloads are removed. Alerts and operational monitoring for repeatedly failing jobs still require setup. Starter access does not provide historical backfill.

## Client-triggered cloud refresh

Web and native clients request cloud refresh on startup, on return to the foreground, and hourly while active. Only connected Strava, WHOOP and Oura accounts are pulled. The server enforces one automatic attempt per hour and at most three manual attempts per rolling hour per athlete/provider, with a five-minute concurrency lease. Clients refresh the canonical account after pulling. There is no scheduled server job that scans athletes for provider pulls. Mobile operating systems may suspend the app, so the hourly client interval is not a guarantee while backgrounded. Garmin remains push-only on Starter, and device health access requires the native device permissions.

Onboarding uses the same live tracker authorization controls as Athlete. Draft setup is preserved through the provider redirect. A newly connected Strava, WHOOP or Oura link triggers the client refresh immediately, including when the native auth session returns without remounting the app. Garmin Starter only supplies new pushed activities, not historical onboarding calibration.

Use the secret as the final path segment because query-string preservation in Garmin endpoint configuration has not been verified. The previous query-key route remains compatible. Neither bare `/push` nor an incorrect secret is accepted. Verify the saved destination after reloading Garmin Tools, then confirm an actual inbox delivery.

OAuth callback routing uses the verified state channel: session/web requests return directly to the web app, while bearer/mobile requests open the native scheme. Unverified state cannot initiate a native handoff. Native links include `panel=connections` to avoid an extra settings redirect in compatible older builds. A native crash still requires device crash diagnostics; server token-exchange success does not prove native UI success.

## Provider account ownership

Cloud consent binds the provider's external user ID to the authenticated Overtaek user in signed OAuth state; it never matches emails. A provider account may be owned by only one Overtaek account through the token-storage RPC. Existing legacy duplicate mappings retain the previous LIMIT 1 lookup; they are not deduplicated automatically. Reconnecting while signed into another app account does not implicitly transfer the provider account or its imported activities.


### Garmin GPS evidence and routes

Garmin Activities summaries are not full routes. GPS credit requires valid starting
coordinates or route samples, a distance sport, and a non-manual outdoor activity
type. Indoor/treadmill/virtual and unknown summaries remain recorded Open activity.
Both sample conversion and server persistence honor the provider's GPS evidence.
A single starting coordinate never creates a map. Supplied samples retain route
geometry and replay through the existing file-route conversion. The Starter receiver accepts Activities, nested Activity Details, Activity Files,
Manually Updated Activities and MoveIQ. Summaries, details and files share the Garmin
activity ID, so additional deliveries enrich one activity. Route geometry and replay
survive later summary deliveries. MoveIQ is retained without adding overlapping
scored workouts; manually edited activities do not gain GPS credit.

All configured Garmin Health feeds are retained in private owner-scoped records:
blood pressure, body composition, breathing variations, daily summaries, epochs,
HRV, snapshots, hydration, nutrition, pulse oxygen, respiration, skin temperature,
sleep, stress and user metrics. Sleep stages, duration and the device sleep score
(or the existing shared sleep formula when no score is supplied) populate the
existing sleep view. Other metrics are retained for future presentation; enabling
a feed does not imply a chart for every field. Owner-only reads are available at
`GET /api/fitness/garmin/records?feed=<feed>` with `before` pagination.

Use the same authenticated push URL for every supported feed. Health deliveries
require HEALTH_EXPORT (Daily Health Stats) consent in addition to ACTIVITY_EXPORT.
Deregistration removes tokens and marks all links to that Garmin account disconnected;
permission changes are retained and update connection availability, ignoring older
events. Training and Courses are outbound device features, not additional workout
history feeds.

Each delivery is atomically split into record-level leased inbox jobs. Push bodies
are limited to 4 MB; file downloads to 10 MB. Files use only Garmin's exact HTTPS
activityFile callback endpoint, prohibit redirects and cache the one-use response
before parsing or persisting activities. A Supabase cron checks only queued deliveries every minute and wakes the worker
when due work exists, using a separate Vault-managed token; the existing daily
Vercel retry remains a fallback. This does not pull data across user accounts.
Configure `garmin_inbox_retry_url` and `garmin_inbox_retry_token` in Vault per
environment; without them the scheduler makes no HTTP request. File callback URLs
expire after 24 hours, so a prolonged outage can require Garmin resending the file. Historical Starter backfill is not available; the Garmin
Summary Resender may replay recently retained records where supported.

