# Five-style product typography audit — October 24, 2026

The prior rollout introduced shared components but retained fourteen roles,
legacy CSS, unscaled SVG coordinates, and explicit metric exceptions. It did
not establish a fixed visual library throughout the rendered application.

## Observed gaps

Computed styles on Progress included 16/600 tabs, 9.5/600 uppercase Open/GPS
controls with tracking, 12/700 uppercase lifetime headings, 28/400 values,
10/400 uppercase units, a 38/700 score with negative tracking, a 15/500 score
label, and separate chart weights. Compete used unrelated card compositions
for Coming soon and Beyond this week. Checking JSX alone missed CSS, SVG
attributes, route overlays, UI internals and unstyled native Text nodes.

## Implemented contract

Exactly five recipes in `packages/shared/src/shell.ts`, all DM Sans:

| Recipe | Size / line height | Weight |
| --- | --- | --- |
| display | 30 / 36 | 700 |
| heading | 22 / 28 | 700 |
| body | 16 / 24 | 400 |
| label | 14 / 20 | 700 |
| caption | 12 / 18 | 400 |

All production features, routes and controls consume these recipes. CSS maps to
the same shared variables. Numeric values, avatar initials, badges, subtitles,
navigation and map labels do not introduce additional styles. No numeric metric
exceptions remain. Only artwork and historical studies keep separate typography.
AppText prevents caller font overrides; semantic headings remain independent
from the visual emphasis used for numbers.

Chart adapters keep captions at their recipe size while the plot scales.
Native also respects system text scaling. Narrow effort charts omit the middle
date instead of shrinking text. Compete uses the same FeatureCard on both
platforms for upcoming and navigable features. The newly merged full-screen
competition and sync flows from #319 are included; their event behavior is
preserved.

`pnpm lint:ui` now checks 184 production source files and 13 stylesheets,
including native UI internals, web map controls, SVG attributes, tracking/case,
raw HTML headings and arbitrary typography classes. Native tab labels and number
wheel items also consume the library; OS date/time dialog internals retain
platform-managed typography. CI runs the contract.

## Verification

- Browser computed-style audits: Home, Compete, both Progress views, Crew and
  Athlete use only the five approved recipes (individual screens use subsets).
- Progress inspected at 320, 390 and 430 pixels and desktop; Compete inspected
  at desktop and 390 pixels. Progress at 320 has no page horizontal overflow.
- Final production build checked on Compete and both Progress views at 390.
  Progress effort resolves to exactly five computed font recipes. Chart labels
  counter-scale by 1.25 in its 272-pixel plot, retaining a visual 12-pixel caption.
- Full monorepo typecheck passes. Web tests: 297 passed, 5 existing skips.
  Native tests: 133 passed. Adapter tests cover preventing local font overrides,
  semantic number/heading separation, shared card structure, chart resizing,
  responsive tick density and native text scaling.
- Web production build and Expo iOS bundle export pass.

Native component and bundle checks are complete; no simulator or physical-device
visual review was performed. Large native text and every live/error/account
state still need device QA; the source contract is enforced across those paths.
