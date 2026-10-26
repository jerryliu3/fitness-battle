# Follow-up review and performance roadmap

Review date: 2026-10-26. Scope: branch changes against origin/main, including native/web gesture ownership, camera flights, replay adapters, clipped solid routes and native wake removal. This is a source review with focused regressions; it does not establish physical-device frame rate or a measured benefit from removing wakes.

## Correctness findings addressed

**P2: 3D navigation controls could compete with an active selection flight.** Native lane arrows stopped their local lateral animation but left the parent's distance flight alive. Native distance/zoom controls stopped the parent's flight through their callbacks but left the lateral flight alive. Web lane arrows stopped neither; the next animation frame could overwrite the requested lane. Web distance/zoom controls likewise left the lateral flight running. Keyboard arrows used the same incomplete paths.

Both portrait adapters now interrupt local lateral travel and notify the parent to cancel distance travel before applying lane, distance or zoom commands. Selecting an athlete still starts a deliberate smooth flight. Regression cases start a pending athlete flight and exercise lane, distance and zoom controls, asserting no flight frame survives and the parent cancellation callback runs. The web keyboard distance path uses the same interrupted pan helper.

**Cleanup:** The shared portrait scene already filters empty routes. Both adapters now render each route directly instead of wrapping it in a group, a redundant fragment and another nonempty check. Removed empty prop lines left by the wake deletion. No packages, visual modes or domain rules changed.

No other merge-blocking correctness issue was confirmed in the reviewed paths. Remaining risks are runtime/performance coverage, not a claim that the implementation is bug-free. The existing tests cover pinch finger-count transitions, pointer capture/tap selection, interrupted/retargeted flights and offscreen routes; prior native XCTest evidence is in `native/`. The new control interruption is verified with component regressions, not another simulator walkthrough.

Validation for this follow-up: 6 native and 7 web focused tests pass; workspace typecheck, UI contract and web production build pass. Previous unrelated full-suite debug-fixture failures are unchanged and were not rerun for this review. The owner's uncommitted mobile package script edits are excluded from the review commit.

## What the current implementation actually renders

The Compete 2D field is SVG with shared course geometry. Its 3D field is also SVG: a perspective projection of the effort plane, not a general 3D engine. There is a separate DOM Three.js implementation in `packages/pursuit`; replacing that renderer would not automatically replace these native portrait components. Web already depends on Mapbox GL JS for geographic features, but mobile does not have a native Mapbox renderer installed.

The current repair addresses touch ownership and removes competing scroll behavior. It coalesces camera updates once per animation frame, culls lateral 2D lanes and keeps scenery independent of athlete-only changes. It still uses JS PanResponder, requestAnimationFrame and React camera state on native. Ground geometry depends on the camera, so it is regenerated while panning/zooming. Reliable input does not guarantee smooth drawing under JS contention.

## Recommended experiments, in order

### 1. Establish a physical-device performance baseline

Use Release builds on an ordinary older supported iPhone as well as a newer device, then representative Android hardware. Native automation proves that input moves the camera; simulator timings do not prove the experience on those devices. Capture JS work, native drawing/compositing, long frames, memory and sustained heat with the platform profilers. Use separate diagnostic/profiling builds where a tool needs instrumentation.

Exercise a fixed script: repeated diagonal drags, pinch then one-finger continuation, rapid distant selection/retargeting, interruption by controls, inline page scrolling, dimension switching and replay under normal live updates. Use normal and maximum supported rosters, near-zero and large totals, and the heaviest ground styles. Keep input, data and device identical between candidates.

Suggested acceptance targets, not current measurements: normally fit a 60 Hz frame within 16.7 ms, inspect p95/p99 frame times and perceptible input latency, and report any frames over 50 ms. Test 120 Hz separately at its 8.3 ms budget if we decide it is a product target. Measure idle work and battery behavior as well as peak FPS.

