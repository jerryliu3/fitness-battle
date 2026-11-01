# Data & benchmarking status

What is loaded today versus what is still empty or synthetic.

## Compete / training boards (My track, The field, Splits, Pace, Athlete)

| Data | Source | Status |
| --- | --- | --- |
| Weekly effort board | Compete engine + `week_fields` / `week_field_roster` for signed-in athletes | Shared real peers with synthetic fillers; guests/demo retain local boards |
| Private crew shared field | `week_fields` + compete `crewBoard` pin | Crew and solo seating share one store and roster RPC. Crew scores still use sessions explicitly shared with that crew. No group-approval step yet; team-vs-team not built |
| 1v1 rivals | Removed from product | Legacy `compete_duels` cleared on sanitize; action is a no-op |
| Pace absolutes (5K–marathon, 20K/40K) | Your synced/history activities + synthetic field times from Elo | Works offline; empty for “you” until history/sync |
| Lessons | Deterministic schedule in shared | Works offline |
| 90-day calibration | Synthetic history generator (`import-history`) | One-time; not live tracker data |
| Live activities | Strava, WHOOP, Oura, and Garmin sync APIs, plus Garmin file import and phone ingest | Stub without keys or in demo mode. With keys, a signed-in sync is stored and applied to the local effort board. FIT/GPX/TCX import does not need Garmin approval. |
| Week close / Elo settle | `rollClock` on app load + signed-in `/api/compete` GET/PUT | No cron; server settles relational account state on load/save (up to 12 missed weeks then jumps) |
| Week-complete reveal | `pendingRevealIds` + My track receipt | Place, Elo before→after, effort |
| Season history | `periodResults` on Athlete | Cap 104 rows; open + verified tracks |
| Past-self ghost | Shared `GhostReference` via `resolvePastSelfGhost` | Same-cutoff overlay from activities in a prior window (default: previous equal-length period). Not ranked. Arbitrary bounds / N-periods-ago supported; UI defaults to last week |

Signed-in fields can seat real athletes and load their field totals. Synthetic athletes fill unoccupied seats; guest/demo fields stay local.

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

## Compete persistence (signed-in)

| Item | Status |
| --- | --- |
| Account compete | Relational only (`athlete_prefs` + related tables); `compete_snapshots` dropped |
| Relational normalize | Full signed-in cutover — single table path, no compete jsonb |
| Density matching | Signed-in open fields share persisted seating; guest/demo matching stays per-viewer |

See [compete-persistence.md](compete-persistence.md).

## Battles Supabase (`supabase/`) — **not the play path**

Invite-code `battles` / `periods` / `standings` remain from the early scaffold. **Do not migrate the weekly compete product onto them.**

| Item | Status |
| --- | --- |
| Schema / join RPC / recompute | Present |
| Wired to play UI | **No — intentionally parked** |

## What to load next

1. Apply `packages/rankings/imports/*.import.sql` with `RANKINGS_DATABASE_URL` (see `docs/ingestion.md`).
2. A public half-marathon list, plus New York, Tokyo, and Sydney once a results list is on the page.
3. Point `NEXT_PUBLIC_USE_DEMO_DATA=false` plus Strava keys and the service role at a real athlete backfill. Token storage and score recompute are already wired for that mode.

## October 31 native account-load repair

Production account reads required `effort_score_events` before its additive
migration had been applied. This failed the account load and consequently gated
native Sync / Add Activity. Applied the existing
`20261031135120_effort_score_events.sql` migration to the Fitness project and
verified an authenticated read under the affected account. No historical score
awards were reconstructed.

The migration service initially recorded this migration as `20261031212647`.
The owner reconciled the history entry to repository version `20261031135120`.
Verified that exactly one `effort_score_events` entry exists under the repository
version and that the tool-generated version is absent. Migration history and the
repository filename are aligned; the deployment bookkeeping blocker is resolved.

## Native followups: lifetime overtakes and demo health

Alice's stored lifetime count is zero. Code inspection found the profile column
and readers, but no production writer or durable overtake-event ledger. Zero is
therefore not evidence that she never passed an athlete; no historical total was
invented from current standings or archived placement. A durable, idempotent
server-owned overtake ledger remains necessary to populate this counter reliably.

The reserved Alice demo account now receives a rolling 90-day daily-health
fixture, including today, labeled with provider `demo`. Genuine provider readings
remain separate. This fixture is presentation data and is not persisted as a
provider ingestion or used to award competition points.

## Account deletion: creator references

Production logs identified `crews_created_by_fkey` blocking deletion of
`test@test.com`. Applied `20261101005633_account_deletion_shared_references.sql`:
Crew and battle creator references now become null when their profile is deleted;
shared groups, other memberships and competition data remain intact. The repository
filename matches the version generated by the migration service. The local
Supabase CLI was unavailable due to a runtime failure.

Read-only inspection found no admin audit records for the reported test account.
Two audit foreign keys still block deletion of accounts present in admin audits.
Automatic approval review rejected removing these audit records as exceeding the
requested scope. The proposed targeted cleanup is reviewable in
`supabase/pending/account-deletion-audit-cleanup.sql` and is not applied or part of
the migrations directory: remove personal before/after snapshots about a deleted
target, retain other athletes' audit records with a nullable actor reference.
No account was deleted by the agent. No tests or typechecks were run.

## Atomic overtake writer (prepared, not deployed)

Prepared the additive `atomic_overtake_receipts` migration and account commit
integration. This resolves the missing lifetime writer for future server-baselined
crossings without fabricating Alice's historical total. The migration must be
applied before the corresponding application release. No tests, typechecks or
builds were run at the owner's request; regression cases were added for authority
routing, server-owned lifetime acknowledgements and rejected revisions.
