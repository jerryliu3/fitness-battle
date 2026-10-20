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
10. **Simplification** — smallest correct change; no speculative packages or duplicate write paths.

## Workflow

- Prefer small PRs. Update the matching living doc when tokens or domain rules change.
- Do not copy secrets into the client. Strava client secret stays server-side.
- When verification is requested: `pnpm typecheck`, relevant tests, and web build for web-facing changes.
