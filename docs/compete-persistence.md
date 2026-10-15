# Compete persistence (signed-in)

Signed-in play state is **per-viewer**. Guests/demo may still use device-local storage.

## Direction

Durable facts live in relational tables. `compete_snapshots` jsonb holds a **thin** document after a successful dual-write: identity, clock, ratings template, sleep/health/links/duels/readiness, and empty dual-written arrays. GET hydrates collections from tables, runs `rollClock`, and hydrates `crewBoard` from `crew_week_fields`.

Density matching stays viewer-local (`peer_ids` / `synthetic_ids` on `wave_enrollments`).

## Account safety

- **`demoNow` is never account-durable.** Stripped on read/write.
- **`pendingRevealIds` is never account-durable.** Re-derived from `periodResults.acknowledgedAt` (`shouldSyncLegacyPendingReveals` skips empty legacy lists when ack fields exist).
- **`crewBoard` is never account-durable.** Hydrated when an enrollment has `crew_id`.
- Client cache (localStorage) remains a buffer; server snapshot wins when newer.

## Battles schema — not the play path

`battles` / `periods` / `standings` are an early invite-code scaffold. **Do not migrate My track / The field onto them.**

## Relational tables

| Table | Role |
| --- | --- |
| `athlete_prefs` | freezes, calibrated, onboarding, lesson, training goal |
| `sport_ratings` | Elo + opt-in locks |
| `period_results` | Settled weeks; `acknowledged_at null` = pending week reveal |
| `period_freezes` | Frozen period starts |
| `activities` | Compete columns (`compete_key`, disposition, …); upsert-only |
| `wave_enrollments` | Per-viewer seating + optional `crew_id` |

## Thin snapshot cutover

After successful `persistCompeteCore`, the stored jsonb clears `activities`, `periodResults`, `enrollments`, and `frozenPeriods` (`thinCompeteStateForAccount`).

- PUT: relational first, then thin snapshot; on relational failure, store the full prepared document.
- GET: hydrate → `rollClock` → crew board; if the snapshot is still fat or settlement changed the document, dual-write then rewrite thin.
- Activities hydrate from `activities` (compete_key rows), merging any snapshot-only ids the client has not dual-written yet.
- Sleep / health / links / duels / readiness remain in jsonb until a later phase.

## Server rollClock

Signed-in `/api/compete` runs `rollClock` on GET (after hydrate) and PUT (before persist) using wall time.
