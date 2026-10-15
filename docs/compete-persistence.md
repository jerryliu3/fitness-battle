# Compete persistence (signed-in)

Signed-in play state is **per-viewer**. Guests/demo may still use device-local storage.

## Current direction

Normalize durable facts out of `compete_snapshots` jsonb into relational tables, while keeping density matching as viewer-local enrollments (`peer_ids` / `synthetic_ids` arrays).

## Account safety

- **`demoNow` is never account-durable.** `/api/compete` strips it on read and write so a QA week-close cannot stick as the athlete’s clock.
- Client cache (localStorage) remains a buffer; server snapshot wins when newer.

## Battles schema — not the play path

`battles` / `periods` / `standings` are an early invite-code scaffold. **Do not migrate My track / The field onto them.** Weekly compete uses `compete_snapshots` (and the relational tables introduced in follow-up PRs).

## P2 tables (dual-write, full snapshot kept)

| Table | Role |
| --- | --- |
| `athlete_prefs` | freezes, calibrated, onboarding, lesson, training goal |
| `sport_ratings` | Elo + opt-in locks |
| `period_results` | Settled weeks; `acknowledged_at null` = pending week reveal |
| `period_freezes` | Frozen period starts |

Week reveal is derived from `acknowledged_at`, not a separate pending table.

## P3 activities

`public.activities` gains compete columns (`sport`, `distance_m`, disposition/provenance, `compete_key`, `source_label`). Dual-write **upserts only** — never deletes orphans (live sync can race). `share_crew_week` reads these rows instead of snapshot jsonb.

## P4 enrollments

`wave_enrollments` stores per-viewer seating (`peer_ids[]`, `synthetic_ids[]`, optional `crew_id`). Dual-write **replaces** the athlete’s enrollment rows from the document (same pattern as `period_freezes`). Account snapshots no longer persist `crewBoard`; GET hydrates it from `crew_week_fields` when `crew_id` is set (hydrate failure clears the pin).

## P5 thin snapshot + derive reveals

- Account writes store `pendingRevealIds: []` — always re-derived from `periodResults.acknowledgedAt` on migrate/load.
- `migrateCompeteState` must **not** treat that empty array as a legacy “all dismissed” list (see `shouldSyncLegacyPendingReveals`); otherwise every pending week would be auto-acked.
- GET overlays relational SoT (prefs, ratings, freezes, enrollments) when dual-write rows exist; `period_results` **merge** with the snapshot (prefer acknowledged / newer settledAt) so a laggy dual-write cannot erase snapshot-ahead weeks. Activities stay snapshot-primary (sync can race).
- Crew board Elo comes from `crew_field_roster` (SECURITY DEFINER), not `sport_ratings` RLS.
- Bulky array omission from jsonb is deferred until hydrate has soaked — snapshot remains a fallback cache.

## P6 server rollClock

Signed-in `/api/compete` runs `rollClock` on GET (after hydrate) and PUT (before store) using wall time (`demoNow` already stripped). When GET settlement changes the document, the snapshot (+ relational best-effort) is rewritten so other devices see settled weeks without relying on a client save.
