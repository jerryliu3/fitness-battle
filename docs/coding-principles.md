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
   - Default periods run weekly from Monday 00:00:00 America/New_York to next Monday 00:00:00 America/New_York (half-open: `[start, end)`).
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

Crew’s visible shared-week progress and standings read aggregate counted activities through `crew_week_totals`, authorized by active membership. Exclude sample/demo, history, pending/excluded and future activities. The feed and manual share action are retired; legacy entry endpoints remain for older clients. Apply the additive totals migration before deploying the corresponding API.

Admin tooling stays behind the admin UI/API boundary: authorization, privileged roster reads, audit writes and test orchestration belong there. Normal clock advancement uses `rollClock(state, now)`. Both ordinary clock advancement and admin orchestration use the same `settleCompetition` rules; callers may supply existing real-field snapshots without introducing admin modes into product scoring.

Sport effort scores only increase: eligible counted activity awards +1 per rank-priced volume milestone immediately; weekly placement adds a nonnegative Elo bonus and inactivity holds. Entry rank fixes the milestone price for that round (Beginner/Developing/Active/Steady/Strong/Elite/Olympian/Champion: 1/1.5/2/2.5/3/4/5 times the base). Bases: 1 mile running/walking, 5 miles cycling, 30 minutes strength. Open and GPS keep independent receipts; only opted-in sports earn. Future, sample, pending and excluded rows do not earn. Durable `effort_milestones` high-water receipts survive activity exclusion, replay, round settlement and result-history truncation. Apply the activity milestone migration before deploying clients; admin settlements store the same receipts. Sleep scoring remains separate.

Crew Start Line sessions are authenticated membership-scoped intentions. Any active member can create; only the organizer can cancel. Time changes require cancellation and a new ticket. Creating a ticket joins its organizer; RSVP insert/delete is idempotent, locks against cancellation, closes at start, and never writes activities or scores. Times are UTC instants with an explicit display timezone (initial UI: America/New_York). DST gaps are rejected and repeated wall times choose the earlier occurrence. Upcoming sessions are bounded to 20 per crew and 180 days ahead. No automatic notifications or recurring plans are introduced.

Weekly congratulations and repeat choices require actual archived field membership and matching settled results for both athletes. Generated peers and past-self are never recipients. Actions are independent and reversible; one-sided repeat choices are private. Mutual repeat interest is consumed by one future solo seating attempt within 21 days of the source field close, subject to active sports, matching sport/track, score gap ≤400 and free capacity. Existing seats are never moved; Crew seating retains precedence. Status distinguishes saved, mutual, actual shared assignment, unsuccessful attempt and expiry. Progress can reopen the latest week as later participants settle. No friends, live duel, messages or notification system is added.
