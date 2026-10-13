# Data & benchmarking status

What is loaded today versus what is still empty or synthetic.

## Compete / training boards (My track, The field, Splits, Pace, Athlete)

| Data | Source | Status |
| --- | --- | --- |
| Weekly effort board | Local compete engine + synthetic field athletes | Works offline in the browser (localStorage) |
| 1v1 rivals | Synthetic nearest-Elo field | Works offline |
| Pace absolutes (5K–marathon, 20K/40K) | Your synced/history activities + synthetic field times from Elo | Works offline; empty for “you” until history/sync |
| Lessons | Deterministic schedule in shared | Works offline |
| 90-day calibration | Synthetic history generator (`import-history`) | One-time; not live tracker data |
| Live activities | Strava sync API | Stub without keys or in demo mode. With keys, a signed-in sync is stored and applied to the local effort board |
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

## Battles Supabase (`supabase/`)

| Item | Status |
| --- | --- |
| Profiles / battles / periods / standings / activities | Schema present |
| Join RPC | `join_battle_by_code` |
| Create battle + period seed | `create_battle` (additive migration) |
| Period roll + late joiners | Fixed in additive migration |
| Score recompute from activities | `recompute_battle_standings` |
| Wired to play UI | **Not yet** — play UI still uses the local compete engine |

## What to load next

1. Apply `packages/rankings/imports/*.import.sql` with `RANKINGS_DATABASE_URL` (see `docs/ingestion.md`).
2. A public half-marathon list, plus New York, Tokyo, and Sydney once a results list is on the page.
3. Persist compete state (or battles standings) per authenticated user once Supabase env is live.
4. Point `NEXT_PUBLIC_USE_DEMO_DATA=false` plus Strava keys and the service role at a real athlete backfill. Token storage and score recompute are already wired for that mode.
