# Compete persistence (signed-in)

Signed-in play is **per-viewer**. Guests may use device-local storage.

## Model (no compete jsonb)

Account compete state is **relational only**. `/api/compete` does not read or write `compete_snapshots.state`.

| Store | Holds |
| --- | --- |
| `profiles` | name, city, primary sport |
| `athlete_prefs` | freezes, calibrated, onboarding, lesson, training goal, **clock**, **focus**, `updated_at` |
| `sport_ratings` | Elo + locks |
| `period_results` / `period_freezes` | Settled weeks + freezes |
| `activities` | Compete sessions (`compete_key`, disposition, …) — upsert only |
| `wave_enrollments` | Per-viewer seating + optional `crew_id` |
| `sleep_nights` / `health_ratings` / `health_period_results` | Sleep contest |
| `compete_duels` | 1v1 practice rivals |
| `readiness_marks` | Daily readiness |
| `fitness_connections` | Provider link status (**read** into compete; OAuth owns writes) |
| Ephemeral on GET | `crewBoard` from `crew_week_fields`, `pendingRevealIds` from `acknowledgedAt`, `rollClock` |

`demoNow` is never account-durable. Legacy `compete_snapshots` rows are migrated once into tables on GET, then deleted.

`battles` / `periods` / `standings` are not the play path.

## API

- **GET:** `loadCompeteAccount` → `rollClock` → hydrate crew board; persist if settlement changed the document.
- **PUT:** `persistCompeteAccount` only (tables). Failure → 500 (no jsonb fallback).
