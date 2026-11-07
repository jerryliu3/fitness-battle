# Compete event home and immersive fields — November 7

The owner selected an event home base with one explicit tap into an immersive
field. This replaces the map-as-tab composition in PR #533.

- Compete uses the ordinary header and platform tab navigator. The duplicate
  overlaid tab bar is removed.
- Event cards use existing field totals, places, nearest available rivals and
  period bounds. Their small lane previews use existing athlete positions;
  queued previews suppress ranks and identities. Native preserves block filtering.
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
