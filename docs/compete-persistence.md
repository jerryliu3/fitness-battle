# Compete persistence (signed-in)

Signed-in play is **per-viewer**. Guests may use device-local storage.

## Model (relational only — no compete jsonb)

Account compete state is **tables only**. `/api/compete` never reads or writes a blob. `compete_snapshots` is dropped in `20261015150000_compete_account_cutover.sql`.

| Store | Holds |
| --- | --- |
| `profiles` | name, city, primary sport |
| `athlete_prefs` | freezes, calibrated, onboarding, lesson, training goal, **clock**, **focus**, `updated_at` |
| `sport_ratings` | Elo + locks |
| `period_results` / `period_freezes` | Settled weeks + freezes |
| `activities` | Compete sessions (`compete_key`, disposition, …) — **upsert only** |
| `wave_enrollments` | Per-viewer seating + optional `crew_id` |
| `week_fields` | Canonical shared seating for both solo and private crew fields |
| `sleep_nights` / `health_ratings` / `health_period_results` | Sleep contest |
| `compete_duels` | Legacy 1v1 rows (product removed; sanitize clears; table kept) |
| `readiness_marks` | Daily readiness — **upsert only** (shared with fitness sync) |
| `fitness_connections` | Provider link status (**read** into compete; OAuth owns writes) |
| Ephemeral on GET | `crewBoard` from `week_fields` + `week_field_roster` (missing totals are 0, not estimates), `pendingRevealIds` from `acknowledgedAt`, `rollClock` |

`demoNow` is never account-durable.

`battles` / `periods` / `standings` are not the play path.

## API

- **GET:** `loadCompeteAccount` → `rollClock` → hydrate crew board; persist if settlement changed the document.
- **PUT:** `persistCompeteAccount` only (tables). Dropping an open sport or sleep enrollment is `409 week_still_open`. `autoEnrollNext: false` is the stop-after-this-week path. Failure otherwise → 500.
- **Refresh:** signed-in web and Expo refetch on foreground and about every 60s while Arena or Field is visible. An idle client adopts the server copy so crew scores are not hidden by `athlete_prefs.updated_at`.

## Write rules

| Collection | Persist style | Why |
| --- | --- | --- |
| activities, readiness | upsert, never delete-all | Fitness sync can race ahead |
| freezes, enrollments, sleep, health*, duels | replace rows for user | Compete document is SoT |
| ratings, period_results | upsert | Append-friendly settlement |
| links | read-only in compete | OAuth/sync writes `fitness_connections` |

`seat_athlete_week_field` is the only field write RPC. `/api/crews/field` and account hydration both use the same field/roster reader. The database roster owns score filtering and exact `[wave_start, week_end)` bounds: solo totals come from counted `activities`; private crew totals retain the existing explicit sharing boundary and come from counted `crew_entries`. `share_crew_week` still copies eligible account activities into the crew feed. `crew_field_roster` supplies identity/Elo only for deterministic seating fillers.

The consolidation migration copies existing `crew_week_fields` into `week_fields`, retaining the newer plan on conflict, before dropping the old table and its write RPC. Historical migration files remain unchanged. Deploy this migration with the matching server change; the old server reads a table that is retired by the migration. `crewBoard` remains the client presentation name for both field kinds, not a second database store.
