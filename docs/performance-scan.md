# Mobile loading scan — October 26, 2026

Source review of mobile startup, tabs, nested screens and their server reads.
No release-device latency or frame-rate measurements were collected.

## Changes

- Home/Compete show the current account's valid disk snapshot while validating the
  server revision. Writes and competition reveals wait for hydration.
- Crew snapshots and Home crew activity share a bounded memory cache. Concurrent
  reads deduplicate; fresh data lasts 60 seconds, stale content remains visible
  during refresh, and successful writes invalidate subscribed consumers. Session
  credentials/API URL/query isolate reads; account changes clear cached responses.
- Focus/resume checks freshness. Home joins the existing standings refresh loop,
  with freshness checks and failure backoff. Failed initial loads can recover.
- All four tabs already mount eagerly on both navigator implementations. Home
  pre-renders Week, Compete pre-renders Benchmarks, and Progress pre-renders history
  and achievements after a short delay, with cancellation when the parent changes.
- Fonts and account loading start concurrently. The full 5.4-second launch animation
  remains required, per owner preference; auxiliary crew reads no longer block it.

## Remaining costs

1. `/api/compete` polling loads up to 2,000 activities including detailed polylines,
   plus all record attempts, before hydrating fields. A small field-only refresh
   endpoint would reduce payload/parse costs; preserve seating and revision rules.
2. Crew reads have membership → totals → roster → portraits stages. Independent
   work could overlap after authorization; measure query durations first.
3. Progress mounts both views and hides one with `display: none`; history lists
   render all rows in ScrollViews. Profile large accounts before changing eager
   mounting, memoizing selectors or virtualizing lists.
4. Sessions, social actions and replay reads retain their existing loading behavior.
   Extend caching only with resource-specific invalidation. Web uses separate stores
   and needs a separate implementation pass.

Validate on release iOS/Android builds: cached/offline launch, first/repeat tab and
nested navigation, 2,000-activity accounts, sync/manual writes, crew join/leave,
account switching and Eastern midnight/weekly rollover. Check request counts,
visible stale-data updates, memory and time to interactive.
