# Public race results: ingestion and discovery scope

Scoped November 9, 2026. The original scoping pass changed no scraper, scheduler, database or production behavior. This document extends [ingestion.md](ingestion.md) and the [results explorer research](all-time-rankings-research-2026-11-09.md).

Implementation has begun with the extraction-safety slice described in [ingestion.md](ingestion.md): strict paging/result-set selection, preserved source decisions, collision rejection and run reports. The roadmap below remains the target; publication freezing, discovery, source audits and reports are still pending. The original scope's research statements describe the pre-implementation checkout.

## 1. Direction and boundaries

Build a curated public results archive. Prioritize prominent events in the sports we choose to support, rather than attempting to crawl every race. Use public news and newspapers to discover events and reported results, and organizer/timing publications to obtain complete race fields. An event directory, event results, and all-time boards are different views of the same stored observations.

Owner requirements:

- Prioritize the biggest public events from the biggest sports.
- Prefer public information, including news and newspapers; official marathon and IRONMAN results sites are acceptable source candidates.
- Scan weekly for newly completed events and newly discovered major events.
- Import an edition once. Do not periodically refresh its saved results.
- Allow users to report stale or incorrect data; investigate and correct on demand.

Recommendations below remain proposals where the owner has not selected a product policy. In particular, sport breadth, the historical backfill target, and the definition of “big” need a decision before bulk acquisition. These do not prevent the source audit and pipeline repairs from being scoped.

Deliverables are the catalog, source registry, parsers, durable jobs, validation/publication, coverage reads, report intake, and an operator workflow. Search/full-field navigation in the companion research is a dependent product stream. Live tracking, replay, automatic athlete merging, team-sport scores, paid feeds, and a universal sports ranking are outside this initial pipeline proposal.

## 2. Existing foundation and gaps

Inspected `packages/rankings/src/ingest/`, its CLI, `rankings-db/supabase/`, `docs/ingestion.md`, `docs/ingestion-trial.json`, and the living context/coding/setup docs. No hosted database was queried.

| Existing piece | What can be reused | Work required |
| --- | --- | --- |
| Separate rankings database | Sources, snapshots, runs, editions, source observations and performances | Add operational state and canonical event identity; preserve the existing store |
| MikaTiming, OpenTrack, CSV and RunSignup parsers | Fetch/normalize foundation and fixtures | Provider contract audit, raw page capture, complete pagination and explicit public/final-state handling |
| Five catalog entries plus OpenTrack fixture | Initial road-running sources | Move recurring event identity and edition discovery out of hard-coded 2025 entries |
| Source display gate | Attribution and source suppression | Imports currently set approval automatically and can undo a suppression; preserve operator decisions |
| Result identity excluding finish time | A time correction need not create a duplicate result | External IDs are currently unique by source alone; verify provider namespace and scope to edition/result set where needed |
| SQL import transaction | Existing per-file writes commit together | Add staged validation, publication revisions, concurrency control and durable failure records |
| Import trial report | Evidence of local extraction | It is not proof of hosted publication or complete current coverage |

The checked-in October report describes 195,296 rows across four 2025 marathons, Berlin 5K and a 44-result 10K fixture. Chicago has an unresolved 206-row difference from its public total. There is no documented half-marathon field. NYC, Tokyo and Sydney failed the previous retrieval attempts; those historical failures must be retested, not treated as permanent limitations.

Specific correctness work before automation:

