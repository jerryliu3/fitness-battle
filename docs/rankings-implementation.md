# Race explorer delivery

Approved direction: complete paginated fields; web first with native support. Research: all-time-rankings-research-2026-11-09.md.

## Layer 1: bounded full-field read contract

`rankings_page` returns 50 rows with matching count, complete cohort count and competition ranks. Distance/category/year define the cohort; name/bib search only selects observations within it. Ties share a rank. Source suppression and result eligibility apply to every row and count. Requests are snapshot-consistent individually; concurrent source revisions can change subsequent pages. Historical snapshots and revision-pinned pagination remain follow-up work.

Apply the additive migration to the **rankings** project before deploying consumers. No production database changes or test executions were performed. Shared query fixtures and SQL regression scenarios are committed for later verification.

`/api/rankings?distance=marathon&sex=female&year=2025&page=2&q=` is the public native/web read contract. It requires the existing rankings URL and anon key. No new privileged client credentials.

## Delivery tracking

- Full-field read contract: implemented.
- Responsive web explorer and native list: implemented in layer 2. Search, category/year scope, full-field pages and recovery states share the layer 1 API. Native benchmarks now opens a native results screen.
- Individual web/native result reports, edition/category distributions, source links and nearby-finisher navigation: implemented in layer 3. Percentile claims remain withheld until import completeness is verified. Favorites and comparisons remain next.
- Importer integrity: layer 4 fixes RunSignup raw-count pagination, explicit result-set selection, repeated-page/ceiling failures and suppression preservation. Live coverage reconciliation, scheduled discovery, identity/careers and checkpoint replay remain pending subsequent focused PRs.

Local checkout: `/private/tmp/overtaek-rankings`.
Web: `pnpm install`, then `pnpm dev:web`; visit `/rankings/marathon`.
Native: `pnpm dev:mobile`, press `i` for an installed development client.

## Final approved phase: geographic race replay

Owner explicitly scoped this as the last roadmap phase. Use an edition-specific GPX/GeoJSON course and cumulative timing-mat splits; individual runner GPS tracks are not required. Map each checkpoint to course distance, interpolate distance between the surrounding observed timestamps, then sample the course polyline at that distance. This gives an estimated position, not a GPS observation or an exact overtake timestamp. Handle loops and course changes using distance along the route, never nearest-point guessing.

Deliver single-runner playback first, then selected groups/favorites, then an optional full-field overview. Use actual start/wave timestamps for wall-clock replay; chip-elapsed comparisons are a distinct mode when starts are unavailable. Missing or invalid splits, DNF and absent starts need explicit handling. No extrapolated movement after the last valid checkpoint. Keep interpolation shared and renderer-independent; use Mapbox layers/batched updates, bounded visible detail, and reduced-motion/paused/offscreen lifecycle handling on web and native. Acceptance requires validated course/checkpoint alignment, monotone times, honest missing data and measured device performance. This phase remains unimplemented.

## Marathon Replay service reference

Source: https://www.marathonreplay.com/privacy (effective October 26, 2026), retrieved November 9. The policy lists Vercel hosting/logs and cookieless Web Analytics; consent-based PostHog usage analytics; Google Fonts and optional Google Maps photorealistic 3D tiles; Esri/OpenStreetMap tiles and buildings; jsDelivr for a 3D library; Instagram for feedback. It describes browser-local preferences and published race timing data. This is the site's stated service inventory, not an independent network audit or evidence that it uses Mapbox. Our renderer can reuse the existing Mapbox integration; these additional vendors are not prerequisites.

CI follow-up: #561 passed its original check. #562/#564/#565 failed because FlatList empty/footer slots used null where this dependency version expects undefined. Fixed the slots in #562 and propagated through both descendants. No local suites or typechecks were run; new CI results remain pending.
