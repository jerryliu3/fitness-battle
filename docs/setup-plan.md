# Fitness Battle Setup Plan

## Local Development Environment

### Prerequisites

- **Node.js**: v22.x LTS
- **Package Manager**: `pnpm` v9.15.4 (`corepack enable pnpm`)
- **Docker**: Required if running local Supabase emulator

### Initial Setup

```bash
# Clone and navigate to repo
cd fitness-battle

# Install workspace dependencies
pnpm install

# Run type check across all workspaces
pnpm typecheck

# Run test suites across shared and web
pnpm test
```

### Running Applications

GPS route previews use `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` on web and `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` on mobile. Native interactive replay loads `/route-scene` from `EXPO_PUBLIC_API_URL`; that deployment needs its web Mapbox token. Apply the existing `20261024000000_activity_routes.sql` migration before deploying route persistence. Older activities need a backfill sync to populate route polylines (`POST /api/fitness/sync` with `provider: "strava", backfill: true` through the existing authenticated flow); ordinary incremental sync may not revisit them. Rows without geometry stay map-free. No precise personal-record segment geometry is currently available.

#### 1. Web Application (`apps/web`)

```bash
# Start Next.js development server on http://localhost:3000
pnpm --filter @fitness-battle/web dev
```

#### 2. Mobile Application (`apps/mobile`)

```bash
# Start Expo development server
pnpm dev:mobile

# Open on iOS Simulator: press 'i'
# Open on Android Emulator: press 'a'
```

### Database & Migrations (`supabase/`)

```bash
# Start local Supabase instance
pnpm supabase start

# Apply all migrations and reset local database
pnpm supabase db reset
```

### Environment Configuration

Copy `.env.example` to `.env.local` in `apps/web` and `apps/mobile`:
- Web: `apps/web/.env.example` -> `apps/web/.env.local`
- Mobile: `apps/mobile/.env.example` -> `apps/mobile/.env`
- Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for live database access.
- Provide `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` for tracker synchronization.

### In-app issue reports

Set `RESEND_API_KEY` and `ISSUE_REPORT_FROM` (a sender on a verified Resend domain) in the web server environment. `ISSUE_REPORT_TO` defaults to `support@overtaek.com`. Athlete → Report an issue opens an in-app dialog and sends through the server; no mail app is required. Live sign-in is required. Missing configuration or delivery failures stay visible in the dialog and preserve the report for retry.

### Round lab and production settlement

Open `/admin` (the owner’s Athlete screen links to Round lab). The sandbox copies the current account into isolated React state; Join running, Add 5 km, Advance one day, Close round and Preview results do not dispatch account writes or change the live clock. Reset discards the sandbox.

Production preview/settlement requires a real verified owner session (`3jerryliu@gmail.com`) and server-only `SUPABASE_SERVICE_ROLE_KEY`. Demo sessions cannot use the API. Apply the additive `admin_compete_actions` and `20261020041008_atomic_admin_round_commit.sql` migrations before deployment. Load an athlete UUID, choose due-only settlement or early close, enter a reason and the exact target confirmation. The API checks the preview version, reads existing field membership and real peer totals without invoking athlete-scoped seating RPCs, and calls the service-only `admin_commit_round` transaction. The transaction rechecks the locked account version and commits settlement rows and the before/after audit snapshot together. Activities, sleep nights and unrelated preferences are not rewritten. Early close affects only the selected athlete and records real results; no production clock pin is persisted. No production settlement was executed during implementation.

Failed admin commits roll back the entire settlement and audit insert. A stale preview is rejected under the account row lock. Ordinary account saves now use `save_compete_account`: one transaction checks the loaded version under that same row lock before writing any account tables. Web/native retain their base revision for dirty drafts, stop uploading after conflicts and offer explicit account reload with a local recovery copy. Apply `20261020134420_versioned_compete_account_save.sql` with the server/client rollout. Old builds that omit the base version receive a conflict and must update before saving. No production migration or settlement was executed during verification.

Regular field rosters require `20261020132114_field_roster_verified_totals.sql` before deploying the roster mapper. It extends the existing RPC response with Verified totals/rating while retaining authorization and older response columns. Private Crew fields now total activities directly, matching the removal of manual sharing.

Field-wide production controls require `20261020134920_admin_field_wave_controls.sql` and `20261021013557_respect_closed_field_seating.sql`. The seating follow-up excludes closed solo fields and redirects Crew re-seating to the immediate or scheduled replacement without reopening archived fields. Enter an athlete ID in Round lab, load their active fields, select the sport/field or Crew field, enter a reason and the exact WAVE confirmation. End-only closes all seated athletes at the action instant and schedules renewing athletes for the next normal Eastern Monday–Monday wave. Restart closes at that same instant and starts a disjoint wave immediately, ending next Monday Eastern. Scheduled opt-outs stay out; other sports remain unchanged. The service-only transaction locks the field and all member account rows, checks preview versions, commits every settlement and field change together, and records per-athlete plus field audit snapshots. No global clock change or production action was performed during verification.