Official guidance: [React Native performance](https://reactnative.dev/docs/performance/) distinguishes JS/UI frame rates and calls for Release testing; [React Profiler](https://react.dev/reference/react/Profiler) adds instrumentation overhead.

### 2. Prototype an actual UI-thread camera with installed tools

Gesture Handler 3.3 and Reanimated 4.7 are already dependencies. Prototype one ground and both projections before a broad migration. Keep center, span and lateral focus in shared values; run pan/pinch recognition and flight interpolation on the UI thread. Update SVG animated props or a cached world-layer transform without committing the entire React scene each frame. Publish settled camera state and selected IDs back to React at deliberate boundaries.

Moving gesture callbacks to a worklet while immediately calling JS setters every frame would leave the main bottleneck. Perspective geometry, constant-width strokes, fixed-size labels and native hit targets must follow the displayed camera consistently. Cache bounded world segments and recycle scenery only when crossing segment boundaries; simple transforms are easier for straight 2D grounds than nonlinear perspective projection. Prototype that complexity rather than assuming it disappears.

Compare ordinary interaction and intentional JS load against the current renderer. Proceed if the measured resilience/frame-time improvement justifies the extra coordination. [Gesture Handler integration](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/reanimated-interactions/) supports UI-thread callbacks; [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) also describes limits and renderer considerations.

### 3. Simplify camera ownership regardless of whether FPS improves

Currently longitudinal motion lives in the parent while lateral motion lives in each scene; the main web field has its own tween. This split is why interruption needs coordination. Define one camera intent/state model covering pan, pinch, focus, follow and cancel, with center/span/lateral state and one cancellation contract. Keep React/DOM/native scheduling adapters outside the platform-agnostic shared package. The two almost-identical flight hooks do not justify a new package by themselves.

Selection, replay and dimension switching should obey the same semantics. Unify the contract incrementally with regressions rather than forcing native and DOM event APIs into one hook. Use a monotonic animation clock when revisiting schedulers. This is worthwhile maintenance work even if current device performance is good.

### 4. Trial Skia only if drawing or React/SVG commits remain expensive

A Skia adapter is a good fit for this custom abstract scene: batched paths, gradients, scenery and markers, driven by the same world/camera model. Preserve the shared distance semantics and compare identical scenes. It adds a native dependency/build and deliberate font/image loading, accessibility and hit-testing work. Do not promise a free speedup: projection math and inefficient scene updates still cost time.

Skia can also render on web through CanvasKit/WASM, so shared rendering is possible, but web loading/bundle costs and Next client integration must be evaluated. A first native experiment can retain the current DOM SVG web adapter. [Skia animations](https://wcandillon.github.io/react-native-skia/v2/docs/animations/animations/) integrate Reanimated; [web support](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/web/) requires CanvasKit loading.

### 5. Explore Mapbox/MapLibre for the product direction they support

Both are serious candidates for a geographic-course experience: real routes, basemaps/terrain, camera pitch, pinch/pan and fly-to. Mapbox's native React Native wrapper exposes camera controls and its MapView is backed by the native engine. A mapping SDK could also render a blank, synthetic course, but our effort distance and lane index would need a reversible coordinate mapping, bounds, unit-aware ruler, custom scenery and consistent marker/line scaling. Its geographic camera and projection constrain the current nine ground styles and portrait art.

Native and web still require separate integrations; an existing web Mapbox dependency does not install the mobile SDK. Evaluate the actual supported Expo/RN versions, rebuild/signing, assets/offline behavior and size. Mapbox has service pricing; MapLibre is an alternative with its own native integration and production style/tile-source choices. A blank synthetic style may not need map tiles at all. MapLibre's current v11 setup supports the new architecture and specifies RN >=0.80; that is a documented baseline, not proof of compatibility with this exact app.

My recommendation: use a separate prototype if we want real courses or want to compare a deliberately redesigned map-like field. Do not migrate the current abstract field solely for pinch gestures. Sources: [RNMapbox MapView](https://rnmapbox.github.io/docs/components/MapView), [Camera](https://rnmapbox.github.io/docs/components/Camera), [Mapbox hybrid-framework billing](https://docs.mapbox.com/accounts/guides/pricing/), [MapLibre setup](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/).

### 6. Improve navigation feel after correctness and frame time

Evaluate gentle pan inertia with bounded deceleration, press-and-hold directional controls, a clear recenter action and framing the selected route from start to athlete. A joystick is an optional accessibility/precision alternative; it uses screen space and cannot fix a slow renderer. Keep pinch and direct manipulation as the primary controls. All inputs should cancel/retarget the same camera controller; preserve reduced-motion behavior.

For large fields, consider fewer labels at wide zoom and cached/batched scenery. Do not hide completed routes or change selectable athletes without discussion. Retaining only selected/nearby detailed portraits could reduce visual cost while keeping line geometry intact, but it is a product tradeoff to agree first. Wakes can return later as a separately measured effect; their removal has no isolated measured performance delta.

If true free-orbit 3D becomes a requirement, separately evaluate the existing Three.js path, instancing and rendering on demand before adding another engine. The current fixed perspective needs neither free orbit nor a 3D engine. [Three.js rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html) and [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh) apply to that separate renderer.
