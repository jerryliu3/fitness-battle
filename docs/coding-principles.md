# Fitness Battle Coding Principles

## Monorepo Architecture & Standards

1. **pnpm Workspace**:
   - `apps/mobile`: Expo Router app.
   - `apps/web`: Next.js App Router (web shell + API routes).
   - `packages/shared`: Pure platform-agnostic business logic, scoring, period calculation, and types.
   - `packages/pursuit`: DOM Three.js Arena 3D (`LivePursuit`) for Next and Expo web; native embeds via `/arena-scene` WebView.
   - `packages/rankings`: Road race leaderboard ingest and time parsing.
   - `supabase/`: Migrations and database functions.

2. **Platform-Agnostic `@fitness-battle/shared`**:
   - Must NEVER import React, React Native, Expo, Next.js, or DOM globals (`window`, `document`, `localStorage`).
   - Pure inputs, deterministic outputs.
   - `@fitness-battle/pursuit` is web-DOM only (not for React Native native modules).

3. **Period & Settlement Model**:
   - Default periods run weekly from Monday 00:00:00 UTC to next Monday 00:00:00 UTC (half-open: `[start, end)`).
   - Settlement occurs on week close, archiving place and Elo rating updates.
   - Standings and places are 1-indexed (`place >= 1`).

4. **Security & Data Integrity**:
   - Database functions marked `SECURITY DEFINER` must set `SET search_path = ''` and check `auth.uid()`.
   - Never expose third-party client secrets (e.g., Strava client secret) on client devices or public bundles.
   - OAuth state parameters must be HMAC-signed with expiration; production must not fall back to a hard-coded signing secret.
   - API routes that touch RLS-backed tables should use `createRequestClient(request)` so mobile Bearer tokens see `auth.uid()` the same way cookie sessions do.

5. **Testing & Quality**:
   - Every semantic change to scoring, Elo calculations, period bounds, or database models must ship with unit tests in Vitest.
   - All workspace packages must pass `pnpm typecheck` without `--skipLibCheck` on local application code.
