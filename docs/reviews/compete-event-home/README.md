# Compete event home and immersive fields — November 7

The owner selected an event home base with one explicit tap into an immersive
field. This replaces the map-as-tab composition in PR #533.

- Compete uses the ordinary header and platform tab navigator. The duplicate
  overlaid tab bar is removed.
- Event cards use existing field totals, places, nearest available rivals and
  period bounds. Distance events use a static Mapbox image of their assigned course;
  queued previews suppress ranks and identities and wait for course assignment.
  Points events show an explicit points-event placeholder. Native preserves block filtering.
- Registration, Recovery and results stay on the home. Entering a sport event
  reveals a retained full-viewport field; Back returns to the home.
- The first selected field still prepares under the launch cover. The selected
  scene stays mounted on close; hidden presentation clocks remain paused.
- Current positions, map options and athlete interaction remain in the field.
  Standings occupy a partially visible bottom sheet. Its surface starts at the
  actual bottom edge and includes home-indicator padding. Drag or tap the handle;
  accessible height adjustment and web arrow keys remain. Visible Minimize/Lower
  buttons are removed. Sheet coverage never changes map geometry.

Simulator review: iPhone 18 Pro / iOS 27.0, using local demo data and the existing
native build connected to this worktree's Metro server. Verified event home,
explicit entry, expansion, and Back to the home with normal tab navigation.
Screenshots: `home.png`, `immersive.png`, `expanded.png`.

Regression tests cover registration from home, multiple event choices, queued
preview honesty, explicit event entry, retaining the prepared web scene on return,
and sheet dragging/keyboard changes without visible height buttons. Existing field
and camera suites remain in place. No release-device entry latency is claimed.

## November 7 polish

Standings keep their full scroll viewport laid out offscreen when minimized,
with native clipping disabled so rows are ready during the upward drag. The
course scrubber is inside the sheet above Standings, with the gear immediately
on its right. The gear exposes dimension, perspective, spacing, overview and
replay controls for native geographic courses. It follows the sheet at every
height; expanded standings still reach the bottom edge.

The immersive header uses the safe inset once, omits the sport bubble, and uses
a native UIKit glass Back button on iOS 26+, with a system fallback on older iOS.
Map credits retain visible space away from Back. Event previews use stable,
course-only Static Images URLs with native image caching and browser caching;
uncached images add Mapbox Static Images requests separately from interactive
map usage. No athlete data is included in preview URLs. Preview failures and
non-geographic events use explicit placeholders.

Validation: workspace typecheck, 24 native and 7 web targeted tests, and web
production build passed. A fresh native build with the glass control was
installed on iPhone 18 Pro / iOS 27.0 and reopened with this worktree's Metro
server. Per the owner's request, final visual review of the scrubber and gear
placement is left to them. Earlier screenshots above predate this polish.
