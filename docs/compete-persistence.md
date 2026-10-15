# Compete persistence (signed-in)

Signed-in play is **per-viewer**. Guests may use device-local storage.

## Model

| Layer | Holds |
| --- | --- |
| Relational | prefs, ratings, period_results, freezes, activities, wave_enrollments |
| Thin `compete_snapshots` | identity, clock, ratings template, sleep/health/links/duels/readiness; dual-written arrays empty |
| Ephemeral on GET | `crewBoard` (from `crew_week_fields`), `pendingRevealIds` (from `acknowledgedAt`), `rollClock` |

`demoNow` is never account-durable. `battles` / `periods` / `standings` are not the play path.

## Write / read

- **PUT:** `persistCompeteCore` then store `thinCompeteStateForAccount`. On relational failure, store the full prepared document.
- **GET:** hydrate (merge snapshot + tables) → `rollClock` → crew board. Fat snapshots or settlement rewrite thin.
- Hydrate **always merges** so snapshot-ahead rows survive lag / fat cutover. Thin-snapshot hydrate failure returns 500 (empty arrays are not a valid fallback).

Sleep/health remain jsonb until a later phase.
