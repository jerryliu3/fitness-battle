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
   - Sport registration (including onboarding) queues the next 06:00 America/New_York benchmark, today if it has not passed, otherwise tomorrow. All waves close at the following Monday 00:00 (displayed Sunday 11:59 PM ET); renewals start Monday 06:00. Calendar training/streak weeks retain Monday midnight bounds.
   - Registrations remain cancellable before their benchmark. No competitor identities, rankings or competition awards are shown while queued. At/after start, the database assigns all eligible registrations together, prefers nearby entry ratings (maximum solo spread 400), fills to eight with stable generated competitors, and freezes that field. Only registered Crew members in the same wave share its Crew field. A Crew departure cannot remove members or erase an already-started field.
   - `wave_enrollments.registered_at` and `field_id` are database-owned metadata; `week_fields` owns bounds and the frozen roster. Clients cannot directly mutate registrations. Resolve authorized real fields before settlement; a missing/failed roster must not be scored using fallback estimates. See [daily waves](daily-waves.md).
   - Settlement occurs on week close, archiving place and Elo rating updates.
   - Competition input facts have database acceptance timestamps and immutable revisions. Only versions accepted before the exclusive deadline affect a closed wave; late imports/edits remain training history. The authenticated server derives score documents; direct client rating/result/receipt writes are revoked. Require the server service-role configuration for account commits and never expose it to clients. See [local verification](reviews/daily-waves/local-verification.md).
   - Standings and places are 1-indexed (`place >= 1`). GPS events rank exact weekly distance; points events rank exact effort. Equal totals share a place and skip the occupied subsequent places (1, 2, 2, 4); display rounding does not create ties. Tied score settlement uses the average of their occupied positions. Sleep contest scores follow the same tie rule. Archived results are not rewritten.

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

Eligible counted activity awards +1 per rank-priced volume milestone immediately (milestones only add). Weekly field placement still uses normal Elo when you competed; a week with zero counted effort decays toward the floor instead of a last-place loss. Entry rank fixes the milestone price for that round (Beginner/Developing/Active/Steady/Strong/Elite/Olympian/Champion: 1/1.5/2/2.5/3/4/5 times the base). Bases: 1 mile running/walking, 5 miles cycling, 30 minutes strength. Open and GPS keep independent receipts; only opted-in sports earn. Future, sample, pending and excluded rows do not earn. Durable `effort_milestones` high-water receipts survive activity exclusion, replay, round settlement and result-history truncation. Apply the activity milestone migration before deploying clients; admin settlements store the same receipts. Sleep scoring remains separate.

Crew Start Line sessions are authenticated membership-scoped intentions. Any active member can create; only the organizer can cancel. Time changes require cancellation and a new ticket. Creating a ticket joins its organizer; RSVP insert/delete is idempotent, locks against cancellation, closes at start, and never writes activities or scores. Times are UTC instants with an explicit display timezone (initial UI: America/New_York). DST gaps are rejected and repeated wall times choose the earlier occurrence. Upcoming sessions are bounded to 20 per crew and 180 days ahead. No automatic notifications or recurring plans are introduced.

Weekly congratulations and repeat choices require actual archived field membership and matching settled results for both athletes. Generated peers and past-self are never recipients. Actions are independent and reversible; one-sided repeat choices are private. Mutual repeat interest is consumed by one future solo seating attempt within 21 days of the source field close, subject to active sports, matching sport/track, score gap ≤400 and free capacity. Existing seats are never moved; Crew seating retains precedence. Status distinguishes saved, mutual, actual shared assignment, unsuccessful attempt and expiry. Progress can reopen the latest week as later participants settle. No friends, live duel, messages or notification system is added.


Presentation for earned progress is shared through `training-view.ts`: calendar buckets and the atlas use Eastern half-open bounds; week/month/year means daily/clipped-week/monthly hour buckets. Only eligible, non-future counted activity is included. `effortPointProgress` reads existing milestone receipts and locked round prices without changing scores or inferring per-activity awards. Removal keeps high-water awards intact. Positive score animation must establish its baseline after hydration and reset across account/sport scope changes.

Crew previous-week distance is provided by the additive membership-authorized `crew_previous_week_totals` RPC. It sums only current active members, the crew's sport and the previous Eastern calendar week, excluding sample, history, pending and excluded rows. A zero or failed comparison remains unavailable as a last-week comparison. The shared-week visual separately labels the crew’s configured distance goal as Shared distance target; without a configured goal it may use a positive last-week baseline. Never label configured goals as previous-week activity. Existing session-target formats remain sessions. Portrait reads are limited to authorized roster/member IDs through the authenticated request client and do not widen profile policies.


Sync confirmation is a presentation gate, not another ingestion or scoring path. Preserve durable server ingest and apply through the existing reducer. Changed eligible non-future synced activities are held in a memory-only, account-scoped full-screen receipt, including newly imported older dates. Confirm applies selected activities exactly once before event reveal; deselected activities are marked excluded before the scoring reducer runs. Existing disposition is updated through the existing action before merging an updated activity. Previously earned high-water awards remain durable. Close/skip or day rollover applies quietly. Refresh must not replace a pending receipt. Samples are labeled previews and never receive competition credit.

Weekly activity streaks are presentation derived from counted non-sample, non-future activity with positive volume in any sport. Weeks use the existing Eastern Monday–Monday bounds. Until the current week is active, show the immediately preceding consecutive streak dimmed; a missed complete week breaks it. Manual counted activity qualifies, while a freeze alone does not. Streaks do not change ratings or settlement writes. Authenticated synthetic accounts follow ordinary session and membership authorization; only backend-unconfigured offline previews use local fixture paths.

4D scenery uses `race_routes` as its live catalog and `weekly_race_routes` as a
snapshot keyed by field wave start. The authenticated `competition_route` RPC
checks field membership and atomically creates the assignment on the first 4D
read. An empty catalog makes 4D unavailable without blocking field seating; a
later retry can assign a reactivated route. The catalog and assignment tables have no
athlete write grants. Catalog edits must not rewrite active or historical route
snapshots. Bundled sample routes are only for local demo and debug previews.
The owner-only admin route API uses the existing server authorization and service
client. Catalog saves use the service-only `admin_save_race_route` RPC with the
observed `updated_at`, locking and audit insertion in one transaction. Route IDs
are immutable in the editor; deactivate catalog entries instead of deleting saved
history. GPX import is admin scenery only and never writes activities or scores.

Account field hydration covers every current sport enrollment, using the existing
seating RPC for open fields and authorized reads for Crew fields. A preferred
`crewBoard` remains for Crew consumers; each enrollment also carries its own
transient `fieldBoard` roster and Open/GPS totals. Standings only use a snapshot
matching that enrollment's sport, bounds and Crew context. All field snapshots
are stripped before durable account writes and refreshed with server snapshots,
including while the athlete has an unsaved draft. Synthetic accounts use the same
membership path; a missing field is not repaired with a replay fixture fallback.

Mobile athlete blocks are private, directed, reversible account choices. A blocked athlete's visible identity, markers, and activity are suppressed for the blocker while field membership, lane geometry, rank, totals, and results remain unchanged. New automatic fields exclude either-direction blocks, including repeat preferences; an existing field is not reseated. A new Crew field containing a blocked pair is unavailable until the conflict is resolved. Block choices are read from the database before rendering authenticated mobile views; failed reads must not silently reveal blocked athletes. Reporting is a separate action sent through the authenticated support-email flow.
