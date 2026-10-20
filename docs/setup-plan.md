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

Production preview/settlement requires a real verified owner session (`3jerryliu@gmail.com`) and server-only `SUPABASE_SERVICE_ROLE_KEY`. Demo sessions cannot use the API. Apply the additive `admin_compete_actions` migration before deployment. Load an athlete UUID, choose due-only settlement or early close, enter a reason and the exact target confirmation. The API checks the preview version, hydrates real peers, snapshots before/after state to the service-only audit table, and calls the existing account writer. Early close affects only the selected athlete and records real results; no production clock pin is persisted. No production settlement was executed during implementation.

The relational account writer performs several writes rather than one database transaction. Audit snapshots support investigation/recovery, but this tool does not provide atomic rollback or lock out an athlete’s concurrent account saves. Reload the preview after a failure; avoid running it while the target is actively changing account data. This is a draft operational tool pending production review.