The follow-up Compete scenario lab requires `20261021014247_admin_compete_scenarios.sql` and is documented in [admin-scenario-lab.md](admin-scenario-lab.md). It adds configurable activity, registration/renewal, field assignment, overtake direction, latest-results replay and generated-activity cleanup for selected database-backed athletes. Actions use service-only atomic SQL with account/field revision checks; no product clock or animation switches are introduced.

The October 21 feature stack adds immediate activity score milestones, durable personal records, scheduled Crew sessions and weekly field choices. Apply all five additive migrations listed in [feature-stack-2026-10-21.md](reviews/feature-stack-2026-10-21.md) before deploying the combined web/native clients. The same document records thresholds, qualifying-record rules, RSVP/rematch behavior and final local validation. No production migration or action was executed during implementation.

### October 2026 UX cleanup rollout

Apply additive migration `20261023043826_crew_activity_reads.sql` before rolling out Home Crew activity reads. The endpoint reuses active membership authorization and supports both latest-per-member previews and cursor pagination. Run `supabase/tests/crew-activity-reads.sql` against a disposable migrated database to verify authorization and cursor behavior before deployment.

Backend configuration now determines offline preview mode; the legacy demo-data flag does not bypass authentication in configured environments. Seeded synthetic accounts use real Supabase sessions and existing policies. Legacy local caches are backed up before account hydration and can be exported from Account. A backup error blocks the transition rather than discarding local data. Never use production sample-sync or sleep fixtures to claim a live tracker connection.

### Native cleanup and Crew level badges

The October 23 follow-up adds Expo-supported `@react-native-community/datetimepicker` and `@react-native-picker/picker`. Expo Go must match this checkout's SDK; standalone apps need a new binary for native dependencies and the light appearance configuration. The current native portrait renderer is SVG and does not depend on `/arena-scene`.

Apply `20261023154755_crew_member_effort_scores.sql` for Crew level badges. Without it, the roster remains readable and unknown peer badges stay hidden. Run `supabase/tests/crew-member-effort-scores.sql` in a disposable migrated database before rollout. This pass does not apply production migrations or verify the installed device bundle.

### Offline web font builds

Web product and design-study fonts are checked in under `apps/web/src/app/fonts/` with their upstream OFL licenses. Routes use `next/font/local`; ordinary production builds no longer require Google Fonts DNS, CSS or font downloads. WOFF2 assets preserve the existing font families, weights and CSS variables. Update fonts from the official Google Fonts repository and keep the license files together; see the font directory README.

### Private local route fixtures

Run `pnpm --filter @fitness-battle/web exec node scripts/seed-route-files.mjs /absolute/path/activity.gpx /absolute/path/activity.fit` from the repository root. The script uses the production parsers and writes `.local/route-activities.json`, which is ignored by Git. Never commit the supplied GPS files. With `pnpm dev:web`, backend-unconfigured local demo accounts automatically load these fixtures on sign-in or refresh, retaining original dates. Imported rows are labeled local previews and are Open-only, without a tracker connection claim. Supabase-configured and production deployments never serve this development endpoint. Native development uses the same endpoint at `EXPO_PUBLIC_API_URL`.

GPX/TCX/FIT imports now retain detailed GPS coordinates, a simplified preview, bounds and available elevation gain. File uploads remain imported/pending and never establish a live Garmin connection. Native and Expo-web replay pass detailed geometry through the WebView/iframe message bridge, keeping long tracks out of URLs.

### Full-screen sync and movement rollout

The October 24 event stack reuses #316's activity route maps/flyovers and existing scoring/persistence. No migration, native dependency or new environment variable is required. Debug's sync, combo and passed-by options launch the production full-screen UI with isolated local fixtures. Use **Reset debug preview** to restore the loaded account. See [flow contract and verification](reviews/fullscreen-events-2026-10-24/README.md). An updated native JS/binary delivery is required to see the new screens; this source change does not update an already installed app.

### Application startup readiness

Web and mobile mount the application under the existing launch cover. Dismissal
requires the launch animation, account hydration, the mounted screen, and initial
Home/Crew reads to settle. Web also waits for fonts and eagerly loaded images;
native waits for the application container layout and initial Home images. Request errors reveal the
existing error/retry UI. Home/Crew reads are bounded by transport timeouts.
`useBootLoading` registers screen reads with the platform boot gate; register new
initial reads there rather than adding splash timers. Once opened, later account
reloads and background refreshes keep the application mounted without replaying
startup. The eight-second native deadline releases only a stalled animation.
