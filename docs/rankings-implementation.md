# Race explorer delivery

Approved direction: complete paginated fields; web first with native support. Research: all-time-rankings-research-2026-11-09.md.

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

## Layer 9: event discovery inbox

RunSignup update-feed metadata is normalized into a local durable inbox with compound IDs, fixed scan windows, overlap deduplication, atomic checkpoints, exclusive locking and explicit access/failure reports. It does not fetch participant rows, infer event mappings or publish results. See [automation operations](rankings-automation.md) for configuration and recovery. Server-only worker credentials are unconfigured; no live discovery was run. No local verification suites executed.

## Layer 10: reviewed refresh preparation and opt-in discovery schedule

An explicitly mapped RunSignup result set can be prepared locally through the existing importer after public/final/count validation. Per-job metadata tracks provider versions and mapping hashes; failures do not advance preparation, missing artifacts are retried, and prepared outputs are separated by version. Database application is disabled explicitly. The new opt-in GitHub workflow schedules discovery and metadata-only planning; it never fetches participants or publishes results. The catalog is intentionally empty pending actual source mappings. See [operations](rankings-automation.md). No credentials/schedules configured, live jobs executed or local suites run.
