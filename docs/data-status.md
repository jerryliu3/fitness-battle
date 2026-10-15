# Data & benchmarking status

What is loaded today versus what is still empty or synthetic.

## Compete / training boards (My track, The field, Splits, Pace, Athlete)

| Data | Source | Status |
| --- | --- | --- |
| Weekly effort board | Local compete engine + synthetic field athletes | Works offline in the browser (localStorage) |
| Private crew shared field | `crew_week_fields` + compete `crewBoard` pin | Optional at join: alone (density) or together (shared individual board). No group-approval step yet; team-vs-team not built |
| 1v1 rivals | Synthetic nearest-Elo field | Practice / offline only — deferred for live people until there is density |
| Pace absolutes (5K–marathon, 20K/40K) | Your synced/history activities + synthetic field times from Elo | Works offline; empty for “you” until history/sync |
| Lessons | Deterministic schedule in shared | Works offline |
| 90-day calibration | Synthetic history generator (`import-history`) | One-time; not live tracker data |
| Live activities | Strava, WHOOP, Oura, and Garmin sync APIs, plus Garmin file import and phone ingest | Stub without keys or in demo mode. With keys, a signed-in sync is stored and applied to the local effort board. FIT/GPX/TCX import does not need Garmin approval. |
| Week close / Elo settle | `rollClock` on app load (UTC Mon boundary) | No server cron for the local engine; settles up to 12 missed weeks then jumps |
| Week-complete reveal | `pendingRevealIds` + My track receipt | Place, Elo before→after, effort |
| Season history | `periodResults` on Athlete | Cap 104 rows; open + verified tracks |

There is **no production athlete dataset** behind the weekly compete field yet — peers are generated for matching.

## Race rankings (`/rankings`)

Separate Supabase project from battles (`rankings-db/`, hosted `pzadctqmyekkydteivlf`).

| Item | Status |
| --- | --- |
| Schema | Ledger with fingerprint uniqueness, youth filter, ODbL display gate |
| Fixture | `packages/rankings/fixtures/emv-10k-2025.json` — 2025 Estonian 10 km (OpenTrack, ODbL) |
| Parser tests | Expect 44 adult results, 5 under-18 skipped |
| Distances with rows | Import files exist for 5K (Berlin Generali, 9,168), 10K (OpenTrack fixture, 44), and marathon (Boston, London, Berlin, Chicago). Half marathon has no list yet. |
| 5K / half / marathon boards | UI reads the ledger. The new import SQL is not applied until `RANKINGS_DATABASE_URL` is set. |
| Local seed | No `rankings-db/seed.sql`; local reset leaves boards empty unless you emit+apply import SQL |
| Hosted | README points at the live project; UI needs `NEXT_PUBLIC_RANKINGS_*` env |
| Athlete identity merge | Out of scope — same person can appear twice across events |

## Compete persistence (signed-in play UI)

| Item | Status |
| --- | --- |
| Per-viewer relational SoT | `athlete_prefs`, `sport_ratings`, `wave_enrollments`, `period_results`, enriched `activities`, sleep/health/duels |
| Account snapshot | `compete_snapshots` kept as a **thin** prefs shell after dual-write; `demoNow` stripped on server write |
| Week reveal | Derived from `period_results.acknowledged_at is null` (not a separate pending table) |
| Crew share | `share_crew_week` reads enriched `activities`, not snapshot jsonb |
| Server settlement | `/api/compete` GET/PUT run `rollClock` then persist |
| Density matching | Still per-viewer (`peer_ids[]` / `synthetic_ids[]` on enrollments) |

## Battles Supabase (`supabase/`) — **not the play path**

Invite-code `battles` / `periods` / `standings` remain in the schema from the early scaffold. **Do not migrate the weekly compete product onto them.** Play uses the compete tables above. Battles RPCs may still recompute from `activities` for any leftover memberships; that is not the My track / Field engine.

| Item | Status |
| --- | --- |
| Profiles / battles / periods / standings | Schema present; play UI does not use battles standings |
| Join RPC | `join_battle_by_code` |
| Wired to play UI | **No — intentionally parked** |

## What to load next

1. Apply `packages/rankings/imports/*.import.sql` with `RANKINGS_DATABASE_URL` (see `docs/ingestion.md`).
2. A public half-marathon list, plus New York, Tokyo, and Sydney once a results list is on the page.
3. Apply `20261015040000_normalize_compete.sql` on the Fitness Battle Supabase project.
4. Point `NEXT_PUBLIC_USE_DEMO_DATA=false` plus Strava keys and the service role at a real athlete backfill. Token storage and score recompute are already wired for that mode.
