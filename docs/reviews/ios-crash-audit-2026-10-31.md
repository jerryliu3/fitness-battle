# iOS crash investigation — October 31, 2026

## Conclusion

Ten Overtaek device reports show repeated native UI-update stalls across TestFlight
builds 20–22 on iPhone 17 Pro Max, iOS 26.6.1. Eight are 10-second scene-update
watchdog terminations; two failed to terminate gracefully within five seconds.
The captured threads repeatedly show React Native mounting, layout, clipping and
JavaScript timer-driven native-property updates.

The primary mitigation removes the live chart's continuous JS-driven SVG prop
animation. Presentation lifecycle guards and WebView recovery accompany it.
The reports establish the termination mechanism, but do not symbolicate the exact
initiating JavaScript component. A new release build on the affected phone is
still required before declaring the crashes fixed.

The initial static audit examined `f8eccbb2`. The patch was subsequently rebased
onto `origin/main` at `198dfc0d`, preserving the newer replay-camera smoothing loop
and adding its inactivity cancellation. No native SDK upgrade, feature-flag
change, scoring change, account write or SQL change is included.

## Device evidence

Reports were read through Console after Xcode Device Hub connected to the phone.
Organizer initially showed no reports, including with all versions/distributions
selected. All ten available Overtaek reports from October 30–31 were compared;
this includes five slightly older than 24 hours to cover build 20.

| Date/time Eastern | Build | Termination | Captured native UI work |
| --- | --- | --- | --- |
| Oct 31 17:26:13 | 22 | 10s scene-update watchdog | Scroll clipping/mount transaction |
| Oct 31 17:12:35 (file 171236) | 22 | 10s scene-update watchdog | Scroll clipping; JS native-prop/layout work |
| Oct 31 10:04:58 | 21 | 10s scene-update watchdog | Scroll clipping; JS native-prop/layout work |
| Oct 31 09:25:53 | 21 | 10s scene-update watchdog | Scroll clipping; JS native-prop/layout work |
| Oct 30 23:11:58 | 21 | 10s scene-update watchdog | Scroll clipping; JS native-prop/layout work |
| Oct 30 17:07:10 | 20 | Failed to terminate gracefully after 5s | Scroll clipping |
| Oct 30 16:30:11 | 20 | 10s scene-update watchdog | Shadow-view slicing/culling; JS native-prop work |
| Oct 30 16:29:22 | 20 | 10s scene-update watchdog | Shadow-view mutation/culling; JS native-prop work |
| Oct 30 16:27:46 | 20 | 10s scene-update watchdog | Scroll clipping; JS native-prop/layout work |
| Oct 30 16:27:17 | 20 | Failed to terminate gracefully after 5s | Shadow-view/layout-metric comparison; JS native-prop work |

The recent reports identify `FRONTBOARD 0x8BADF00D`, `WatchdogEvent: scene-update`
and background watchdog visibility. Their main-thread stacks include
`updateClippedSubviewsWithClipRect:relativeToView:`,
`RCTScrollViewComponentView mountingTransactionDidMount:withSurfaceTelemetry:`,
and `RCTMountingManager performTransaction:`. Multiple JavaScript-thread stacks
include `TimerManager`, `NativeDOM::setNativeProps`, and Yoga layout.

No separate fatal Mapbox, WebKit, HealthKit or uncaught JavaScript exception
signature was identified in this set. This does not exclude other crash types
elsewhere. Stack samples show activity at termination, not a continuous recording
of the entire timeout. Popup time is not necessarily termination time.

Raw reports remain in the device/Apple tooling; macOS denied direct filesystem
reading even outside the sandbox. No raw report copy, device identifier or account
detail was committed. See Apple's [crash classification](https://developer.apple.com/documentation/xcode/identifying-the-cause-of-common-crashes)
and [report acquisition](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs)
guidance for interpreting and retrieving subsequent reports.

## Findings and implemented fixes

### Continuous chart animation: primary mitigation

`src/ui/open-line-chart.tsx` previously used repeating `Animated.timing` with
`useNativeDriver: false` to update an SVG circle's radius and opacity.
Installed React Native source shows that `TimingAnimation` schedules JS animation
frames and Animated's Fabric prop hook can call `setNativeProps`. The scroll-view
mount observer calls `_remountChildren`, which walks the native clipping tree
when native view culling is disabled. This matches the combined timer/native-prop/
Yoga/clipping signatures, without proving which JS component initiated a report.

The live halo now uses a native `Animated.View` overlay with opacity and scale,
`useNativeDriver: true`, and `isInteraction: false`. Its center and horizontal
scaling follow the SVG's full-width transform. Curves, axes, readings, endpoint
and scoring are unchanged. Focus loss, inactivity, selection, reduced motion and
unmount stop the loop. The separate PulseCircle helper has no production callers
in this checkout; it was not counted as a second active production loop.

### Inconsistent playback and camera lifecycle: fixed

`src/ui/use-scene-active.ts` combines navigation focus with app activity. It
retains screen state and treats `inactive` as suspended presentation, including
Control Center and permission interruptions.

`src/ui/active-playback.ts` now drives automatic overtake playback. It cancels
pending frames immediately on inactivity, counts only active elapsed time and
resumes without skipping time spent away. Disposal removes the subscription;
Skip cancels playback. A boundary regression covers inactivity between the last
two frames, so completion cannot become stuck just below 100%.

