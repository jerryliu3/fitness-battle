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
- Import completeness, automatic discovery, identity/careers and checkpoint replay: pending subsequent focused PRs.

Local checkout: `/private/tmp/overtaek-rankings`.
Web: `pnpm install`, then `pnpm dev:web`; visit `/rankings/marathon`.
Native: `pnpm dev:mobile`, press `i` for an installed development client.
