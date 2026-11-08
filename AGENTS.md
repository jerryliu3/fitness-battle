<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (from `apps/web`) before writing Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fitness Battle — agent charter

Living standards (Project store — source of truth):

- Design: `docs/design-guide.md` (Focus athletic UI — ink/tennis tokens, mobile-first)
- Coding: `docs/coding-principles.md` (monorepo, period/standings, tracker, RLS)
- Context / setup: `docs/project-context.md`, `docs/setup-plan.md`

If those paths are not in this checkout, they live in the Fitness Battle Project Agent Store. Keep in-repo behavior aligned with them.

## Non-negotiables

1. **pnpm monorepo** — `apps/mobile` (Expo Router), `apps/web` (Next App Router + API), `packages/shared`, `packages/pursuit` (DOM Three.js Arena 3D), `supabase/`.
2. **`@fitness-battle/shared` is platform-agnostic** — no Expo, React Native, Next, or DOM imports. `@fitness-battle/pursuit` is web-DOM (Next + Expo web); native embeds it via `/arena-scene` WebView only.
3. **Period model** — default weekly America/New_York (Eastern) Mon–Mon half-open bounds; keep `daily|weekly|monthly|custom` extendable; one `is_current` period per battle.
4. **Tracker** — Strava via web OAuth routes; stub/mock when secrets missing; never claim stub is fully connected.
5. **Join / standings writes** — prefer SQL RPCs + RLS; harden `SECURITY DEFINER` (`search_path = ''`, auth checks).
6. **UI** — follow the design guide tokens (`theme.ts` / CSS vars). No Cadence Gazetteer cream/terracotta; no Coaching indigo shadcn defaults for product chrome.
7. **Env** — read through `lib/env.ts` modules; honor demo flags when wiring live Supabase.
8. **Tests** — period/SQL/scoring semantic changes ship with tests (`pnpm test` / shared Vitest).
9. **Migrations** — additive only; no rewritten history.
10. **Simplification & Minimal Fixes** — smallest correct change; keep diffs minimal, clean, and robust; no speculative packages, bloated abstractions, verbose defensive code, or duplicate write paths. Maximize reuse across web and mobile.

## Developer & Agent Workflow Rules

- **Minimal, Clean Changes**: Keep implementations lean and minimal. Do not add verbose or overly complex layers, defensive bloat, or speculative abstractions. If a PR or diff feels disproportionately large, conduct a dedicated simplification pass to prune unnecessary code.
- **Verification & Test Execution Policy (DO NOT RUN AUTONOMOUSLY)**:
  - **Do NOT run slow type checks (`pnpm typecheck`), test suites (`pnpm test`), or builds autonomously** after every minor edit, rebase, merge conflict resolution, or CI fix.
  - When asked to "fix CI, do not verify", "resolve merge conflicts and push (do not verify)", or similar: resolve the issue, commit, and push immediately without running local verification suites.
  - **Only run verification when**:
    1. Explicitly approved or requested by the user (e.g., "verify this", "run the typecheck/tests"), OR
    2. All planned implementation work across the entire task/PR is completely finished and ready for final delivery (and the user hasn't specified "do not verify").
- **Deep Code Review & Recursive Simplification**:
  - Before completing tasks, always perform a deep review pass for correctness, bug prevention, and code simplification/cleanup.
  - Eliminate dead code, duplicated logic, and unnecessary UI branching. Apply fixes cleanly.
- **PR Hygiene & Worktrees**:
  - Prefer small, clean, stacked PRs against `origin/main` (e.g., 1 PR per tab/feature rather than massive combined PRs).
  - Use isolated git worktrees or branches for parallel streams. Rebase cleanly on `origin/main`.
- **Testing & Local Verification Instructions**:
  - When work is ready for the user to review locally, always provide the exact working directory and commands to run the web dev server or test in the iOS simulator.
- **Product Ambiguity**:
  - For any ambiguous product, UX, or domain decisions, hold off and report back to the user with clear options rather than making assumptions.
- **Secrets & Auth**:
  - Do not copy secrets into the client. Strava client secret stays server-side. Update the matching living doc when tokens or domain rules change.

## Production-parity copy

Product UI must use the same copy in production and debug builds. Do not add
labels, badges, captions or toasts identifying records as fake, simulated,
synthetic, sample, mock or demo data, including local previews and replay feeds.
Keep provenance flags, scoring exclusions, permissions and debug isolation in
the data layer. Missing or unconfigured integrations still show their actual
unavailable/not-connected state; never imply a working connection.