- RunSignup ends pagination using accepted rows. Youth/unparsed filtering can make a full upstream page look short. Iterate each result set independently using upstream pagination/raw counts, never accepted counts.
- Confirm RunSignup response shape and column mapping with a current public response. Documentation includes result-set metadata and nested result structures; the existing lightweight parser is not proof of current end-to-end support.
- MikaTiming stops on a repeated first ID and uses an overlap heuristic for the extra category request. These are anomaly signals, not proof that the remaining field is exhausted. Page caps/repeats must mark an import incomplete.
- MikaTiming assigns category from the requested filter. Verify the returned category and filter behavior; do not infer that an ignored filter represents another category.
- Current events can have year-specific provider IDs; `(event, year)` also cannot represent every multi-day/repeated edition. Preserve legacy IDs but add a canonical series and edition identity.
- Some snapshot hashes describe normalized results, not raw fetched pages. Retain actual source payloads with retrieval metadata and parser versions.
- The SQL run entry is created inside the import transaction, so a rollback also removes failure evidence. Start and finish job/run records independently of the publication transaction.
- The CLI rewalks the catalog and upserts existing results. Scheduled work must use the new published-edition skip rule. Manual CLI paths must respect the same rule unless explicitly performing an audited correction.

## 3. Catalog selection

“Biggest” should combine prominence and participation. A championship with a small elite field and a mass-participation marathon can both qualify. News frequency alone would favor English-language men's professional coverage; it is not a sufficient selection rule.

Proposed tiers, subject to the sport-breadth decision:

| Tier | Selection | Candidate families, not a verified access list |
| --- | --- | --- |
| A: named flagships | Explicitly selected championships and internationally prominent series | Major marathons; IRONMAN and 70.3 world championships; Olympic/world championship races within supported sports |
| B: large public fields | Major participation events with obtainable full results | Large half marathons, 10Ks and 5Ks; major regional triathlons; later mass cycling and open-water events |
| C: geographic and member demand | Major regional events, repeated requests, and useful gaps in distance/year coverage | Regional flagship races that improve coverage beyond the initial markets |

Keep tier and the reason for inclusion in the catalog. Within each tier, order by documented field size, source readiness, member demand and coverage gaps. Record the year and URL behind participation figures. Do not invent an exact worldwide size ordering from inconsistent entrant/finisher counts. Thresholds and geographic targets are policy decisions, not hidden scraper heuristics.

Recommended first acquisition sequence:

1. Reconcile existing marathon fields and validate their actual hosted state read-only during implementation.
2. Obtain the latest completed edition of Boston, London, Berlin, Chicago, NYC, Tokyo and Sydney where accessible. Monitor Cape Town's edition/status separately: the official Majors site says its first Major is in 2027, so older editions must retain their historical status. [Official series catalog](https://www.worldmarathonmajors.com/six-star/majors).
3. Add complete half-marathon and 10K fields; shortlist Great North Run, Valencia Half Marathon, NYC Half, Bolder Boulder and Peachtree for access/coverage evaluation. Names here are candidates, not claims that extraction is implemented or permitted.
4. Validate one IRONMAN championship edition and one 70.3 edition end to end before expanding that provider family.
5. Work backward through the agreed historical window, recording unavailable years explicitly. If breadth is preferred, validate a cycling and swimming adapter before scaling those catalogs.

Recommend running and triathlon as the first complete acquisition release, then cycling and swimming. All-time road boards already exist; triathlon requires new comparability semantics. Trail/ultra events and professional track results can join later with course/discipline rules. Strength results need a separate scoring model. Team sports need match/team entities and a separate scope.

## 4. Sources: discovery, reported results and full fields

Use two acquisition paths with a shared provenance model:

| Source | Primary role | Publication limit |
| --- | --- | --- |
| Public newspaper/sports coverage | Discover major events, dates, winners and explicitly reported performances | Publish only supported factual observations after validation; mark coverage as selected results |
| Organizer/timing site | Complete fields, official placements, clocks, categories and available splits | Eligible for full-field publication only after completeness checks |
| Governing-body calendars/results | Discover championships and provide official discipline/category context | Do not assume a public page exposes a downloadable complete dataset |
| Licensed/open datasets | Historical backfill when their terms and lineage fit | Preserve required attribution and dataset-specific obligations |
| Organizer/user-supplied public link or file | Fill gaps and resolve reports | Validate provenance; user submission alone cannot authorize public republication |

