# Fitness Battle

Mobile-first fitness battles (group or 1v1) with automatic tracker scoring and weekly standings.

## Stack

Mirrors sibling repos (`goalmaxxing` / Cadence, `Coaching`):

| Layer     | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Mobile    | Expo Router (`apps/mobile`)                                            |
| Web / API | Next.js on Vercel (`apps/web`)                                         |
| Data      | Supabase (`supabase/`)                                                 |
| Shared    | `@fitness-battle/shared` (period model, fitness providers, demo data)  |
| Tracker   | Strava provider abstraction with mock stub when OAuth keys are missing |

## Quick start

```bash
pnpm install

# Web (Vercel-shaped) — demo UI + fitness API routes
pnpm dev

# Mobile (Expo)
pnpm dev:mobile

# Local Supabase (optional)
pnpm supabase:start
pnpm supabase:reset
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill Supabase / Strava values when available. Without them the UI runs on demo data and the Strava provider stubs connect/sync.

## Race rankings

Public race leaderboards live in this same web app, on a separate Supabase project from battles. Hosted project: [Race Rankings](https://supabase.com/dashboard/project/pzadctqmyekkydteivlf) (`pzadctqmyekkydteivlf`, us-east-1). Local config is `rankings-db/` (API port 54421, database port 54422).

```bash
pnpm rankings:db:start
pnpm rankings:db:reset
```

The first migration is the source ledger: provider result ids when present, otherwise source + edition + name + bib + category. Finish time is not part of that key.

The public board is `/rankings`. The first loaded race is the 2025 Estonian 10 km road championship from OpenTrack, under the Open Database License. Age groups entirely under 18 are dropped before insert. Set `NEXT_PUBLIC_RANKINGS_SUPABASE_URL` and `NEXT_PUBLIC_RANKINGS_SUPABASE_ANON_KEY` in `apps/web/.env.local`.

## Auth (web)

Browsing Today / Board / Pace is open. **Join / compete / You / onboarding** require an account.

- `/signup` → `/onboarding` (preferences → tracker link → one-time 90-day calibration)
- `/login` with safe `?next=` return
- Demo mode (`NEXT_PUBLIC_USE_DEMO_DATA=true` or placeholder Supabase keys) keeps a device-local session so flows work without a live project

## Integrations & data

- Tracker scope and stub-vs-live rules: [`docs/integrations.md`](./docs/integrations.md)
- What is loaded (OpenTrack 10K, synthetic compete field, etc.): [`docs/data-status.md`](./docs/data-status.md)

## Design prototype

Run `pnpm dev`, then open `/design` to compare five individual-first app experiences: Split, Bounce, Folio, Vector, and After. Each direction has personal progress, comparison, activity, history, and optional group views, with local sample interactions. **Evaluate directions** explains the different interaction models and tradeoffs.

See [design directions v2](docs/design-directions-v2.md) for the brand systems, research, evaluation tasks, and image provenance. The [first study](docs/design-exploration-v1.md) is retained as an archive. Existing app routes remain available.

Open `/design/spatial` for five interactive mileage comparisons: **Pursuit**, **Distance path**, **Circuit**, **Switchback**, and **Week replay**. Direct links use `?scene=pursuit|path|circuit|switchback|replay`. These public presentation routes use synthetic data, with no account or tracker authorization required. Three of the concepts use real 3D cameras and selectable avatars; the others use calibrated distance axes and milestone replay. See [the spatial study](docs/spatial-design-study.md) for mechanisms, evaluation tasks, and limitations.

## Living docs

Living standards live in the Project Agent Store (and are summarized in-repo):

- `docs/design-guide.md`
- `docs/coding-principles.md`
- `docs/project-context.md`
- `docs/setup-plan.md`
- `docs/integrations.md`
- `docs/data-status.md`

See [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md).
