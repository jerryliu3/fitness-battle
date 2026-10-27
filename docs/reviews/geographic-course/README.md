# Geographic course navigation

A course is presentation geometry, separate from activity ingestion and scoring.
GPX imports do not record workouts or change competition totals. One continuous
GPX track segment or route is accepted; disconnected tracks are rejected rather
than connected with an invented straight line. Input is bounded to 4 MB and
20,000 points. Native/web share a cumulative metre index with logarithmic seeks.

Distance fields convert km/mi to metres and place athletes along the same route.
Points-based fields retain the existing visualization. Athletes retrace the route back and forth at each endpoint; cumulative
distance and standings continue unchanged. The chase camera faces the direction
of travel. After the first outbound trip the complete covered trail stays visible,
without duplicating geometry on subsequent trips. Course selection is local
to the current view, not a server-authoritative assignment to other participants.
Shared published course assignment is a separate product/data change.

The geographic view uses one platform-agnostic camera controller. Focus resumes
following; direct manipulation, zoom and overview suspend it. Two-dimensional
and chase views use the same map instance. The map engines execute gestures,
inertia and camera animations; React does not drive the camera every frame.
Reduced Motion makes programmatic transitions immediate.

Follow-up implementation layers:
1. Shared GPX/course index and camera contract.
2. Native Mapbox and web Mapbox GL adapters; GPX and Directions route chooser.
3. Physical-device and native-build validation, with limitations recorded below.

Mapbox Standard supplies scenery. We do not add or maintain a custom city asset
library, or add Skia in parallel. Mapbox credentials come through existing env
modules, and attribution remains visible. Map styles/tile availability depend on
Mapbox service access. Route generation uses explicit waypoint coordinates and
a walking/cycling profile; choosing only a city is not sufficient to invent a
safe or meaningful race course. No live GPS permission is required.

## Native/web integration

Compete exposes **Race on a real course** for km/mi fields. It opens a dedicated
screen with the current roster/totals and selectable athletes. Import GPX or
submit start/destination addresses, city names or `longitude,latitude` pairs.
Mapbox Geocoding resolves text on explicit submission; Directions requests a
walking or cycling route. Inspect the returned route: the first place-search
match is used, and a city name alone is not a detailed itinerary. Requests abort
on close/unmount or replacement. Course files stay local and are never sent to
activity ingestion. Course choice currently lasts for the mounted competition;
it is not persisted or published to peers.

The native renderer uses `@rnmapbox/maps` 10.3.12 with the Expo config plugin;
its default iOS pods resolve Mapbox Maps 11.33.0. Native pan, pinch, inertia and
camera interpolation execute in Mapbox, not a React RAF loop. Camera callbacks
only retain the observed pose; React updates once when a gesture suspends follow.
A gesture must never trigger a corrective `setCamera` command: the native engine
already cancels its animation. Native and web adapters share the same camera
intent/controller and geographic geometry. Next defers its Mapbox GL chunk until
the course screen opens. Expo's static browser preview links to the Next web app
rather than bundling the iOS/Android Mapbox module.

Use **2D map / 3D chase** without replacing the map instance, **Whole route** to
inspect the complete track, **Recenter** to resume following, and zoom controls
as an alternative to pinch. Selecting an athlete again recenters it. All route
geometry is independent of the camera; the completed selected route is a fixed
six-point opaque line, even when the start is outside the viewport. Basemap and
Mapbox attribution remain visible. Imagery/scenery are supplied by Mapbox
Standard; no custom scene asset pipeline or second Skia renderer was added.

This is the new geographic view's UI-thread camera path. The shipped SVG fields
remain available and retain their existing implementation; they were not
silently replaced or rewritten into Reanimated. Shared published event-course
assignment and game-style animated runner models are not part of these PRs.

## Run locally

Use public Mapbox tokens that permit your test environments:

- Native: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in `apps/mobile/.env.local`.
- Next: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `apps/web/.env.local`.

Do not put private/download tokens in these variables. API requests are made
only when the chooser is submitted; map usage and place/Directions requests use
Mapbox services and their configured account. Place-search results here are
transient, not saved as a persistent geocoding database.

```sh
pnpm install --frozen-lockfile
pnpm --filter @fitness-battle/web dev
# Rebuild native; an OTA bundle or Metro alone cannot add the Mapbox module.
EXPO_PUBLIC_API_URL=https://fitness-battle-one.vercel.app pnpm --filter @fitness-battle/mobile exec expo run:ios --device --configuration Release
```

