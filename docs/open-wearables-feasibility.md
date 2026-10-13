# Open Wearables / Garmin phone-bridge feasibility

Investigation only. **Open Wearables backend was not deployed** (deployment gate below). Evidence from Open Wearables docs (2026), Garmin support/press coverage of Health Connect, and this repo’s existing fitness code.

## Already built in this repo

We already have a phone → server health path. Open Wearables is **not** in the monorepo (no package, env, or docs references).

| Piece | Where | What it does today |
| --- | --- | --- |
| Apple Health workout sync | `apps/mobile/src/lib/device-health.ts` → `syncAppleHealth` | `react-native-health`, 90-day anchored workouts, posts to ingest |
| Health Connect workout sync | same file → `syncHealthConnect` | `react-native-health-connect`, ExerciseSession + Distance, posts to ingest |
| Manual sync UI | `apps/mobile/app/connections.tsx` | “Sync Apple Health” / “Sync Health Connect” |
| Expo plugins / permissions | `apps/mobile/app.json` | HealthKit usage strings; Android `READ_EXERCISE`, `READ_HEART_RATE`, `READ_SLEEP` (sleep not read yet) |
| Ingest API | `POST /api/fitness/ingest` | Auth’d upload for `apple_health` \| `google_health`; activities + readiness; duplicate-safe store |
| Garmin cloud | `packages/shared/.../garmin-provider.ts`, `/api/fitness/garmin/*` | OAuth 1.0a + Health API ping path; stub without keys |
| Garmin file import | `POST /api/fitness/import` | FIT/GPX/TCX/zip without Garmin API approval |
| Sleep as a compete metric | `packages/shared/src/compete/health.ts` | Sleep board/scoring shape; not yet filled from device HealthKit/Health Connect |

**Gaps vs the Open Wearables prompt:** no on-device source filter (all workouts upload), no sleep/RHR/HRV ingest from the phone, no background sync, no Garmin-only attribution, no Open Wearables SDK or backend.

---

## 1. Open Wearables: what the docs actually support

