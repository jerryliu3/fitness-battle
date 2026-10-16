# Fitness Battle

Mobile-first fitness battles with automatic tracker scoring and weekly standings.

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

# Local Supabase (optional). API is http://127.0.0.1:54621 so it can run next to other local stacks.
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

The public board is `/rankings`. Imports copy a full public results list (OpenTrack JSON, a MikaTiming list page, a CSV, or RunSignup's public results JSON), drop under-18 finishers, and write SQL under `packages/rankings/imports/`. See [`docs/ingestion.md`](./docs/ingestion.md). Set `NEXT_PUBLIC_RANKINGS_SUPABASE_URL` and `NEXT_PUBLIC_RANKINGS_SUPABASE_ANON_KEY` in `apps/web/.env.local`. Applying an import needs `RANKINGS_DATABASE_URL`.

## Auth (web)

Browsing My track / The field / Splits / Pace is open. **Join / compete / Athlete / onboarding** require an account.

The live product follows **Focus**: **Home** (daily suggestion and counted-session path), **Arena** (vertical 2D/3D lanes, registration, ghosts, and awards), **Crew** (shared activity and members), and **Athlete** (Elo and benchmarks first, then progress and settings). Stable routes remain `/today`, `/arena`, `/field`, and `/you`. See [the design guide](docs/design-guide.md) and [Focus implementation notes](docs/focus-implementation.md).

Weekly periods settle on app load via `rollClock` (UTC Monday boundary) — there is no server cron for the local compete engine. Closed weeks write place/Elo snapshots, show a one-shot week-complete reveal on My track, and accumulate a Strava-style season history on Athlete.

- `/signup` → `/onboarding` (preferences → tracker link → one-time 90-day calibration)
- `/login` with safe `?next=` return
- Demo mode stays on for local `pnpm dev` (`apps/web/.env.development` and `.env.local`). It stays off on preview and production unless `NEXT_PUBLIC_USE_DEMO_DATA=true` is set there. Placeholder Supabase keys also keep a device-local session.

### Local accounts

`pnpm supabase:reset` loads `supabase/seed.sql`. Password for each account is `password123`:

| Email | Use |
| --- | --- |
| `alice@example.com` | Finished onboarding. Owns crew **Weekday miles** (`WEEKLY`). |
| `bob@example.com` | Finished onboarding. Crew member. |
| `carla@example.com` | Finished onboarding. Crew member. |
| `dana@example.com` | Account only. Login still opens onboarding. |

## Integrations & data

- Tracker scope and stub-vs-live rules: [`docs/integrations.md`](./docs/integrations.md)
- What is loaded (OpenTrack 10K, synthetic compete field, etc.): [`docs/data-status.md`](./docs/data-status.md)

## Design prototype

Run `pnpm dev`, then open `/design` to compare archived individual-first experiences (Split, Bounce, Folio, Vector, After). **Evaluate directions** explains the interaction models. The live product shell follows **Focus** (see above); `/design` remains a comparative lab, not production chrome.

See [design directions v2](docs/design-directions-v2.md) and [the design guide](docs/design-guide.md).

Open `/design/spatial` for five interactive mileage comparisons: **Pursuit**, **Distance path**, **Circuit**, **Switchback**, and **Week replay**. Direct links use `?scene=pursuit|path|circuit|switchback|replay`. These public presentation routes use synthetic data, with no account or tracker authorization required. Three of the concepts use real 3D cameras and selectable avatars; the others use calibrated distance axes and milestone replay. See [the spatial study](docs/spatial-design-study.md) for mechanisms, evaluation tasks, and limitations.

The next exploration is `/design/evolution`: four complete identities (**VOLT**, **FORM**, **EVEN**, **CURRENT**) using Split's four navigation jobs, a nine-lane vertical distance track, and third-person Pursuit with a fixed starting line and customizable articulated runner. Use `?brand=even&view=field&mode=lanes` or `?brand=volt&view=field&mode=pursuit`. [Design evolution](docs/design-evolution.md) covers brand systems, interaction choices, evaluation, and the avatar art roadmap.

## Living docs

Living standards live in the Project Agent Store (and are summarized in-repo):

- `docs/design-guide.md`
- `docs/coding-principles.md`
- `docs/project-context.md`
- `docs/setup-plan.md`
- `docs/integrations.md`
- `docs/data-status.md`

See [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Interface concept gallery

The five original layout concepts remain separate from the live Focus application: web `/design/structure` and Expo `overtaek:///structure`. See [the study guide](docs/interface-structure-study.md) for previews and interactions.
