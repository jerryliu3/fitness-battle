# Field navigation investigation and repair

October 26, 2026. Native first, with shared route geometry and matching web input.
Follow-up to owner testing of PR #389. Mobile wakes are removed at the owner's
request. No dependencies, backend writes, scoring changes or renderer migration.

## What was wrong

The production 2D view is native `LaneTrack` / web `ArenaLanes`. The 3D view is
`PortraitField`, a projected SVG distance plane. Live and competition replay
share these components; the separate Three.js WebView is not this screen.

The first repair was bundle/component-verified, without an actual simulator
input walkthrough. That was insufficient: the owner reproduced broken native
fullscreen dragging. This pass reproduced the failure using native XCTest:
the original fullscreen 2D diagonal drag left the field unchanged.

Native 2D still split ownership between a disabled ScrollView, an ancestor
responder and interactive SVG children. The replacement uses one camera viewport
with a fixed-size SVG viewBox. Ordinary React Native views own touch input and
native press targets handle athletes, nameplates and past-you selection. SVG is
now drawing only. Empty ground has an explicit native touch target, so it uses
the same responder path as portraits. Inline vertical page scrolling remains
available; fullscreen/Explore owns both axes. Selection still animates from the
current lateral position; direct touch cancels it.

Native UI testing also caught the intermittent perspective pinch failure: its
"Drag to move · Pinch to zoom" hint was outside the touch surface and intercepted
one finger. Decorative overlays now pass touches through on native and web.

## Solid route trails and static native athletes

The old trail required distance zero to be in the camera window, and was tied
to the visible head. It therefore disappeared precisely when following a user
far from the start. Routes now render independently of head visibility and are
clipped to the visible portion of distance zero through the athlete's actual
position. Winding 2D courses follow their geometry; an oval shows its completed
circuit. Perspective routes extend to the foreground when the start is offscreen
and remain visible if an athlete ahead is outside the measured window.

Routes use one opaque six-point stroke with round joins/caps, matching the
six-point stroke in this app's Mapbox route replay. No glow, fade, taper or dash
is added. The selected athlete’s route paints last so nearby routes cannot
cover it at wide zoom. Native wakes and their Reanimated lifecycle/masks are deleted. The web
2D field also disables its decorative wake. Native athlete heads keep the
existing artwork; close-zoom drawing is capped so an oversized capsule cannot
obscure the map. Positions, score values and the distance scale are unchanged.

## Native verification

Device Hub could read the screen but failed to dispatch reliable input
(`noWindowsAvailable`). Apple's XCTest UI automation provided a working path.
The running app was a release binary, so Metro edits did not update it. This
worktree's release Hermes bundle and assets were installed into a copy of that
compatible React Native 0.88 binary on iPhone 17 Pro Max / iOS 26.5. No new native
modules are needed. This is a simulator release-JS walkthrough, not a new signed
physical-device build or a physical-device FPS measurement.

The [native UI walkthrough](native/FieldGestures.swift) exercises diagonal and
horizontal movement, drags originating on portraits, actual two-finger pinch
in/out, live/bottom athlete selection, recentering and zooming until the start
line and selected athlete share a window. It reads the displayed camera range
and athlete hit-target positions rather than calling React handlers directly.

The native repeatability runs confirmed these camera ranges:

| Input | Before | After |
| --- | --- | --- |
| 2D diagonal drag | 4.72–5.47 mi | 4.79–5.53 mi |
| 2D pinch out | 4.83–5.58 mi | 4.64–5.77 mi |
| 2D pinch in | 4.64–5.77 mi | 4.96–5.46 mi |
| 3D diagonal drag | 4.85–5.35 mi | 4.99–5.49 mi |
| 3D pinch out after hint fix | 5.04–5.54 mi | 4.81–5.58 mi |
| 3D pinch in | 4.81–5.58 mi | 5.04–5.54 mi |

Both full native walkthroughs and the live-interval/header walkthrough pass. Repeated drag directions were checked.
Horizontal 3D dragging moved the athlete
from x=220 to x≈331. Horizontal 2D movement is tested at a zoom where the field
extends beyond the viewport; a completely fitted field correctly has no lateral
scroll range. The continuous finger-lift handoff within a single pinch still
needs human/device validation; XCTest covers pinch followed by separate drags.

Native screenshots: [2D close](native/ios-2d-close-trail.png),
[3D close](native/ios-3d-close-trail.png), [2D full route](native/ios-2d-whole-trail.png),
[3D full route](native/ios-3d-whole-trail.png).

The live-interval/header pass also verified that decorative header text passes
through dragging and that live-interval taps move the camera. In 2D the camera
was sampled at 4.50–5.25 mi during the flight before reaching 3.40–4.15 mi.

