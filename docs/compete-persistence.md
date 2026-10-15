# Compete persistence (signed-in)

Signed-in play is **per-viewer**. Guests may use device-local storage.

## Activities — table SoT (this cutover)

`CompeteState.activities` is **not** stored in `compete_snapshots` jsonb.

| Direction | Path |
| --- | --- |
| Write | `persistCompeteActivities` → `public.activities` (also from fitness sync). Upsert only; no orphan deletes. |
| Read | GET `/api/compete` hydrates `activities` from `public.activities` (`compete_key` rows). |
| Snapshot | Always `activities: []` via `stripSnapshotActivities`, including failure fallbacks. |

Legacy fat blobs that still embed activities are flushed into the table on the next GET/PUT, then stripped.

Client memory / localStorage may still hold activities for the engine; the **account** copy is the table.

## Rest of compete document

Still dual-written / jsonb for now: prefs, ratings, period_results, freezes, enrollments, sleep/health/links/duels/clock. `demoNow` / `crewBoard` / `pendingRevealIds` are not account-durable. `battles` schema is not the play path.

## API

- **PUT:** persist relational (activities required) → store snapshot with activities stripped.
- **GET:** hydrate collections → `rollClock` → crew board; rewrite when settled or legacy activities remain in the blob.
