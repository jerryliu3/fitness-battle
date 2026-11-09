# Race explorer delivery

Approved direction: complete paginated fields; web first with native support. Research: all-time-rankings-research-2026-11-09.md.

## Current scope and independent acquisition workstream

Updated November 9 after source-policy review. This product stack owns data representation, public read contracts, web/native exploration, analytics and finally replay. Prioritize large marathon and half-marathon editions; coverage is limited to data with established reuse permission. Public accessibility, successful scraping and provider API access are not reuse approval.

Product PRs #561–570 remain the foundation. Acquisition PRs #571–572 are deferred drafts on a separate branch chain; new product work branches directly from #570 and does not depend on their workers, credentials or workflows. The historical layer 9–10 notes below describe that separate work, not product prerequisites. No separate repository has been created and no acquisition schedule has been enabled.

The acquisition workstream owns source permission review, adapters (HTML/public JSON/downloads/APIs), discovery, extraction, correction/removal reconciliation and coverage evidence. NYRR is excluded without express permission: its published terms restrict commercial statistics, archived race depictions and comprehensive databases. London and MikaTiming-hosted results are not cleared merely because public pages exist. Review edition-specific rights before further acquisition or publication. Policy evidence: [NYRR terms](https://prod.nyrr.org/terms-of-use), [London terms](https://www.londonmarathonevents.co.uk/terms-use), [MikaTiming service description](https://www.mikatiming.com/services/timing-result-service/result-service); the last describes capabilities, not a reuse licence.

The handoff supplies edition identifiers/date/distance, stable result IDs, finish status and clock basis, attribution/source URLs, publication eligibility and coverage evidence. Optional checkpoints contain distance along the edition course and cumulative elapsed times with an explicit clock basis; missing values stay missing. Optional course geometry is stored once per edition. Splits do not imply GPS observations or verified athlete identity.

### Remaining product sequence

1. Event-edition exploration: precise event selection, full-field paging/search and clear cohort context on web/native. First slice adds edition scope, reusing the coverage inventory for selection.
2. Richer edition analytics: field distributions and benchmarks with explicit denominators and completeness gates; keep searches from changing the underlying cohort.
3. Split reports: optional checkpoint table, segment pace and first/second-half comparisons, conditional on delivered timing data. Finish-only results remain useful.
4. Split comparisons: checkpoint gaps for selected runners with compatible clocks/checkpoints.
5. Historical trends: edition comparisons first; athlete careers only after reliable identity evidence, never name-only merging.
6. Geographic replay last: single runner, selected groups, then measured full-field rendering as described below.

### Split storage budget

Collect finish results plus available timing-mat splits when permitted. Store checkpoint definitions/course once per edition and cumulative elapsed values per result; derive segment pace and replay positions. Do not persist every runner's position at every playback second. Illustrative payload: 50,000 runners × 10 checkpoints × 4 bytes = 2 MB of elapsed values before IDs, row/index overhead and backups. This is arithmetic, not measured database usage. Measure one representative edition's actual storage, response size and fetch costs before selecting the split persistence layout or committing to a backfill budget.

## Layer 1: bounded full-field read contract

`rankings_page` returns 50 rows with matching count, complete cohort count and competition ranks. Distance/category/year define the cohort; name/bib search only selects observations within it. Ties share a rank. Source suppression and result eligibility apply to every row and count. Requests are snapshot-consistent individually; concurrent source revisions can change subsequent pages. Historical snapshots and revision-pinned pagination remain follow-up work.

Apply the additive migration to the **rankings** project before deploying consumers. No production database changes or test executions were performed. Shared query fixtures and SQL regression scenarios are committed for later verification.

`/api/rankings?distance=marathon&sex=female&year=2025&page=2&q=` is the public native/web read contract. It requires the existing rankings URL and anon key. No new privileged client credentials.

## Delivery tracking

- Full-field read contract: implemented.
- Responsive web explorer and native list: implemented in layer 2. Search, category/year scope, full-field pages and recovery states share the layer 1 API. Native benchmarks now opens a native results screen.
- Individual web/native result reports, edition/category distributions, source links and nearby-finisher navigation: implemented in layer 3. Percentile claims remain withheld until import completeness is verified. Favorites and two-result comparisons are implemented in layers 5–6 below.
- Importer integrity: layer 4 fixes RunSignup raw-count pagination, explicit result-set selection, repeated-page/ceiling failures and suppression preservation. Live coverage reconciliation, scheduled discovery, identity/careers and checkpoint replay remain pending subsequent focused PRs.

Local checkout: `/Users/jerryliu/Documents/fitness-battle/fitness-battle/.worktrees/rankings`.
Web: `pnpm install`, then `pnpm dev:web`; visit `/rankings/marathon`.
Native: `pnpm dev:mobile`, press `i` for an installed development client.

## Final approved phase: geographic race replay

Owner explicitly scoped this as the last roadmap phase. Use an edition-specific GPX/GeoJSON course and cumulative timing-mat splits; individual runner GPS tracks are not required. Map each checkpoint to course distance, interpolate distance between the surrounding observed timestamps, then sample the course polyline at that distance. This gives an estimated position, not a GPS observation or an exact overtake timestamp. Handle loops and course changes using distance along the route, never nearest-point guessing.

Deliver single-runner playback first, then selected groups/favorites, then an optional full-field overview. Use actual start/wave timestamps for wall-clock replay; chip-elapsed comparisons are a distinct mode when starts are unavailable. Missing or invalid splits, DNF and absent starts need explicit handling. No extrapolated movement after the last valid checkpoint. Keep interpolation shared and renderer-independent; use Mapbox layers/batched updates, bounded visible detail, and reduced-motion/paused/offscreen lifecycle handling on web and native. Acceptance requires validated course/checkpoint alignment, monotone times, honest missing data and measured device performance. This phase remains unimplemented.

## Marathon Replay service reference

Source: https://www.marathonreplay.com/privacy (effective October 26, 2026), retrieved November 9. The policy lists Vercel hosting/logs and cookieless Web Analytics; consent-based PostHog usage analytics; Google Fonts and optional Google Maps photorealistic 3D tiles; Esri/OpenStreetMap tiles and buildings; jsDelivr for a 3D library; Instagram for feedback. It describes browser-local preferences and published race timing data. This is the site's stated service inventory, not an independent network audit or evidence that it uses Mapbox. Our renderer can reuse the existing Mapbox integration; these additional vendors are not prerequisites.

CI follow-up: #561 passed its original check. #562/#564/#565 failed because FlatList empty/footer slots used null where this dependency version expects undefined. Fixed the slots in #562 and propagated through both descendants. No local suites or typechecks were run; new CI results remain pending.

## Layer 5: device-local favorites

Web and native save up to 100 result IDs locally. They do not claim identity, sync across devices, or affect competition. A bounded `rankings_saved` read fetches fresh public labels without computing distributions or ranks. Suppressed/removed results appear as unavailable and can be removed; cached personal labels are never used. Storage writes are optimistic, serialized and rolled back on failure; initial storage failures do not overwrite existing bookmarks. Apply the saved-results migration to the rankings project before deploying the saved-list API. No production migration, tests, typechecks or builds run.

## Layer 6: two-result comparisons

Select exactly two currently available saved results on web or native. Comparison URLs contain result IDs and can be opened without the sender's device-local saved list. Both performances retain their event, year, distance and clock; recorded-time gaps appear only for matching distances and clock types. Same result IDs are rejected. No course-adjusted times, cross-field rank deltas, identity merges, percentile claims or weekly scoring effects are introduced. Native can share the public comparison URL. Reports remain separately accessible for provenance. No new database migration beyond layer 5; no local verification suites run.

## Layer 7: coverage reconciliation and gated percentiles

Read-only hosted audit: [coverage audit](rankings-coverage-audit-2026-11-09.md). Additive service-owned coverage reviews bind each edition/distance/category to an expected eligible count, successful import, evidence and review time. Public coverage reads apply existing eligibility/source gates. Reports show a faster-than percentage only when the review matches all current published records and the report denominator; ties are not counted as slower. Corrections/reimports invalidate review evidence rather than silently preserving a complete label. Web and native expose the inventory. No reviews are pre-approved, no production writes performed, and no local suites run.

The semantic typography CI failures on the preceding web PRs were fixed in their originating branches and propagated; new CI outcomes have not been polled.

## Layer 8: calendar-date timeframe filters

Web and native offer all time, edition year, past 12 months and custom event-date ranges. Custom end dates include the entire chosen day; the database receives half-open date bounds. Rolling bounds are anchored to the server's UTC calendar date, from the anniversary date in the preceding year through today (clamping February 29 to February 28). Actual bounds return with the results and are displayed as inclusive dates. Unknown event dates are excluded only from date-bounded scopes; edition-year links remain backward compatible. Search ranks are computed within the selected timeframe before filtering by name/bib. The old RPC delegates to the canonical new query, preventing duplicate semantics. No local suites or production migrations run.

## Product layer 9: event-edition exploration

New product work branches from #570, independently of deferred acquisition drafts #571–572. Web and native select an exact edition from the existing public coverage inventory. Coverage cards and reports open that edition's field. Edition scope intersects distance, category and timeframe before ranking; name/bib search preserves the cohort rank and count, and every page remains reachable. Changing distance clears edition scope. Missing inventory has a retry state and does not block results.

Apply the additive `rankings_edition_scope` migration to the rankings project before deploying consumers. `rankings_page_scoped` is the canonical read; the prior date and legacy RPC signatures delegate without changing their all-edition behavior. Source suppression/eligibility gates remain in the canonical query. Shared regression cases and isolated SQL scenarios cover edition isolation, ties, paging beyond 200, search, date/category/distance/year intersections, suppression and backward compatibility. They were added but not executed. No production schema/data changes, scraping, test suites, typechecks or builds performed.

## Product layer 10: edition finish analytics

Stacks on #573, independently of acquisition. Selecting an edition reveals fastest/median/slowest recorded finishes and an inspectable, bounded finish-time histogram on web/native. The canonical scoped RPC calculates aggregates from the same materialized cohort as ranks, before athlete/bib search and pagination. Empty searches still retain the field analytics; empty cohorts and all-event scopes return no panel. Chip/official counts make mixed clock bases explicit. No completeness certification, athlete identity or inferred splits are introduced.

The additive `rankings_edition_analytics` migration replaces only the canonical scoped RPC body; earlier wrappers continue to delegate. Histogram boundaries align to whole seconds, include empty gaps, and contain at most 41 bins; no full-field rows are sent to the client. Review source counts and completeness through the existing coverage destination. Regression cases cover aggregate values, clocks, isolation, search/page invariance, empty/singleton fields and suppression. They were added, not executed. No test suites, typechecks, builds, source requests or production migrations/writes performed. Browser/simulator visual validation remains outstanding.

## Product layer 11: optional checkpoint reports

CI status checked November 9: #570, #573 and #574 pass their Typecheck & Test workflow. No PRs merged or production migrations applied by this phase.

The result-report RPC now accepts optional service-owned split data: edition/distance-specific, versioned checkpoint distances shared once per edition, and one compact integer elapsed-time array per performance. Null elements represent missing timing mats; array alignment, edition/distance, available clock, strict cumulative order and the finish-record revision are validated on write. Checkpoint sets cannot be updated by the service role; a correction needs a new definition set. Public tables remain inaccessible to clients, and report reads retain the result/source gate. A changed performance revision withholds old split data until reconciled.

Web/native reports add checkpoint elapsed/segment times, segment pace bars and first/second-half differences when the exact halfway checkpoint exists. The separately recorded finish is used on the selected split clock; it is not interpolated. Missing intermediate checkpoints break adjacent segment pace, and missing halfway timing withholds half comparisons. No inferred GPS, starts, overtakes or data acquisition is introduced. Finish-only results remain usable and show checkpoint unavailability.

Acquisition handoff: insert a `race_checkpoint_sets` version for an edition/distance (metres, including fractional metres for exact halves), then upsert `performance_split_times` with its set ID, performance ID, `chip|gun` clock, aligned elapsed milliseconds, timing source URL and the exact performance `updated_at`. The selected clock must have a recorded finish time. Result updates must advance `updated_at`; revalidate/rebind splits to that revision. No endpoint for clients to submit splits is added. Permissions and public display approval remain acquisition responsibilities.

Apply `rankings_split_reports` to the rankings project before deploying. This schema is additive and has not been applied. No split records were fetched/loaded and no representative storage measurement has been made: measure an actual permitted edition before production backfill. An integer array stores four bytes per checkpoint value before row/array/index/backup overhead; checkpoint definitions are not duplicated for every runner. Added shared pacing/missing-data tests and rollback-only SQL contract/access/revision scenarios; tests, typechecks and builds were not run locally. Browser/simulator visual validation remains outstanding.

## Product layer 12: checkpoint comparisons

Web/native comparisons load the two source-gated reports and compare only shared checkpoint distances with compatible race distance and split clocks. Missing observations retain unavailable gaps. Finish clocks remain separately labelled; cross-course elapsed gaps do not imply positions or overtakes. Added unexecuted shared regressions; no migration or acquisition.