Sources: [Mobile SDK](https://openwearables.io/docs/sdk), [Integration guide](https://openwearables.io/docs/sdk/integration), [React Native SDK](https://openwearables.io/docs/sdk/react-native), [Apple Health provider](https://openwearables.io/docs/providers/apple-health), [Coverage matrix](https://openwearables.io/docs/providers/coverage), [Docker deploy](https://openwearables.io/docs/deployment/docker).

### SDKs

| Platform | Package / repo | Notes |
| --- | --- | --- |
| iOS (Swift) | `OpenWearablesHealthSDK` | HealthKit only; background delivery + `BGTaskScheduler` |
| Android (Kotlin) | `open_wearables_android_sdk` | Health Connect (`"google"`) or Samsung (`"samsung"`) |
| Flutter | wrapper | Uses native SDKs |
| React Native / Expo | `open-wearables` via GitHub | **Not on npm yet**; Android needs Maven Local publish of native SDK; Expo config plugin for HealthKit + Health Connect |

Our mobile app is Expo SDK 54 / RN 0.81 — same generation OW documents for the RN SDK.

### Backend

Self-hosted FastAPI + PostgreSQL + Redis + Celery. Auth for production apps: backend mints user-scoped tokens (`POST /api/v1/users/{id}/token` with `app_id` / `app_secret`); device never holds the secret. Sync upload: `POST /api/v1/sdk/users/{userId}/sync`.

Also supports **direct Garmin cloud** OAuth/webhooks. That path needs Garmin developer approval — the same class of access that is currently paused for us. OW’s own docs treat Apple Health / Health Connect as the **push bridge** when a cloud provider is missing or incomplete.

### Documented capabilities that match the prompt

- Incremental / anchored sync and resumable sessions
- Historical window via `startBackgroundSync(syncDaysBack)` (e.g. 90)
- Best-effort background sync (iOS system scheduling; Android WorkManager ≥15 min floor)
- Workouts, sleep, resting HR, HR samples among supported types
- Source metadata retained after upload (`original_source_name` / data-sources API)

### Documented gaps / mismatches

| Requirement | OW evidence |
| --- | --- |
| Filter by Garmin **before upload** | **Not documented** on any SDK API. SDKs sync authorized HealthKit/Health Connect types wholesale. Attribution exists **after** ingest. |
| Manual refresh | Integration guide: **“There is no manual sync call.”** Foreground resume + background only. |
| White-label inside host branding | Possible for UI we own; OW is a separate backend + optional developer portal, not a drop-in into `/api/fitness/*`. |
| Garmin-only HRV via phone bridge | OW can store HRV **if present** in the health store; Garmin → OS export of HRV is unreliable / absent (below). |
| Production RN install | Temporary GitHub + Maven Local install path until npm/public Maven. |

---

## 2. Garmin → HealthKit / Health Connect metrics

### iOS (Garmin Connect → Apple Health)

Garmin documents one-way push (Connect must sync; often needs the Connect app active). Third-party and Garmin support write-ups consistently list:

| Metric | Available via HealthKit from Garmin? | Confidence |
| --- | --- | --- |
| Workouts (type, start/end, duration, distance, calories) | Yes (summaries). **No GPS route.** Workout HR often sparse (high/low / coarse samples), not full beat stream | High |
| Sleep duration / stages | Yes (Sleep Analysis; stages reported by users / secondary sources) | Medium–high |
| Resting heart rate / all-day HR | Yes (all-day HR; RHR often present as samples — confirm per device) | Medium |
| HRV | **No native Garmin → HealthKit HRV export** in current public guidance; third-party apps exist to backfill | High that OS path alone is insufficient |
| Body Battery, stress, training load, VO2, SpO2 | Stay in Garmin ecosystem | High |

Source attribution on iOS: HealthKit `HKSource.bundleIdentifier`. Garmin Connect is commonly `com.garmin.connect.mobile` (verify on-device before shipping a hard allowlist).

### Android (Garmin Connect → Health Connect)

Garmin published a Health Connect partner list (2025). Official support lists one-way share of workout fields (calories, distance, HR, speed, steps, …) and wellness (sleep, HR, steps, weight, …). Google Health’s partner notes for Garmin explicitly list **HRV, SpO2, routes, lap detail as not shared**.

| Metric | Via Health Connect from Garmin? | Confidence |
| --- | --- | --- |
| Exercise sessions + distance/calories/HR | Yes, when user enables Connect → Health Connect | High (feature availability depends on Connect version / device) |
| Sleep | Yes (“Sleep Data”) | Medium until verified on device |
| Resting HR | Commonly available through Google Health aggregation of partner data; confirm Garmin writer vs derived | Medium |
| HRV | **Not shared by Garmin** per Google Health partner notes | High |

Source attribution: Health Connect `metadata.dataOrigin` / package name for the writing app (Garmin Connect package — confirm on device).

### Historical depth

OS stores keep what Connect wrote while the phone had permission and sync enabled. Not the same as Garmin’s cloud backfill window. Stale Connect sync ≠ zero values; UI must distinguish missing permission, missing Garmin export toggle, empty store, and true zeros.

---

## 3. Source filtering

| Layer | Can filter Garmin-only before upload? |
| --- | --- |
| Open Wearables mobile SDKs (documented API) | **No** — no source allowlist / predicate in public RN/iOS/Android integration docs |
| Open Wearables backend after upload | Partial — records keep `source` / `original_source_name`; query/filter later. Still uploads unrelated apps’ data first (privacy + volume problem) |
| Our current `device-health.ts` | **No** — uploads every mapped workout |
| Smallest maintainable fix | Filter in-app with HealthKit `sourceRevision` / Health Connect `dataOrigin` against a Garmin allowlist **before** `POST /api/fitness/ingest` (or before any OW sync if we wrap native reads ourselves) |

Recommendation: treat **on-device allowlist filtering** as a host-app responsibility. Do not rely on OW for the prompt’s “filter before upload” rule.

---

## 4. Architecture options

### A. Extend existing phone ingest (recommended next step)

`Garmin Connect → HealthKit / Health Connect → Expo app (filter) → POST /api/fitness/ingest → existing store / compete engine`

Pros: already scaffolded; stays in charter tracker model; no second Postgres/Redis/Celery stack; branding stays ours.  
Cons: we own sync, retries, sleep/RHR mapping, background behavior.

### B. Adopt Open Wearables as ingestion middle tier

`… → OW RN SDK → OW backend → webhooks/API → Fitness Battle`

Pros: broader type coverage, background sync maturity, unified schema if we later add more wearables through OW.  
Cons: duplicate platform; no pre-upload source filter; RN packaging friction; manual sync gap; white-label UX still needs our UI; Garmin cloud inside OW still needs Garmin approval for the rich path.

### C. Garmin cloud OAuth (paused)

Keep stub + file import. Do not configure live Garmin OAuth until access is available. File import remains the offline escape hatch.

---

## 5. Deployment gate — decision

**Do not deploy the Open Wearables backend yet.**

Reasons:

1. Pre-upload Garmin-only filtering is a hard requirement and is **not** a documented OW SDK feature.
2. This repo already has a viable device ingest path to harden instead of standing up FastAPI/Postgres/Redis/Celery.
3. End-to-end PoC still needs physical iOS/Android devices with Garmin Connect writing into the health store — not available as a cloud-agent substitute.
4. HRV via the phone bridge is a documented **non-goal** for Garmin OS export; promising it would be inventing coverage.

Revisit OW deploy only if we explicitly want OW as a multi-provider normalization layer **and** accept either (a) post-upload source filtering with privacy tradeoffs, or (b) forking/wrapping SDK reads to filter locally.

---

## 6. Milestone 1 PoC checklist (when devices are available)

Do this on the **existing** ingest path first (option A). Mark each platform separately.

1. Enable Garmin Connect → Apple Health / Health Connect on a real watch + phone.
2. Confirm one workout and one sleep (or RHR) sample appear in the OS health app with Garmin as source.
3. App reads samples, logs `bundleId` / `dataOrigin`, **drops non-Garmin**, uploads survivors.
4. Repeat sync → no duplicate activity rows (existing external-id persistence).
5. Record platform limits: no GPS from Garmin→HealthKit, coarse workout HR, no HRV, Connect must sync for freshness.

Success criteria for “proceed to production build”: steps 2–4 green on at least one iOS and one Android device, or blockers written up with evidence.

---

## 7. Supported / uncertain / blocked (summary)

### Supported (evidence)

- Phone bridge architecture for Garmin activity + much of daily health via HealthKit / Health Connect
- OW SDKs + self-host backend for wholesale health-store sync (if we accept their model)
- Our existing workout ingest + Garmin file import + Garmin OAuth stub
- Sleep as a product metric shape in shared compete code

### Uncertain (needs device PoC)

- Exact Garmin Health Connect rollout per region/app version
- Whether every Garmin model writes sleep stages and RHR consistently
- Stable package/bundle strings across Connect updates (verify allowlist on device)
- How complete workout HR/calories are after OS rewrite

### Blockers / non-goals (current evidence)

- **Garmin developer API paused** → no new cloud OAuth dependency for this milestone
- **HRV from Garmin via OS health stores** → do not include in PoC success criteria
- **OW pre-upload source filter** → missing; custom filter required
- **OW backend deploy** → gated off until filter + PoC path chosen
- **Expo Go** → cannot run HealthKit/Health Connect (dev client required; already documented)

---

## References

- In-repo: `docs/integrations.md`, `apps/mobile/src/lib/device-health.ts`, `apps/web/src/app/api/fitness/ingest/route.ts`
- Open Wearables: https://openwearables.io/docs/sdk , `/docs/sdk/integration`, `/docs/sdk/react-native`, `/docs/providers/apple-health`, `/docs/providers/coverage`, `/docs/deployment/docker`
- Garmin Health Connect support FAQ (data categories); Google Health partner notes (Garmin exclusions including HRV)
