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

## Pull requests & workflow

1. One logical change per PR when practical (prefer small stacked PRs over large monolithic branches).
2. **Minimal clean fixes**: Smallest correct change. No verbose or overly complex layers, defensive bloat, or speculative abstractions.
3. **Verification discipline**: Do not run slow typechecks, tests, or builds autonomously during intermediate steps, rebases, or CI fixes. Only run verification when explicitly approved or when all work across the task/PR is fully finished (and verification was not opted out).
4. **Code review & cleanup**: Run a deep code review pass for correctness, bugs, and simplification/cleanup before declaring complete.
5. Match existing ink/lime UI — see design guide; do not introduce a second palette.
6. Keep `@fitness-battle/shared` free of platform imports.
7. Additive Supabase migrations only; encode battle/period invariants in SQL when correctness is cross-request.
8. Stub Strava cleanly without secrets; do not fake a live connection status.
9. Include or update tests when changing period math, scoring, or RPC semantics.
10. For ambiguous product or design choices, hold off and clarify with the developer rather than guessing.

## Git author (Vercel)

Vercel blocks deploys when the commit author email is not linked to a GitHub account
(e.g. `name@*.local`). Use a verified GitHub email:

```bash
git config --global user.name "Jerry Liu"
git config --global user.email "3jerryliu@gmail.com"
```

Confirm with `git config --global --get user.email` before committing from a new machine.