Candidate news discovery sources: public AP and Reuters articles, BBC Sport, national/local newspapers near priority events, and specialist running/triathlon/cycling coverage. Use available feeds, sitemaps, search queries and calendar pages; avoid a crawler across entire newspaper sites. Discover broadly, then fetch only relevant public pages. These are source candidates; automation access must be checked individually.

The reported-result path retains only the stated name, event/date, performance, category/placement when explicit, URL, publication/retrieval date and evidence locator. It does not copy article prose or photographs. An article may omit a clock basis or describe a record rather than a race finish: unresolved facts stay in review. Search snippets and model recollections are discovery hints, not evidence for a published result. Optional model extraction can propose structured fields; it cannot fill missing facts or approve publication.

If an official source later supplies the same result, attach the article as corroborating evidence to the canonical performance. Do not add a second finish or overwrite conflicting facts silently. Editorial fact selection and official standings have different evidence roles; conflicts go to review, with official race facts preferred after verification.

Access/reuse is a source-level operational gate. Public visibility does not by itself establish bulk reuse permission. Record source terms, license/permission evidence where applicable, attribution, allowed access method and review date. Honor robots instructions, explicit automation restrictions, private-result flags and takedowns; do not bypass login, paywalls, CAPTCHA or blocked endpoints. Unresolved access/reuse means discovery-only or held publication. A reviewed source can be reused across editions without repeating an approval for every row. Reuters, for example, offers licensed sports content, so its public articles are not an assumed free bulk feed. [Reuters sports offering](https://reutersagency.com/content/coverage-expertise/sports?sf_paged=3).

The existing `PUBLIC_LIST_REUSE` text is a recorded working practice, not source-specific permission. Replace that blanket auto-approval behavior during implementation. A suppression must survive imports, provider changes and retries. Keep a separate event/result suppression when a whole source need not be disabled.

## 5. Adapter validation spikes

| Adapter | Bounded spike and success criterion |
| --- | --- |
| MikaTiming | Reconcile Chicago; verify category filters, full raw page counts and final-page behavior across two event templates; compare deterministic imports |
| RunSignup | Discover races/events, enumerate public result sets, inspect preliminary status and fetch each set through every page; validate ID scope and overlapping overall/division sets |
| NYC / other script-rendered results | Inspect public page/network contract within allowed access; prove a complete field and stable IDs, or record a blocked/manual path |
| IRONMAN | Find the current organizer-linked results publication for one full-distance and one 70.3 event; test full-field access, finish status, categories, actual distances and split clocks |
| Public news | Evaluate a small set of event reports from several publishers; identify event/edition and extract explicit facts into a review queue without ungrounded additions |
| Cycling / swimming, if selected | Validate one event per sport and define result/comparability fields before generalizing an adapter |

RunSignup's current documentation recommends fetching one result set at a time because pagination applies separately to each set; it also exposes public/preliminary metadata. This confirms the need for a contract/pagination repair. [Get results](https://runsignup.com/API/race/:race_id/results/get-results/GET), [get result sets](https://runsignup.com/API/race/:race_id/results/get-result-sets/GET), [discover races](https://runsignup.com/API/races/GET).

IRONMAN athlete guides describe provisional race-day results and post-race downloads, which supports checking finality before a single import. This is not validation of a current reusable API. The generic IRONMAN results page was not retrievable through the research browser. [Organizer athlete guide](https://www.ironman.com/sites/default/files/2025-05/IM%20Athlete%20guide%20EN_1.pdf).

World Aquatics has a public results destination, but its fetched HTML did not establish a complete data feed. World Athletics returned 403 during this research. Treat both as adapter investigations, not ready integrations. [World Aquatics results](https://www.worldaquatics.com/results).

Each spike produces: observed URLs/access status, source decision, raw response fixture policy, stable-ID mapping, pagination proof, source counts, normalized sample, estimated requests/storage and a go/hold decision. A blocked source should not prevent other approved sources shipping.

## 6. Weekly discovery and import-once lifecycle

Recommend a repository-owned scheduled workflow invoking a Node worker in `packages/rankings`, with database-backed jobs. Start with one worker implementation and a scheduled/manual entry point; no new queue service is needed initially. Keep edition imports bounded and resumable so large fields can span worker invocations. The weekly scan discovers/enqueues work; an independently rerunnable worker drains unfinished jobs.

Proposed schedule: Monday morning UTC, covering the preceding 21 days and the next 90 days of selected event calendars. Overlap handles late publication and scheduler delay; an edition identity prevents duplicate imports. A persisted successful-scan cursor provides catch-up after longer outages. The exact hour/window is adjustable operating configuration, not the battle's Eastern weekly period rule. Event dates use the event's local timezone.

On each scan:

1. Check approved recurring calendars and feeds for new editions, cancellations, reschedules and changed result locations. Search public news for major completed races and previously unknown candidates.
2. Resolve aliases and canonical event/edition identities before creating jobs. Newspaper coverage from multiple publishers should converge on one edition.
3. Known approved series and adapters can enqueue automatically. A new series or changed host/access contract enters review. News coverage alone does not auto-approve a new source.
4. Skip published editions before fetching result bodies. Discovery may revisit a calendar/article index containing old races; it must not schedule their saved results for refresh.
5. For unpublished completed editions, check result availability and finality. Prefer organizer-final results. If finality is absent, hold for the agreed post-race delay and review; never invent a “final” flag.
6. Fetch, snapshot, normalize, validate and atomically publish eligible editions. Freeze that publication against ordinary imports.
7. Record scan/run summaries, blocked adapters, delayed results and actionable failures in the operator view. Failed/capped scans are not successful empty scans.

Keep awaiting-results candidates in the queue beyond the lookback window. Proposed retry policy: at most weekly availability checks for six weeks, then manual review; transient 429/5xx responses get a small bounded retry budget honoring `Retry-After`. A published edition has no next-refresh timestamp. Only a reviewed report/correction or explicit operator recovery creates a new revision.

Lifecycle: `discovered → review/approved → awaiting_results → queued → fetching → staged → validated → published`. Failed jobs retain checkpoints and retry/review state. Coverage (`complete`, `partial`, `selected_results`, `unknown`) and finality are independent of job status. A deliberately published partial field is frozen too; completing it later requires an explicit correction decision, not a hidden refresh.

Operational safeguards: unique active job per edition/purpose, database lease and heartbeat, bounded pages/bytes/time, per-host concurrency/rate limits, checkpointed page storage, deterministic deduplication and parser versioning. Repeated pages or hitting a cap fail completeness. Recovery reparses retained pages when possible. Use an identifiable crawler user agent/contact. Do not log credentials or embed them in source links.

No recurring Codex reminder or production workflow was created for this scoping task. The proposed schedule belongs to the ingestion service and should be enabled after a successful manual end-to-end run.

## 7. Data model and publication contract

Extend `rankings-db` additively. Keep provider parsing/fetching in `packages/rankings`; portable read types and metric rules belong in platform-agnostic shared modules. Web and native consume the same published data. Race imports do not modify training activities, Elo, weekly competition or athlete PRs automatically.

| Concept | Minimum addition / responsibility |
| --- | --- |
| Canonical event series | Stable internal ID, aliases, sport, organizer, geography, tier and selection evidence; provider IDs mapped separately |
| Edition / discipline | Edition occurrence ID, local date/timezone, year label, actual distance/course, format and category population; allow several occurrences in a year |
| Source registry | Discovery/result role, adapter, reviewed hosts, access/reuse state, attribution, suppression and review history |
| Candidate / scan / job | Discovery evidence, scan cursor, approval, job purpose, lease, retries, checkpoints and errors |
| Edition publication | Revision, finality evidence, coverage scope, source/raw counts, exclusions, validation outcome, publication timestamp and freeze |
| Observations / performance | One canonical performance with one or more source observations; retain source-specific identity and clocks |
| Result reports / revisions | Submitted reason/evidence, review status, actor/reason, before/after values and affected publication revision |

These are responsibilities, not a mandate to create one table for every row. Reuse existing sources, editions, runs, snapshots, records and performances. Keep the first migration small and road-compatible; multi-sport constraints can follow in the triathlon slice. Avoid mirroring a second result ledger into the main app database.

Stable observation identity must reflect the actual provider namespace: provider + edition + discipline/result-set + external ID as appropriate. Overall and age-group lists may repeat one finish; preserve their observations/placements without duplicating the canonical performance. An article normally has no finisher ID; ambiguous cross-source matches require review. Never match globally by name alone. Preserve public result IDs/links across corrections and retain aliases when an identity key changes.

Store source spelling, bib where published, category, age-at-event when supplied, finish status, chip/gun clocks, official placement and evidence. Optional splits require checkpoint distance and clock basis. No inferred DOB, contact details, private registration data or guessed nationality. Retain the existing known-under-18 exclusion; unknown age remains unknown. Any requirement to prove adulthood for every unknown-age record is a separate policy decision. Restricted/minor information encountered during parsing must be excluded from retained snapshots or held under an explicitly approved restricted retention policy; normalized public storage must not preserve it accidentally.

Raw evidence retention needs an explicit storage/access/deletion policy before bulk fetching: private storage, minimum necessary payload, hashes/manifests, parser version, fetch timestamp and redaction status. Full articles are not retained by default. Redacted payload hashes must identify the redacted artifact; do not claim they are raw-byte hashes. Reuse permitted source payloads for debugging instead of repeatedly hitting the origin.

## 8. Correctness and all-time semantics

One results archive supports event browsing and all-time queries; do not separately scrape/store an all-time copy. New editions extend the historical query even though previous edition results remain frozen. Rankings and aggregate caches may recompute when new data arrives without refreshing historical sources.

- Full fields must be reachable through bounded pagination; the existing fastest-200 UI is not a coverage contract.
- Complete ingestion means every in-scope upstream result was accounted for: accepted rows plus documented exclusions plus quarantined/error rows, reconciled after overlap deduplication. Entrants, starters, finishers and adult eligible finishes are different totals.
- Reconcile per discipline/category where available. Unknown official totals mean unverified completeness. Unexpected missing pages or unexplained discrepancies block the complete-field label and field-wide percentile claims.
- Partial/news-only results can support a cited result and selected-result search. They cannot supply full-field percentiles, medians or apparent population coverage. Their count is the number stored, not the total field.
- Official placement remains separate from a computed rank; chip versus gun fallback must be inspectable. Keep ties, DNF/DNS/DQ, unknown category and shortened events explicit.
- Road all-time boards mean “among covered performances,” with years/events and clock basis disclosed. They are not certified world records or unique-athlete rankings.
- Triathlon separates full/70.3/other actual formats, individual/relay, professional/age-group and modified courses. Total and swim/bike/run/transition times retain their own semantics. Course-to-course raw times do not establish equivalent athletic performance.
- Cycling separates stage results, general classification, time trials and mass events; race time, time gaps and points are not interchangeable. Swimming separates stroke, distance, pool length and open water. Trail results need course identity. Do not force these into `RoadDistance` or rank every sport by a single elapsed-time field.
- Claims/bookmarks are separate from source identity. Associating a user with a result never authorizes editing official facts.

Publication is a transaction exposing a validated edition revision and its consistent read aggregates together. Readers must see either the prior revision or the complete new revision. Failed initial imports expose no accidental partial board. An intentionally partial publication requires an explicit coverage decision.

## 9. User reports and targeted corrections

Provide **Report a result** on result detail and **Report missing results** on an edition. Web and native submit to one authenticated service. Allow a public missing-event suggestion route only if separately approved; it is not required for the first release.

Reasons: incorrect time/status/category/name; wrong person/claim; missing result; missing event; privacy/removal; other. Capture result/edition ID, reason, explanation, optional public evidence URL, current revision and reporter identity. Do not require claiming the result to report an objective error.

Flow: `submitted → triaged → investigating → resolved / rejected / needs_information`. Duplicate reports can share an investigation while preserving each reporter's private receipt. Submission creates a ticket, never an immediate performance update. Wrong-person claims are corrected in the linking layer. Public fact corrections require source evidence; if the original is unchanged and evidence conflicts, keep the report unresolved or reject with an explanation.

Fetch only the affected result/edition after triage. Present the proposed before/after diff to the operator, apply the smallest correction through the same publication path, append an audit revision, and invalidate affected search/rank/aggregate caches. DQ/removal or duplicate suppression must update cohort counts as well as rows. Missing results may justify a reviewed edition-level recovery. Preserve bookmarks and report references. Organizer suppression/privacy removal can hide data and trigger retained-evidence handling without destroying unrelated records.

Reporter receipts expose status and outcome, not other reporters or private notes. Start with in-app status; email/push is a separate choice. Propose weekly triage with immediate operator visibility for privacy/source complaints; staffing and response promises require an owner. Report-based maintenance means unreported official corrections may remain stale—this is the chosen operating tradeoff, not an unnoticed scheduled-refresh omission.

The app and rankings use separate Supabase projects. Authenticate reports using the main app's verified server session, then use a server-only rankings writer with a trusted reporter reference. Do not assume an `auth.uid()` from one project exists in the other. Users can read their own tickets through that authorized API; operators have explicit roles. Import/review jobs are service-only. No client service key, direct performance edit, or public raw-snapshot access. Use RLS/grants and hardened SQL functions where needed.

Evidence URLs are untrusted input: fetch only through a reviewed source/host policy, reject private/local network destinations, recheck redirects, and cap response types/sizes. Page text and extracted instructions are data, never commands for workers. Rate-limit report creation and retain operator audit trails.

## 10. Operations, cost and measurement

Launch needs an ingestion owner, a backup reviewer, stored credentials where required, and a visible review/failure queue. An operator can approve a candidate/source, inspect a count discrepancy, retry/resume, suppress a publication and resolve a correction. A compact internal view or existing admin extension is enough; avoid building an elaborate workflow product.

Track last successful scan, discovered/approved/rejected candidates, completed editions by sport/year, queue age, time from final-source availability to publication, count discrepancies, parser failures, blocked hosts, requests/bytes, manual minutes per edition, and report age/outcomes. Separate access/permission failures from parser failures and no-results-yet. Alert on missed scans, stuck jobs and failed publications using the existing operational channel selected at implementation; no unsolicited user messaging is part of this scope.

Size by actual pages, not event count alone. Example planning arithmetic: a 50,000-row edition at 100 rows/page needs about 500 requests before category overlap/detail pages. At an illustrative 2 MB per page, raw storage is about 1 GB. Those are assumptions for budgeting, not measured provider costs. Splits or per-athlete detail fetching can multiply both; defer them unless the provider offers a suitable bulk response. Weekly discovery should fetch indexes/metadata, not every archived field. Historical acquisition is a separately capped queue so it cannot starve new editions or corrections.

Before enabling scheduling, measure two representative full fields and set per-run request/byte/runtime caps, storage retention, concurrency and a monthly budget. Prefer structured approved bulk responses over hundreds of detail-page requests. Keep the worker restartable to fit the chosen runner's limits. Use existing hosting/CI where sufficient; choose another worker runtime only if measurements require it.

## 11. Delivery slices and acceptance

| Order | Reviewable slice | Done when |
| --- | --- | --- |
| 1 | Source/coverage audit and policy | Hosted coverage verified read-only; existing sources inventoried; Chicago reconciliation explained or explicitly held; sport/history choices recorded |
| 2 | Road ingestion correctness | Pagination/raw accounting fixed; source suppression survives import; edition-scoped identity verified; durable snapshots and failure logs; semantic regression tests |
| 3 | Catalog, jobs and import-once gate | Canonical editions, scan cursor, leases/checkpoints, staged validation and publication revisions; rerunning a published edition performs no refresh |
| 4 | Weekly discovery and operator review | Manual scan succeeds; overlap/catch-up tested; known series enqueue; unknown series held; scheduled workflow enabled after review |
| 5 | First complete acquisition batch | Priority running editions and half/10K gaps are published with reconciled coverage; full-field read contract supports the companion explorer |
| 6 | Reports and corrections | Web/native entry and private status; reviewed diff; audited correction/removal; updated ranks/counts; ordinary scheduler still skips the edition |
| 7 | Triathlon adapter and semantics | One full-distance and one 70.3 edition validated; categories/formats remain distinct; then expand catalog |
| 8 | Historical expansion and next sports | Agreed backfill window covered or gaps recorded; cycling/swimming proceed only with approved sport contracts |

Each slice should be a small PR or small stack based on current main. Reports must ship before unattended acquisition is considered operationally complete. Provider spikes can happen early, but do not make news-only partial fields look complete to accelerate launch.

Required verification at final implementation delivery: parser fixtures for changed source shapes, filtered full pages, multiple/overlapping result sets, repeated pages/caps, hidden/preliminary results, reused external IDs, multi-edition years, youth/unknown ages, clock/status/category handling; SQL tests for idempotence, freeze/suppression, atomic publication, concurrent claims, failure recovery, report authorization and audited corrections. Test weekly overlap, missed-run catch-up and published-edition zero-fetch behavior with a controlled clock. Include an operator walkthrough and a mid-pack result lookup beyond row 200. Run suites only under the repository's verification policy once the implementation is ready or explicitly requested.

Relative effort: the road correctness/catalog/worker work is a substantial pipeline project; each new provider needs its own bounded spike, and reports require work across two auth/data boundaries. A credible calendar estimate follows the source spikes and hosted audit. Avoid promising a fixed count of historical editions before access and completeness are measured.

## 12. Decisions to close before implementation

| Decision | Options | Recommendation for review |
| --- | --- | --- |
| Sport breadth | Running/triathlon first; four race sports together; all sports | Running/triathlon first, separate cycling/swimming contracts next |
| Historical depth | Latest editions first; five years per event; all available years for fewer events | Latest completed editions first, then backward acquisition |
| Inclusion | Fixed flagship list; participation cutoff; combined tiers | Curated flagships plus documented participation/regional demand |
| News-only results | Discovery only; publish cited selected performances too | Support selected performances with explicit coverage; never infer a complete field |
| Unknown finality | Hold indefinitely; post-race delay + review | Proposed seven-day minimum + operator review; organizer-final status preferred |
| Operations | Reviewer, source gate, budget, report response target | Assign an owner and measure representative imports before enabling the schedule |

Confirmed policy overrides the older roadmap's suggestion to refresh changed approved editions: routine work discovers **new** editions; published results stay frozen until a reviewed exception.

## Local review

Working directory: `/Users/jerryliu/Documents/fitness-battle/fitness-battle`.

Current web: `cd /Users/jerryliu/Documents/fitness-battle/fitness-battle && pnpm dev:web`, then open `http://localhost:3000/rankings`. Current native benchmarks: `cd /Users/jerryliu/Documents/fitness-battle/fitness-battle && pnpm dev:mobile`, press `i` with the existing iOS development client available, then open Compete → Beyond this week. These show existing behavior, not the proposed ingestion service. No imports, tests, typechecks, builds or live database changes were run for this documentation-only scope.
