# Compete persistence (signed-in)

Signed-in accounts keep their own enrollment and result receipts. All athletes assigned to a field share its benchmark, frozen roster and counted-activity window. Guests may use device-local storage.

## Model (relational only — no compete jsonb)

Account compete state is **tables only**. `/api/compete` never reads or writes a blob. `compete_snapshots` is dropped in `20261015150000_compete_account_cutover.sql`.

| Store | Holds |
| --- | --- |
| `profiles` | name, city, primary sport |
| `athlete_prefs` | freezes, calibrated, onboarding, lesson, training goal, **clock**, **focus**, `updated_at` |
| `sport_ratings` | Elo + locks |
| `period_results` / `period_freezes` | Settled weeks + freezes |
| `activities` | Compete sessions (`compete_key`, disposition, …) — **upsert only** |
| `wave_enrollments` | Registration bounds, renewal choice, optional `crew_id`, server-owned `registered_at` and canonical `field_id` |
| `week_fields` | Canonical shared bounds and frozen real/generated roster for solo and private Crew fields (`roster_locked_at`) |
| `sleep_nights` / `health_ratings` / `health_period_results` | Sleep contest |
| `compete_duels` | Legacy 1v1 rows (product removed; sanitize clears; table kept) |
| `readiness_marks` | Daily readiness — **upsert only** (shared with fitness sync) |
| `fitness_connections` | Provider link status (**read** into compete; OAuth owns writes) |
| Ephemeral on GET | `crewBoard` from `week_fields` + `week_field_roster` (missing totals are 0, not estimates), `pendingRevealIds` from `acknowledgedAt`, `rollClock` |

`demoNow` is never account-durable.

`battles` / `periods` / `standings` are not the play path.

## API

- **GET:** load registrations → resolve authorized fields before each due settlement → hydrate current fields; persist if settlement changed the durable document. Queued fields make no roster requests. A field failure returns 503 rather than settling estimated opponents.
- **PUT:** `persistCompeteAccount` only (tables). Queued registrations can be removed; dropping a started sport or sleep enrollment is `409 week_still_open`. New unsaved registrations are rebased to the next 06:00 server benchmark if the cutoff passed during the save. `autoEnrollNext: false` is the stop-after-this-week path. Failure otherwise → 500.
- **Refresh:** signed-in web and Expo refetch on foreground and about every 60s while Arena or Field is visible. An idle client adopts the server copy so crew scores are not hidden by `athlete_prefs.updated_at`.

## Write rules

| Collection | Persist style | Why |
| --- | --- | --- |
| activities, readiness | upsert, never delete-all | Fitness sync can race ahead |
| freezes, enrollments, sleep, health*, duels | replace rows for user | Compete document is SoT |
| ratings, period_results | upsert | Append-friendly settlement |
| links | read-only in compete | OAuth/sync writes `fitness_connections` |

The authenticated account API interprets the client document as user intentions and derives score fields from stored state and accepted facts. Its service-only `save_compete_account_server` commit checks the account revision, accepted-input revision and deadline crossing, then delegates to the existing versioned transaction. `save_compete_account` is no longer callable by ordinary clients. Direct enrollment, score and input-table writes are revoked. Registration validation still locks each affected wave, checks schedule/cancellation against the database clock and preserves database-owned assignment metadata. `resolve_week_field` authorizes the caller, returns no queued roster, and finalizes eligible registrations once at/after the benchmark, including offline Monday renewals. Repeated reads reuse that assignment.

The database roster owns score filtering and exact `[wave_start, week_end)` bounds. Both solo and Crew totals use immutable accepted revisions in `private.competition_fact_versions`: only versions accepted before close count, so later imports, edits and exclusions cannot alter a finished round. Raw `activities` remain editable training history. Server-only closing `scoringActivities` snapshots also supply the athlete's own settlement and milestone calculations, and are stripped before durable writes. Opponent entry ratings and generated IDs are stored on the field. `/api/crews/field` POST returns only authorized queued Crew context; the account save registers that athlete. It never registers other members automatically.

The consolidation migration copies existing `crew_week_fields` into `week_fields`, retaining the newer plan on conflict, before dropping the old table and its write RPC. Historical migration files remain unchanged. Deploy this migration with the matching server change; the old server reads a table that is retired by the migration. `crewBoard` remains the client presentation name for both field kinds, not a second database store.

## Lazy competition replay

`GET /api/compete/replay?sport=…&track=…&start=…&end=…` reads a compact field
activity ledger through the membership-authorized `competition_replay` RPC
(`20261025143404_competition_replay.sql`). It uses the request's cookie/Bearer
session, exact persisted seating bounds and existing eligibility filters. There
are no new scoring writes or broad activity RLS policies. Current and ended
fields use the same API; retained current counted activity reconstructs chronology
rather than preserving past ingestion/correction history. See the
[replay contract](reviews/competition-replay/README.md) for fidelity, memory,
simulated-athlete and deployment details.
