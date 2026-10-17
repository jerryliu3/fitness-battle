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
| `sleep_nights` / `health_ratings` / `health_period_results` | Sleep contest |
| `compete_duels` | Legacy 1v1 rows (product removed; sanitize clears; table kept) |
| `readiness_marks` | Daily readiness — **upsert only** (shared with fitness sync) |
| `fitness_connections` | Provider link status (**read** into compete; OAuth owns writes) |
| Ephemeral on GET | `crewBoard` from `crew_week_fields` + roster + counted `crew_entries` for that week (missing totals are 0, not estimates), `pendingRevealIds` from `acknowledgedAt`, `rollClock` |

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

`share_crew_week` reads `public.activities`. `crew_field_roster` reads `sport_ratings`.
