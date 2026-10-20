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

#### 1. Web Application (`apps/web`)

```bash
# Start Next.js development server on http://localhost:3000
pnpm --filter @fitness-battle/web dev
```

#### 2. Mobile Application (`apps/mobile`)

```bash
# Start Expo development server
pnpm --filter @fitness-battle/mobile start

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

Field-wide production controls require `20261020134920_admin_field_wave_controls.sql`. Enter an athlete ID in Round lab, load their active fields, select the sport/field or Crew field, enter a reason and the exact WAVE confirmation. End-only closes all seated athletes at the action instant and schedules renewing athletes for the next normal Eastern Monday–Monday wave. Restart closes at that same instant and starts a disjoint wave immediately, ending next Monday Eastern. Scheduled opt-outs stay out; other sports remain unchanged. The service-only transaction locks the field and all member account rows, checks preview versions, commits every settlement and field change together, and records per-athlete plus field audit snapshots. No global clock change or production action was performed during verification.