## Automated checks after the native repair

Per the owner's request, typechecks and unit tests were held until the native
input failures were repaired and checked locally. Focused checks cover camera
coalescing, the absence of competing native scroll owners, no native wakes,
solid offscreen-start routes and unchanged perspective coordinate mapping.
The 35 focused native/web/shared checks pass, as do workspace typechecks, the
UI contract check, a web production build and the release Hermes bundle.
Full-suite debug-fixture failures from the first PR pass are described in its
history; scoring and fixtures remain untouched here.

## Renderer and control alternatives

| Option | Fit and tradeoff | Recommendation |
| --- | --- | --- |
| Current SVG, repaired | Keeps the nine grounds, portrait hit targets and shared distance projection. Native camera updates still use JS/React and can stall under unrelated JS load. | Validate this repair in a release build on a physical device first. |
| Gesture Handler 3 + Reanimated SVG | Both are already installed. UI-thread camera state and animated SVG props can avoid per-frame React camera commits. Moving only input callbacks while still calling JS setters every frame would not solve that bottleneck. Requires adapting the actual ground/projection updates and SVG hit targets. | First next experiment if release-device profiling remains slow. |
| Skia canvas + Reanimated | A strong candidate for many animated paths, gradients and masks. Requires a native dependency/build, a scene adapter, image/font loading and deliberate accessibility/hit-testing support. Canvas would need a separate web integration. | Preferred renderer experiment for this abstract effort field if SVG remains the bottleneck. Compare with an identical scene and device before migrating. |
| Mapbox / MapLibre | Mature geographic cameras, gesture handling, fly-to and pitched map rendering. A blank custom style could represent an abstract field, but distances/lanes would need coordinate mapping, custom scenery and separate native/web adapters. Native integration adds a rebuilt binary. Mapbox GL JS is already used for actual GPS route replay elsewhere in this app. | Best fit for a future geographic-course feature. A mapping SDK alone does not repair the current SVG interactions. |
| Joystick / directional pad | A continuous joystick can provide an alternative to direct manipulation. It still needs a responsive renderer and consumes phone space. Current 3D already has directional buttons. | Consider an optional held-direction control after touch validation, rather than replacing touch or adding a mandatory navigation mode. No joystick or feature removal was introduced. |

These recommendations are engineering judgments from the current code and
primary documentation:

- [Gesture Handler 3 API and simultaneous gesture composition](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/).
- [Reanimated worklets and UI-thread execution](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/).
- [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/), including release-build profiling and Skia for complex scenes.
- [Skia gesture integration and transformed element tracking](https://github.com/Shopify/react-native-skia/blob/main/apps/docs/docs/animations/gestures.md).
- [Mapbox camera and gesture API](https://docs.mapbox.com/mapbox-gl-js/api/map/) and [native fly/ease camera transitions](https://docs.mapbox.com/ios/maps/guides/camera-and-animation/animations/).
- [MapLibre React Native installation requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/).

## Test on a physical iPhone before merging

This checkout is on `codex/smooth-field-navigation`:

```sh
cd /Users/jerryliu/.codex/worktrees/83a6/fitness-battle
pnpm install --frozen-lockfile
EXPO_PUBLIC_API_URL=https://fitness-battle-one.vercel.app pnpm --filter @fitness-battle/mobile exec expo run:ios --device --configuration Release
```

Use the project's existing private mobile environment for the Supabase account
configuration. The API URL must be reachable from the phone; use the deployed
URL above or your intended environment. Public values are embedded when built.
See [Expo’s local build guide](https://docs.expo.dev/guides/local-app-development/).
Connect and trust the iPhone, enable Developer Mode, and select the device when
prompted. Xcode and the project's signing team/provisioning are required. This
build contains native modules, so use the installed app rather than Expo Go.
Release mode bundles JS and does not need Metro after installation. For normal
iterative development, omit `--configuration Release` and keep Metro running.

In Compete, test both 2D and 3D inline and fullscreen:

1. Drag vertically, horizontally and diagonally over athletes and empty ground.
2. Pinch in/out, then lift either finger and keep dragging. Start a pinch during
   an existing pan; test both zoom limits.
3. Select distant athletes from Live intervals and the bottom menu; verify
   intermediate positions, smooth arrival and repeated-athlete recentering.
4. Interrupt a flight with a drag, retarget it mid-flight, then switch dimensions
   and expand/collapse without losing the viewport.
5. Repeat in competition replay and with iOS Reduce Motion enabled.

Report the device model/iOS version and which action still lags. If JS camera
commits remain over budget in Release, compare the Reanimated SVG and Skia
options above before committing to a renderer migration.
