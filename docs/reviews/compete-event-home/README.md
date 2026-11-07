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

## Live preview follow-up

Static course thumbnails are replaced by retained scene viewports. Each event
shows its current user position in the actual scene; entry enlarges that scene's
host rather than creating another Mapbox map. Native preview rectangles follow
the card positions and clip to the home scroll viewport. Back restores the card
viewport. GPS events use the native 3D course; points events retain their points
field. No Static Images API request is needed for these cards. More visible
courses can download more tiles and consume more device resources, even though
native map billing remains based on monthly active users.

Onboarding completion is monotonic when merging an older server snapshot for
the same account. Completion requests an immediate save, and a completed account
cannot display onboarding through a restored route (explicit previews remain
available). A development build does not enable app debug mode; no database reset
is part of this simulator build. The historical repeat-onboarding cause was not
reproduced conclusively. Typecheck, tests and screenshot review were not run for
this follow-up at the owner's request; GitHub CI owns code checks.

## Noninteractive 3D snapshots

The owner selected still 3D previews after the floating live-map host caused
scroll lag and overlap. Cards now contain ordinary images. A temporary map
renders the user's current position inside the card, captures through the SDK,
and unmounts once captured (or after a bounded timeout). Preview generation does
not hold the application startup cover. Snapshots are cached in memory by
account, sport, course, units and user total, with a bounded cache. Revisiting
unchanged cards reuses the image. No global card-coordinate tracking remains.

The full immersive map is a separate retained scene. Preview generation still
uses SDK resources and scenery downloads; it is not zero-cost rendering. Web
snapshot rendering creates a map initialization per uncached capture. Both
platforms stop rendering the preview map after capture. The native SDK capture
and browser canvas capture replace Static Images API requests. Points and queued
events retain explicit placeholders.

This follow-up intentionally skips local typecheck, tests and screenshot review
at the owner's request. The native app is rebuilt and installed for owner review.

## Course controls and standings polish

Required Mapbox logo and attribution move to the lower-right map edge above the
sheet; native sheet coverage updates their position as the sheet moves. Snapshot
credits also remain at the lower right. Credits remain visible as required by
Mapbox. The gear uses an unframed icon with its existing accessible touch target.

The geographic scrubber is labeled Start–Leader, uses the leader's exact earned
distance as its endpoint, and clamps seek commands to that distance. Scrubbing
in perspective mode follows the path heading and pitch; flat mode stays flat.
The colored course geometry continues to include earned trails only, without an
unearned course outline or finish marker. The map's ordinary streets remain
geographic scenery, not a disclosure of the unearned race course.

Current Positions is renamed Current Leaders. Standings photo taps open the
athlete profile; the rest of the row focuses that racer in the retained map.
The native existing profile sheet is reused; the web profile sheet shows the
existing roster identity, event total and effort score.

Native simulator build installed. Tests/typecheck and visual review are left to
GitHub CI and the owner as requested. Camera expectations and existing panel
labels in regression tests are updated but not run locally.

## Sheet scrolling, static attribution and route travel

Static snapshots use a compact attribution caption next to the image, per
Mapbox's static-map guidance. They no longer bake the blue information button
into the image. Live map ornaments move to the top-right safe-area edge. The
settings gear is 28 points with extra invisible touch slop. The Standings heading
is removed.

The retained sheet scroll viewport remains full height to keep rows ready during
drags. Its content now includes padding for the portion below the screen, so the
last row can reach the visible bottom at partial expansion. This fixes the
previous capped scrolling without unmounting rows.

Racer switches interpolate earned course distance forward or backward rather
than drawing a camera chord between coordinates. Frames use the route position
and travel heading, preserve zoom, and are interrupted by selection changes,
scrubbing, gestures, backgrounding and teardown. Reduced motion skips travel.
Snapshots and normal hidden scenes do not retain a route animation clock.
Shared camera tests cover curved travel, interrupted travel and reduced motion;
these were written for CI and not run locally, per the owner's instructions.
Native build installed; visual review remains with the owner.

## Square snapshots and compact credits

Cards now use square captures at their existing width. The snapshot cache key
changes so old wide captures are regenerated. Credits are 10-point text with a
one-character feedback link and full accessible labeling. Copyright and feedback
links remain available; the snapshot stays noninteractive.

Compete shows the selected event's date range beneath its title, using Eastern
time and the exclusive period end converted to its last calendar day. Repeated
days-left labels are removed from event cards.

Live native maps retain the unmodified SDK wordmark. A custom 14-point info glyph
aligns with it, with a larger invisible hit target. Its sheet includes source
credits, feedback and a durable anonymous-usage opt-out. The app declares that
privacy setting in Info.plist; prior SDK preferences are not overwritten when no
custom preference exists. Native SDK ornament APIs available through this
integration expose placement, not size. Web compact controls align horizontally.

A fresh simulator build is installed. Typecheck, tests and visual review were
not run for this follow-up, per the owner's instructions.
