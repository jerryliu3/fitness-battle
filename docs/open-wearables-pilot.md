# Open Wearables WHOOP pilot

Pilot: route **WHOOP only** through a self-hosted Open Wearables instance. Strava, Oura, Garmin, and phone ingest stay on the existing Fitness Battle adapters. Goal: learn whether the OW pattern is easy to extend.

## What was pulled in

| Piece | Location |
| --- | --- |
| Upstream clone | `services/open-wearables/` (gitignored; use the script) |
| Helper | `scripts/open-wearables.sh` |
| OW HTTP client | `apps/web/src/lib/open-wearables/client.ts` |
| WHOOP via OW | `apps/web/src/lib/open-wearables/whoop.ts` |
| User id link | `public.open_wearables_links` + `user-link.ts` |
| Return URL | `GET /api/fitness/open-wearables/callback` |
| Event → sample maps | `packages/shared/src/fitness/open-wearables-map.ts` |

Feature flag (all required):

```bash
OPEN_WEARABLES_API_URL=http://localhost:8001
OPEN_WEARABLES_API_KEY=sk-...          # from OW developer portal
OPEN_WEARABLES_WHOOP=true
NEXT_PUBLIC_USE_DEMO_DATA=false
```

When the flag is off, WHOOP uses the legacy direct OAuth adapter (`whoop-provider.ts`).

## Start Open Wearables

```bash
pnpm ow:up
# or: bash scripts/open-wearables.sh up

# If containers cannot reach each other on the Docker bridge (some VMs):
OPEN_WEARABLES_HOST_GATEWAY=1 pnpm ow:up
```

Defaults avoid clashing with Fitness Battle:

| Service | Host port |
| --- | --- |
| OW API | `8001` |
| OW developer portal | `3001` |
| OW Postgres | `5433` |

Portal login (first boot seed): `admin@admin.com` / `your-secure-password`. Create an API key under Settings → Credentials.

### WHOOP credentials live on OW

In `services/open-wearables/backend/config/.env`:

```bash
API_BASE_URL=http://localhost:8001
WHOOP_CLIENT_ID=...
WHOOP_CLIENT_SECRET=...
WHOOP_DEFAULT_SCOPE=offline read:cycles read:sleep read:recovery read:workout read:body_measurement read:profile
```

Register this redirect URI in the WHOOP developer dashboard:

`http://localhost:8001/api/v1/oauth/whoop/callback`

(For a deployed OW host, use that host instead of localhost.)

## Data flow

```
User → Fitness Battle POST /api/fitness/connect { provider: "whoop" }
     → OW GET /api/v1/oauth/whoop/authorize
     → WHOOP consent
     → OW callback exchanges code + stores tokens + optional backfill
     → browser return: /api/fitness/open-wearables/callback?provider=whoop
     → Fitness Battle marks fitness_connections.whoop connected

User → POST /api/fitness/sync { provider: "whoop" }
     → OW POST .../providers/whoop/users/{id}/sync
     → OW GET .../events/workouts + /health-scores
     → map to ActivitySample / ReadinessSample
     → persistSyncedActivities / persistReadiness (existing store)
```

## Extending to Strava / Oura / etc.

The pilot deliberately keeps one provider behind a flag. To mirror for another cloud provider:

1. Add `OPEN_WEARABLES_<PROVIDER>=true` (or a shared allowlist).
2. Reuse `client.ts` (`getOwAuthorizeUrl`, `triggerOwSync`, `listOwWorkouts`, …).
3. Add a thin `createOwXProvider()` like `whoop.ts` (same `FitnessProvider` surface).
4. Branch in `getServerFitnessProvider`.
5. Reuse `mapOwWorkoutToActivity` / readiness mappers (already parameterized by provider).
6. Put that provider’s OAuth secrets on the **OW** instance, not on Fitness Battle.

Phone sources (Apple Health / Health Connect) are a different OW path (mobile SDK) — out of scope for this pilot.

## Verify

```bash
pnpm --filter @fitness-battle/shared test
pnpm --filter @fitness-battle/web typecheck
bash scripts/open-wearables.sh status
curl -s http://127.0.0.1:8001/
```

End-to-end WHOOP still needs real WHOOP developer credentials and a member account (WHOOP has no mock data).

## Ops notes

- Do not commit `services/open-wearables/` (clone + local `.env`).
- Change the OW admin password after first login.
- OW runs FastAPI + Postgres + Redis + Celery beside the Next app — expect that cost when judging whether to migrate more providers.