For simulator development, use `expo run:ios` without `--device` and select the
intended simulator. Android requires the corresponding native rebuild. Existing
SDK 58 / RN 0.88 prerequisites and signing requirements still apply. Generated
iOS/Android projects remain generated artifacts; commit config/plugin/dependency
changes, not a copied native binary.

## Validation

Shared regressions cover GPX routes/tracks without timestamps, rejected
multi-segment tracks, duplicate/invalid geometry, metre indexing, date-line
interpolation, unit conversion, selected trail endpoints, follow interruption
and reduced motion. Adapter regressions verify stable map ownership, gesture
suspension of follow, resumed selection from the observed pose and athlete taps.
These mock the platform map drivers; they do not establish real-map frame rate.

Real-map QA uses local public Mapbox tokens configured in ignored environment
files. The owner supplied the token during implementation; it is not committed.
The iOS Release build with native Mapbox succeeded. Actual browser and simulator
walkthrough evidence is summarized below. For a physical-device check, exercise: GPX import; API route generation; near/far/repeated selection; interrupted
flight; two-finger pinch followed by one-finger dragging; live updates while
exploring; 2D/chase/overview; reduced motion; close/reopen; long/finished efforts.
Measure sustained physical-device performance separately from simulator input.

The course screen owns its selected athlete independently of the hidden SVG
field, so selecting peers does not run a second camera animation behind the
modal. The native static course source retains its object identity across
athlete changes; web sets that source only at map initialization. Per-update
work is limited to athlete positions and at most three completed-route prefixes. Peer trails share
one cyan prefix, with you and selected painted above it. These
invariants are covered by the adapter regressions.


### Actual runtime evidence

- Browser: real Mapbox Standard buildings/scenery loaded; city-name geocoding
  generated a New York → Brooklyn walking route. Explicit Manhattan coordinates
  generated a 7.90 mi route after ferry exclusion. Imported a GPX fixture through
  the file chooser. Athlete selection showed intermediate then final camera
  coordinates, 2D/chase controls worked, keyboard panning suspended follow, and
  SDK fitBounds framed the whole route. A phone viewport was checked and the
  temporary override reset. A browser screenshot is in `images/`.
- iOS: built native Mapbox 11.33.0 / React Native 0.88 in Release for arm64, then
  refreshed the final Hermes bundle in that native binary. Installed on iPhone
  17 Pro Max / iOS 26.5 without resetting account data. The native walkthrough
  requests the real Manhattan route and uses actual XCTest touch gestures.
- Initial runtime QA caught ferry routing and an overly wide hand-calculated
  overview. Directions now excludes ferries; both renderers use the SDK's own
  padded route bounds. A first test failed because it tried to switch to 2D
  after Whole route had already switched there; the corrected test respects
  that state transition.
- No physical-device FPS, heat or battery comparison has been measured. Native
  GPX file-picker interaction is not part of the simulator walkthrough; GPX
  parsing and the actual browser file-picker path are covered separately.

Reproduce the simulator walkthrough (requires the installed Release app and its
existing seeded Alice/Noah competition):

```sh
GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0_1/libexec /opt/homebrew/opt/ruby/bin/ruby docs/reviews/geographic-course/native/create-runner.rb /tmp/course-native-ui-review
xcodebuild test -project /tmp/course-native-ui-review/FieldGestures.xcodeproj -scheme FieldGestures -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' -derivedDataPath /tmp/course-native-ui-review/build -parallel-testing-enabled NO -collect-test-diagnostics never CODE_SIGNING_ALLOWED=NO
```

The test's map-frame discovery is specific to the documented portrait simulator
layout. The first case launches the app afresh, chooses a route, and the second
continues that state to test both views. It performs no activity or score writes.

The final native walkthrough passes both cases (80.0 seconds): a real route
request and repeated diagonal drags, both pinch directions, peer selection and
whole-route controls in 3D and 2D. Pinch screenshots visibly change the map
scale (for example, the 3D ruler changes between 600 ft and 1,000 ft).
19 focused shared/native/web regressions, workspace typechecks, UI contract,
web production build and the native Release build pass.

![Native city chase](images/native-city-loaded.png)

![Native whole route](images/2d-whole-route.png)
