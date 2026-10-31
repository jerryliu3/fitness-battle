# Map UI stack review — October 31, 2026

One source-level review pass covers PRs #481–#486. Fixes are collected in the
follow-up review PR. Typechecks, tests and builds were not executed, per request.
`git diff --check` reports no whitespace errors. Runtime/device verification
remains outstanding; authored regression coverage is not a passing test result.

## Findings addressed

- **P2 — Preserved web fullscreen map kept dismissed cards across visits.** An
  explicit card session boundary resets local dismissal and restores preview
  focus to the viewer, including after overview navigation.
- **P2 — Native Fixed-mode update could issue a corrective camera command during
  a gesture.** Shared camera interruption distinguishes gestures from explicit
  stops. Initial perspective is configured without a startup flight; toggling
  perspective no longer queues a redundant move before focus. Overview keeps
  its fitted camera instead of triggering a second dimension effect.
- **P2 — Map overview and zoom left the replay toggle stale.** Adapter controls
  publish follow state, and resuming following explicitly recenters the athlete.
- **P2 — Points-based week recaps selected an unsupported geographic map.** The
  shared replay viewer normalizes requested dimensions by sport. Historical GPS
  replay defaults to the geographic map; the live map still supplies its view.
- **P2 — Fixed SVG replay views could shift when scrubbing backward.** Fixed
  centers bypass automatic earned-field clamping while gesture bounds remain.
- **P2 — Embedded replay used the raw ledger length as its cursor.** Recaps now
  start at the normalized event count. Empty embedded replay cannot start play.
- **P2 — Replay lacked a selection row to restore hidden cards.** The shared
  compact-roster policy renders top three plus the viewer in live positions and
  every replay. Selectable replay rows replace the unbounded recap-only roster.
- **P2 — Native decorative geographic moments omitted blocked-athlete IDs.**
  They now pass privacy filtering through the shared geographic renderer.
- **P2 — Sync bars omitted earlier sessions in the same incoming batch.** The
  comparison combines receipt and stored activity history, deduplicated by ID.
  Elevation labels also honor imperial units.
- **Cleanup.** Removed unused replay flights, old floating-follow styles and
  unused recap imports. Native map controls are available to all interactive
  callers by default; live thumbnails and decorative moments suppress them.
  Removed oversized map minimum heights that could overflow embedded views.

## Reuse inventory

| Surface | Implementation |
| --- | --- |
| Live Compete preview and fullscreen | `GeographicCourse` → platform `CourseMap` |
| Live competition replay | platform `ReplayViewer` → same `GeographicCourse` |
| Week recap / round results | embedded instance of the same `ReplayViewer` |
| Progress historical week replay | `CompetitionReplayButton` → same `ReplayViewer` |
| Overtake / field movement animation | same `GeographicCourse`, decorative input policy |
| Recorded activity route replay / native route WebView | route renderer with the shared web attribution installer |

Native and web retain SDK-specific adapters. Both use shared geometry,
`createCourseCamera`, athlete-card detail, compact positions policy, supported
replay dimensions and speed cycle. Recorded GPS activity playback has different
geometry and telemetry from competition fields and retains its route renderer;
attribution configuration is reused. Static route images retain the provider's
built-in attribution.

## Regression coverage authored, not executed

`course-ui-regression.test.ts` covers points recap fallback, preserved requested
views, full slow-speed cycle, top-three-plus-viewer selection, flat camera
initialization, gesture versus Fixed interruption, single-command perspective
focus, and sync-batch comparisons/imperial labels. Existing SDK/component test
fixtures were updated for attribution controls, native follow-button text,
explicit 2D fixtures and thumbnail controls.
