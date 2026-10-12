# Fitness Battle

Mobile-first fitness battles (group or 1v1) with automatic tracker scoring and weekly standings.

## Stack

Mirrors sibling repos (`goalmaxxing` / Cadence, `Coaching`):

| Layer | Choice |
| --- | --- |
| Mobile | Expo Router (`apps/mobile`) |
| Web / API | Next.js on Vercel (`apps/web`) |
| Data | Supabase (`supabase/`) |
| Shared | `@fitness-battle/shared` (period model, fitness providers, demo data) |
| Tracker | Strava provider abstraction with mock stub when OAuth keys are missing |

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

## Docs

Living standards live in the Project Agent Store (and are summarized in-repo):

- `docs/design-guide.md`
- `docs/coding-principles.md`
- `docs/project-context.md`
- `docs/setup-plan.md`

See [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md).
