# Full-screen sync and competition moments

October 24, 2026. Supersedes the inline return presentation and today-only sync receipt.

## Implemented contract

- The root account provider owns one full-screen surface on web and native. Review transitions to any rank-change scenes within the same modal. The underlying tab is preserved.
- Sync batches newly changed, eligible non-future activities, including older imports. Each activity can be selected/deselected and inspected; GPS routes reuse #316's map / 2D overview / 3D terrain explorer. The primary confirmation is a deliberate right swipe with keyboard / accessibility equivalents. Short or cancelled swipes reset.
- Deselection uses existing disposition actions before merging/scoring. Saved activities remain available as excluded; prior earned high-water awards are not revoked. Close/skip applies all quietly. Receipts are memory-only; durable server ingestion is unchanged.
- A root queue compares account/sport/current competition track/period/unit snapshots. It detects own passes and peer-driven passed-by movement on any tab. First loads seed quietly, duplicate snapshots are consumed once, and account changes hide prior moments immediately.
- Each pass slows the scene, focuses the crossing, names the actual peer and increments the overtake/combo count. Final rank/volume come from the current field. Rival movement has its own neutral treatment. Reduced motion shows the final result directly. Skip animation preserves the explicit final confirmation.
- Inline fields now show settled totals and do not run a second replay behind the takeover. Modal scroll resets when changing stages or opening activity details.
- Ordinary refresh can stage newly arrived provider activity as well as detect rival movement. Its revision continues to be the loaded server revision; pending receipts block replacement by refresh.

## Debug

The header menu launches the production components and handlers from the current tab:

1. Sync · no overtakes.
2. Sync → photo finish + combo (two GPS activities with different routes).
3. Overtake someone.
4. Overtake several rivals.
5. Get overtaken.
6. Week closing (existing result flow).

Debug builds a predictable practice field even when the real/demo field is empty or unusually seeded. The full-screen surface explicitly says **Debug preview · local data only**. No account upload or durable event-baseline writes occur in debug. Reset restores the original in-memory account. This is not evidence of live tracker connectivity.

## Verification

Browser checks exercised the real header menu at desktop and 390×844: sync review, route details and nested explorer, confirmation into a four-pass photo-finish combo, final confirmation back to the parent tab, sync with no passes returning directly, and rival movement launched from Progress. Original state and viewport were restored afterward. [Phone combo result](combo-phone.png).

This local environment displayed the existing route-outline fallback; live Mapbox tiles and terrain flyover playback were not visually verified. Their existing #316 components/bridge are reused. Native responder, selection, presentation, queue, application, account isolation and late-refresh behavior are covered by component/provider tests; no new installed native binary or physical-device verification is claimed. No database migration or live tracker sync was performed.

Validation completed: `pnpm typecheck`, `pnpm test` (all workspace suites; five existing web skips), targeted final provider/receipt/movement regressions, `pnpm build:web`, and `expo export --platform ios` (Hermes bundle). The mixed-direction test additionally verifies rival movement then own passes preserve the intermediate/final place. Browser map fallback and native-device limitations above still apply.
