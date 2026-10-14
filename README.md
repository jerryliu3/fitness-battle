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

# Mobile (Expo Router — tabs match web: Track / Field / Splits / You)
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

The public board is `/rankings`. Imports copy a full public results list (OpenTrack JSON, a MikaTiming list page, a CSV, or RunSignup's public results JSON), drop under-18 finishers, and write SQL under `packages/rankings/imports/`. See [`docs/ingestion.md`](./docs/ingestion.md). Set `NEXT_PUBLIC_RANKINGS_SUPABASE_URL` and `NEXT_PUBLIC_RANKINGS_SUPABASE_ANON_KEY` in `apps/web/.env.local`. Applying an import needs `RANKINGS_DATABASE_URL`.

## Auth (web + mobile)

Browsing My track / The field / Splits / Pace is open on web and in the Expo app. **Join / compete / Athlete / onboarding** require an account. Mobile uses the same demo-auth or Supabase session model; phone health sync lives on Athlete and `/connections`.

Primary product IA follows the Split direction: effort track + previous-week ghost on **My track**, POV pursuit and bird’s-eye distance path on **The field**, counted sessions on **Splits**, and identity/connections on **Athlete**.

Weekly periods settle on app load via `rollClock` (UTC Monday boundary) — there is no server cron for the local compete engine. Closed weeks write place/Elo snapshots, show a one-shot week-complete reveal on My track, and accumulate a Strava-style season history on Athlete.

- `/signup` → `/onboarding` (preferences → tracker link → one-time 90-day calibration)
- `/login` with safe `?next=` return
- Demo mode (`NEXT_PUBLIC_USE_DEMO_DATA=true` or placeholder Supabase keys) keeps a device-local session so flows work without a live project

## Integrations & data

- Tracker scope and stub-vs-live rules: [`docs/integrations.md`](./docs/integrations.md)
- What is loaded (OpenTrack 10K, synthetic compete field, etc.): [`docs/data-status.md`](./docs/data-status.md)

## Design prototype

Run `pnpm dev`, then open `/design` to compare five individual-first app experiences: Split, Bounce, Folio, Vector, and After. Each direction has personal progress, comparison, activity, history, and optional group views, with local sample interactions. **Evaluate directions** explains the different interaction models and tradeoffs.

See [design directions v2](docs/design-directions-v2.md) for the brand systems, research, evaluation tasks, and image provenance. The [first study](docs/design-exploration-v1.md) is retained as an archive. The live product shell now uses the Split structure; `/design` remains the comparative lab.

Open `/design/spatial` for five interactive mileage comparisons: **Pursuit**, **Distance path**, **Circuit**, **Switchback**, and **Week replay**. Direct links use `?scene=pursuit|path|circuit|switchback|replay`. These public presentation routes use synthetic data, with no account or tracker authorization required. Three of the concepts use real 3D cameras and selectable avatars; the others use calibrated distance axes and milestone replay. See [the spatial study](docs/spatial-design-study.md) for mechanisms, evaluation tasks, and limitations.

The next exploration is `/design/evolution`: four complete identities (**VOLT**, **FORM**, **EVEN**, **CURRENT**) using Split's four navigation jobs, a nine-lane vertical distance track, and third-person Pursuit with a fixed starting line and customizable articulated runner. Use `?brand=even&view=field&mode=lanes` or `?brand=volt&view=field&mode=pursuit`. [Design evolution](docs/design-evolution.md) covers brand systems, interaction choices, evaluation, and the avatar art roadmap.

## Store submission

iOS / Android store packaging checklist (EAS, Apple/Play accounts, production env):
[`docs/store-submission.md`](./docs/store-submission.md).

## Living docs

Living standards live in the Project Agent Store (and are summarized in-repo):

- `docs/design-guide.md`
- `docs/coding-principles.md`
- `docs/project-context.md`
- `docs/setup-plan.md`
- `docs/integrations.md`
- `docs/data-status.md`

See [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md).
