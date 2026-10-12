# Fitness integrations

Scope of tracker and readiness integrations for Fitness Battle. Implement as much as possible without live API keys; never claim a stub is fully connected.

## Status matrix

| Integration | Kind | Maturity | Without API keys | With API keys |
| --- | --- | --- | --- | --- |
| Strava | Activity | Stub-ready → live path coded | `status=stub`, mock activities | OAuth authorize → token exchange → refresh → activity pull |
| Mock | Activity | Always on | Demo workouts | Same |
| Garmin | Activity | Planned | Compete UI demo link only | Not implemented |
| Apple Health | Activity | Device-only | N/A on web | Mobile push ingest (planned) |
| Health Connect | Activity | Device-only | N/A on web | Mobile push ingest (planned) |
| WHOOP | Readiness | Planned | Synthetic readiness mark in compete UI | Not implemented |
| Oura | Readiness | Planned | Synthetic readiness mark in compete UI | Not implemented |

Catalog source: `packages/shared/src/fitness/providers.ts`.

## Strava steps (live)

1. Create a Strava API application.
2. Set server env: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`.
3. Authenticated `POST /api/fitness/connect` returns `authorizeUrl`.
4. User authorizes; `GET /api/fitness/strava/callback` exchanges `code` for tokens.
5. Tokens belong in `private.fitness_tokens` (never client-readable). Public `fitness_connections` stores status + sync timestamps only.
6. `POST /api/fitness/sync` pulls activities for a window from `syncWindow()`:
   - First sync / `backfill: true` → 90 days
   - Later syncs → incremental with 1-day overlap
7. Upsert into `activities` on `(provider, external_id)`; call `recompute_battle_standings` for battle boards.

Without keys, connect/sync stay on the stub path and responses include `usedMock: true` / `status: "stub"`.

## Sync evidence (UI)

| Evidence | Meaning |
| --- | --- |
| `never_asked` | Not linked |
| `disconnected` | Was linked, now off |
| `stub` | Demo sync — not live OAuth |
| `asked` | Linked, no samples yet |
| `receiving_data` | Fresh sample within 36h |
| `stale` | Linked but last sample is old |

## API surface

| Route | Auth | Role |
| --- | --- | --- |
| `POST /api/fitness/connect` | Required | Start OAuth or stub |
| `GET /api/fitness/strava/callback` | State = user id | Token exchange |
| `POST /api/fitness/sync` | Required | Pull windowed activities |
| `POST /api/fitness/disconnect` | Required | Clear connection/tokens |
| `GET /api/fitness/status` | Required | Connection + catalog |

## One-time backfill

Onboarding (and You, until used) offers a one-time 90-day calibration (`import-history` / `mark_backfill_complete`). After `calibrated` / `backfill_completed_at` is set, it cannot run again.
