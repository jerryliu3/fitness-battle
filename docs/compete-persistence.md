# Compete persistence (signed-in)

Signed-in play state is **per-viewer** and increasingly **relational**. Guests/demo may still use device-local storage; that path is out of scope here.

## Source of truth

1. **Canonical rows** — prefs, ratings, enrollments, activities, period results, sleep/health, duels.
2. **`compete_snapshots`** — thin account shell after save (collections emptied). Used for first-load bootstrap and offline merge hints. **`demoNow` is never stored.**
3. **Client cache** — localStorage keyed by account; server wins when newer.

## Week reveal

Pending receipts are `period_results` where `acknowledged_at is null`. Dismiss stamps `acknowledged_at`. There is no `pending_reveals` table.

## Seating

`wave_enrollments.peer_ids` and `synthetic_ids` stay arrays. This preserves asymmetric density matching. Shared crew fields use `crew_week_fields`; the blob `crewBoard` pin is hydrated at load and not durably written.

## Battles schema

`battles` / `periods` / `standings` are a separate invite-code experiment. They are **not** the migration target for My track / The field.
