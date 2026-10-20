# Compete boards — coded prototype review

October 20, 2026

Open `/design/boards` through the existing design access gate. The design index links to it. Component contracts, shareable URLs and the production adoption boundary are in [the study README](../../../apps/web/src/app/design/_studies/board-lab/README.md).

## Current review: Round 3

The accepted multi-field direction, selected defaults and two additional red running-track prototypes are in [the Round 3 review](round-3/README.md). The comparisons below preserve the earlier exploration, including the now-retired Contour Atlas.

## Round 2: vertical field exploration

This round locks the 2D board to vertical kilometers and separates three independent decisions: the ground, the progress trace and the camera lens. All athletes, sessions and previews remain local fictional data. Production Compete, backend scoring and native surfaces are unchanged. The first reviewed baseline is preserved in commit `7e0f710` and in the historical captures below.

### Eight backgrounds

| Direction | Capture | Spatial idea |
| --- | --- | --- |
| Personal track | [View](round-2/bg-athletics.png) | Separate mineral-blue running lanes and painted sidelines |
| Road ribbons | [View](round-2/bg-road.png) | An individual charcoal road for each athlete, with green shoulders |
| Parkland Passage | [View](round-2/bg-parkland.png) | Shared promenade with trees, benches and garden landmarks |
| Pool Deck | [View](round-2/bg-pool.png) | Aqua light, ropes and sparse pool-floor marks |
| Boardwalk | [View](round-2/bg-boardwalk.png) | Long timber grain and longitudinal plank seams |
| Meadow Trail | [View](round-2/bg-trail.png) | A shared winding trail; racers follow the same curve |
| Contour Atlas | [View](round-2/bg-contour.png) | Open topographic ground without pavement |
| Night Meet | [View](round-2/bg-night.png) | Dark athletics lanes, light pools and edge beacons |

Ground objects move with the camera. No background draws horizontal distance rules below one kilometer. Pool marks illustrate an unfolded surface, not literal pool lengths; Trail/Contour scenery does not imply recorded GPS locations.

### Five progress traces

| Direction | Capture | Difference |
| --- | --- | --- |
| Edge lights | [View](round-2/progress-rails.png) | Twin narrow borders with an open center |
| Session thread | [View](round-2/progress-thread.png) | An offset line with sourced session knots |
| Kilometer stamps | [View](round-2/progress-footsteps.png) | Discrete paired steps at whole kilometers |
| Banked trail | [View](round-2/progress-deposit.png) | A slender taper beginning beyond the full echo corridor |
| Session tokens | [View](round-2/progress-receipts.png) | Detached contribution chips, without a connecting bar |

All five preserve a clear capsule and afterimage corridor. None fills the lane or cuts a transverse cap through the racer. Transparent source-session hit regions keep inspection available independently of the visible trace.

### Camera and product context

- [Map lens overview](round-2/map-overview.png): ground, lane spacing and racers scale together in both axes.
- [Atlas lens overview](round-2/atlas-overview.png): the same world zoom with a readable minimum capsule size.
- Distance only remains a labeled comparison for the previous vertical-only behavior.
- [Full desktop](round-2/desktop.png) and [phone](round-2/phone.png) retain the bottom 2D overview, selection, gain preview and persistent expanded field.
- Horizon remains available with the existing scenic Three.js course and overhead fit. Context loss uses the selected 2D environment as fallback.

### Round 2 verification

- `pnpm typecheck` passes across the monorepo.
- `pnpm test`: 506 tests pass; five existing optional database tests remain skipped. The study has ten geometry/fixture/URL tests, including integer kilometer marks, map scaling, bounded scenery and overview clipping.
- `pnpm build:web` passes with the protected `/design/boards` route and lazy Three.js boundary.
- [Recorded browser assertions](round-2/browser-verification.json) cover 120 background/trace/viewport combinations at 1440, 390 and 320 px: independent choices, stable SVG scene, whole-kilometer marks, wake masks and no page-level horizontal overflow.
- Interaction checks cover isotropic Map zoom, Atlas marker legibility, the distance-only baseline, Fit field, world-fixed landmarks moving on pan, unchanged totals, bounded bottom overview, session inspection, persistent expansion/focus return, reduced-motion gain, shareable URLs and Horizon context-loss fallback. No browser runtime errors were reported.
- No dependencies, lockfile changes, database writes or tracker connections are added. Browser verification does not establish native gesture parity, mobile GPU performance or motivation outcomes from user testing.

## Round 1 history

The original Tapestry/Ribbon orientation, unit and effort comparisons are historical captures, not the current Round 2 control set.

## Review captures

### Tapestry — full-week context

![Session Tapestry showing the fixed origin and proportional counted-session strips](tapestry-overview.png)

### Tapestry — phone

![Session Tapestry on a phone with a pinned distance scale](tapestry-phone.png)

### Ribbon — horizontal comparison

![Distance Ribbon with glass capsules, true gaps and offscreen totals](ribbon.png)

### Horizon — 3D distance course

![Horizon Pursuit with trees, benches, fixed distance signs and capsule racers](horizon.png)

## Verification

- `pnpm typecheck` passes across the monorepo; the production build also validates application types.
- `pnpm test`: 501 tests pass across shared, rankings, pursuit, mobile and web; five existing database-dependent web tests remain skipped. The new study adds five presentation-geometry/fixture tests.
- `pnpm build:web` passes on Next 15.5.27, including `/design/boards`. Three.js remains lazy-loaded for the 3D selection.
- Browser checks use local supported demo authentication and Chromium software WebGL, not production accounts. [Recorded browser assertions](browser-verification.json) cover fixed marks moving during pan, unchanged totals on pan, session inspection, finite gain, persistent SVG and WebGL expansion, Escape/focus return, units, dynamic reduced-motion preference and WebGL fallback.
- Both 2D materials and both orientations were checked at 320, 390, 768 and 1440 px with no page-level horizontal overflow. The vertical scale stays pinned while browsing lanes.
- A separate resize/expansion check retains a phone lane scroll position of 40 px through expansion, a 1440 px resize, return to 390 px and collapse (40 px afterward).
- Horizon Fit field switches to overhead and displays all five sample athletes. Context loss falls back to a 2D field with the same values and viewport.
- Narrow-screen field controls retain at least 44 × 44 px targets at 320 px. Dragging on a woven session pans the expanded field without accidentally opening the receipt.
- No browser runtime errors were reported in the interaction pass. No dependency or lockfile changes were needed.

These checks establish prototype behavior in the browser. They do not establish native parity, mobile GPU performance, actual tracker connectivity or motivation outcomes from user testing. A production adapter still needs authorized canonical session contributions; missing peer history must remain a continuous unsegmented band.
