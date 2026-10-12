# Contributing

## Standards

Follow the living docs (Project store):

| Doc | Purpose |
| --- | --- |
| Design guide | Tokens, typography, motion, Join / Standings / Tracker UX |
| Coding principles | Monorepo boundaries, Supabase, period model, tracker, tests, PR hygiene |
| Setup plan | How to run locally |

In-repo summary for agents: [`AGENTS.md`](./AGENTS.md).

## Quick start

```bash
pnpm install
pnpm dev            # web @ localhost:3000
pnpm dev:mobile     # Expo
pnpm typecheck
pnpm test
```

Env template: `apps/web/.env.example`.

## Pull requests

1. One logical change per PR when practical.
2. Match existing ink/lime UI — see design guide; do not introduce a second palette.
3. Keep `@fitness-battle/shared` free of platform imports.
4. Additive Supabase migrations only; encode battle/period invariants in SQL when correctness is cross-request.
5. Stub Strava cleanly without secrets; do not fake a live connection status.
6. Include or update tests when changing period math, scoring, or RPC semantics.
