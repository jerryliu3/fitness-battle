# Field navigation investigation and repair

October 26, 2026. Rebased onto origin/main, retaining its native fullscreen HUD,
start trails, marker scale, and UI-thread native / local DOM wake animations.
No new packages, native dependencies, scoring changes, or backend writes.

## Findings and changes

The production 2D view is `LaneTrack` on native and `ArenaLanes` on web. The
production 3D view is `PortraitField`, a projected SVG distance plane. Live and
competition replay share these renderers. The separate Three.js `arena-scene`
WebView is not the renderer responsible for these reports.

- Native 2D split horizontal scrolling and vertical/pinch handling between a
  ScrollView and a JS responder. Fullscreen/Explore now owns both axes, including
  diagonal movement; inline page scrolling remains available. Two-finger input
  captures in either mode and retains the lateral and distance pinch anchors.
- Native 3D now handles pinch. Both native fields rebase when fingers join/leave
  and publish at most once per animation frame. The one remaining finger can
  continue dragging after a pinch.
- Web fields accept secondary pointers, handle field pinch and trackpad input,
  and coalesce changes. Perspective input uses the SVG screen transform so
  letterboxing and display scaling do not distort camera movement. Panning over
  scenery above the horizon no longer hits an inverse-projection dead zone.
- Live interval, bottom-menu and replay selections travel from the displayed
  camera position. Duration scales with distance (320–1250 ms); the easing
  starts and ends at zero velocity and acceleration. Retargeting continues from
  the current frame, gestures interrupt flights, and selecting the same athlete
  after exploring recenters it. Reduced Motion uses immediate changes.
- Straight-field racers and lane scenery are culled to the visible lane band
  with overscan. Oval fields retain their complete circuit. Main's scenery-only
  scene generation and efficient wake renderers are preserved.

Camera state still updates through JS/React. These repairs address input bugs
and bound rendering work, but physical-device latency must be measured before
claiming a smooth 60/120 FPS experience. No visual feature was removed and no
renderer migration or joystick was introduced.

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

## Verification

The previous checkpoint's screenshots and scene benchmarks are intentionally
excluded: main already changed its visual design and renderer performance, so
those results would not describe this PR accurately. Automated checks below
are rerun against the integrated branch. Physical iPhone testing remains open.

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