`src/ui/course-map.tsx` gates follow, replay and distance-target camera effects on
scene activity/readiness. The smoothing loop from main is preserved and cancelled
on inactivity, then restarted on return using the latest target. No blanket map
remount is introduced: remounting on every transient interruption could discard
camera state and increase teardown work.

### WebView content-process recovery and suspended bridge work: fixed

Both `src/ui/arena-3d.tsx` and `src/ui/route-timelapse.tsx` handle
`onContentProcessDidTerminate`: clear bridge readiness and invoke the existing
unavailable callback. Route details already render a static fallback. The old
arena also cancels pending bridge injection on process death.

Bridge messages and readiness deadlines are suspended while the scene is
inactive. A ready scene receives its latest model on return; a dead process must
complete a fresh ready handshake. A scene does not time out solely because the
phone was locked. This is a recovery fix; a WebKit child-process death alone does
not establish a whole-app crash.

## Other audit findings and disposition

These remain valid follow-ups, but none is established as the cause of these ten
reports. They are kept out of this rendering/lifecycle PR to avoid changing
unrelated ingestion, data ownership or SDK behavior without measurements.

| Finding | Evidence and practical limit | Next investigation |
| --- | --- | --- |
| Concurrent native map ownership | Live geographic field can remain underneath a replay/root modal. Tab switching disables the course hook and removes its live map; backgrounding alone retains it. Native Mapbox also has its own lifecycle behavior. | Profile visible versus covered map ownership on device before choosing pause/unmount policy. |
| Long-course geometry work | Course scenes cache by lane-array identity, which changes in replay. Courses allow 20,000 points; earned trails are correctly bounded to two traversals but can still create large coordinate arrays per update. | Profile the longest catalog course; separate trail/camera cadence or simplify rendering-only geometry while preserving exact endpoints, lanes and rewind semantics. |
| Apple Health read workload | Sync reads 90 days, full workout routes and health metrics before one upload. Several callbacks have no deadline; sleep defaults to an unlimited native query. Route conversion and grouping create intermediate arrays. No app-configured HealthKit background observer was found. | Measure peak allocation and duration with a busy history; design incremental/windowed reads, callback deadlines and bounded batches. A JS deadline cannot cancel native queries by itself. |
| Startup/storage rejection containment | Some boot, notification lookup and fire-and-forget storage promises lack rejection handling. Foreground refresh can overlap provider sync, although cooldowns/deduplication already exist. | Add explicit recovery preserving dirty writes and bounded diagnostics; no blanket catches or speculative account-state changes. |
| Native diagnostics/build provenance | No native crash-reporting SDK is configured. JS lockfile is present but there is no deployed IPA, archive, Podfile.lock or build-specific JS source map here. Core installed native dependencies match Expo's declarations. | Retain release archive/dSYMs/source maps and exact native dependency resolution. Use Apple device reports first; add bounded, non-sensitive lifecycle breadcrumbs if needed. No SDK mismatch is established. |

## Verification and limitations

Initial baseline: all 280 mobile tests and workspace typechecking passed before
implementation. After the initial patch, the iOS release JavaScript/Hermes export
also passed. A heavily loaded Mac caused seven 5s test timeouts; those files all
passed serial reruns without assertions failing. Repository timeout configuration
was not changed. See the final PR verification below for checks after rebasing
and the additional WebView fixes.

Tests cover native-driver halo configuration, selection/reduced-motion/inactivity
cancellation, navigation blur, playback suspension/boundaries/cleanup, camera-loop
cancellation/resumption and WebView process death/deadline/handshake behavior.
Mapbox and WebView are mocked. An Expo bundle export does not build an IPA or
validate iOS native rendering, memory pressure or lifecycle deadlines on device.

## Release-device closure criteria

Install a new release build containing the patch on the affected phone. Repeat
high-risk background/return scenarios at least 20 times with timestamps and native
logs, comparing new reports to the signatures above. Old reports remain on device.

| Surface | Transitions to exercise |
| --- | --- |
| Home live charts after fresh launch | Home Screen and lock for 5s, 60s and 5min; return |
| Compete 2D and geographic 3D | Same cycles, including camera flight, pinch and fullscreen open/close |
| Historical 3D replay | Play, pause and scrub before backgrounding; replay over a live field |
| Automatic overtake/onboarding | Leave mid-crossing, before map readiness and after completion |
| Activity route WebView | Background and web-content process termination; verify fallback/recovery |
| Large account/longest course | Observe JS/main-thread stalls and allocation with Instruments |
| Sync, offline resume and low storage | Confirm responsiveness, explicit errors and preservation of unsaved edits |

Do not declare every crash fixed until this release-device verification is done.

### Final PR verification

- Rebased onto `origin/main` (`198dfc0d`); replay smoothing regression tests retained.
- Mobile suite: **74 files, 294 tests passed** in one run with two workers and
  the repository's normal timeout. No test timeout configuration was changed.
- Workspace `pnpm typecheck`: passed, including mobile and web.
- The two WebView test files also passed separately after a test-only callback
  typing correction (six tests).
- `git diff --check`: passed.
- Final iOS release/Hermes bundle export: passed after rebase and WebView fixes,
  output `/private/tmp/overtaek-ios-crash-pr-export`. This remains a bundle export,
  not a native IPA build or release-device verification.
