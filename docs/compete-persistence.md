# Compete persistence (signed-in)

Signed-in play state is **per-viewer**. Guests/demo may still use device-local storage.

## Current direction

Normalize durable facts out of `compete_snapshots` jsonb into relational tables, while keeping density matching as viewer-local enrollments (`peer_ids` / `synthetic_ids` arrays).

## Account safety

- **`demoNow` is never account-durable.** `/api/compete` strips it on read and write so a QA week-close cannot stick as the athlete’s clock.
- Client cache (localStorage) remains a buffer; server snapshot wins when newer.

## Battles schema — not the play path

`battles` / `periods` / `standings` are an early invite-code scaffold. **Do not migrate My track / The field onto them.** Weekly compete uses `compete_snapshots` (and the relational tables introduced in follow-up PRs).
