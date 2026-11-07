# Compete fullscreen entry — historical scope

Superseded November 6 by the [background field and sheet experience](reviews/compete-background-sheet/README.md). The preload and stable-camera requirements remain.

Status: implemented in source on November 3, 2026; release-device latency and
map-completeness acceptance remain to be measured.

## Experience contract

Selecting Compete opens the existing immersive field immediately. The field is
the tab's main surface, replacing the summary → inline field → expand sequence.
There is no expansion animation, intermediate page, map fly-in, or camera
correction caused by entering or returning to the tab.

Prepare the initial selected field during application startup, as soon as account
and privacy data permit. Preloading includes the renderer, assigned course,
initial scenery, athlete presentation, final viewport dimensions and camera.
Downloading a route or importing a module alone does not satisfy readiness.

“Does not move after entry” means no entry-induced layout or camera changes.
User gestures, explicit athlete selection/recenter, and deliberate replay remain
available. Routine standings refresh updates athlete values without stealing the
camera. Existing sync/earned-event takeovers remain separate explicit flows;
opening Compete must not itself start a replay or consume a pending event.

Selected navigation: hide the bottom tabs and ordinary app header on Compete.
The field fills the application viewport, matching today's fullscreen mode.
Retain a clear, accessible close/back control that returns to the originating
app destination, with Home as the fallback for direct entry. Respect safe areas
for field controls and preserve platform Back behavior. Preload at these final
fullscreen dimensions so hiding app navigation does not resize the map on entry.

Keep the selected event visible in compact field controls. Event switching and
registration, standings, results and all-time standings open over the retained
field as appropriate sheets/panels. Preserve existing fullscreen controls,
athlete cards, overlay collapse/hold interactions and accessibility behavior.
Distance fields retain geographic 3D; points fields retain 2D. Recovery needs a
full-height Recovery surface rather than an invented geographic field. Queued
fields retain their honest queue state without competitor identities or ranks.
An unregistered account gets the event registration surface.

## Starting implementation (before this change)

- Native `app/(tabs)/arena.tsx` renders a scrolling summary and inline field.
  `src/features/competition-field.tsx` starts with `expanded = false`, mounts the
  scene in a root Modal on expansion, and collapses on tab blur. Moving between
  those branches remounts the scene.
- Native course reads are gated by `isFocused`. The map module is lazy-loaded.
  `useCompetitionCourse` has a memory cache and exported prefetch helper, but the
  helper currently has no callers. Its cache key omits the account, and the hook
  still issues a request when a cached course exists.
- Web `src/shell/phone-shell.tsx` prefetches routes but mounts Compete only after
  its first visit. `FieldStage` gates course reads on `tabActive` and clears its
  immersive state on blur.
- Native and web course maps signal readiness at map load. Initial focus is
  applied by a later effect, so this signal alone does not prove a settled frame.
  Web also recreates the map when the course object reference changes.
- Native camera effects intentionally require an active scene. Hidden scenes
  must keep clocks paused; warmup must not broadly remove those lifecycle guards.

## Implementation scope

1. **Make the immersive field the Compete surface.** Extract its existing HUD and
   scene into a stable host in the tab/shell. Remove the Modal reparenting from
   normal Compete entry. Reserve final dimensions before warming; revealing the
   tab must not resize or remount the host. Verify native navigator attachment
   behavior on both platforms; eager React mounting alone is insufficient proof
   that an offscreen native map actually renders.
2. **Warm the initial selected event at startup.** Use the existing selection
   policy and honor an explicit event deep link. Start course reads and renderer
   preparation once account/privacy readiness allows. Reuse in-flight reads and
   stable course objects, scoped by account, sport, wave, units and renderer as
   appropriate. Clear/invalidate on account changes and wave rollover. Prepare
   the selected event first; other registered events may warm afterward within a
   measured resource budget. No requirement to retain a map for every event.
3. **Separate preparation from playback.** Add a one-time preparation path that
   applies the final camera without animation while hidden. Readiness requires
   final layout, required map content/layers, athlete overlays and a rendered
   frame after camera placement. Keep hidden scenes inaccessible and untouchable;
   pause ongoing presentation clocks and replay while hidden/backgrounded.
4. **Retain state on reveal and return.** Preserve map instance, camera,
   selection, zoom and overlay state through tab switches. Focus must reveal the
   prepared scene without issuing a new focus request. Background data refresh
   must not replace an equivalent course object and restart the map. Real
   account/event/wave changes establish a new preparation boundary.
5. **Cover the cold-start race.** Background warmup cannot guarantee readiness if
   someone taps Compete immediately. Recommended: register the initial field with
   the existing launch readiness gate, preparing it under the launch cover before
   tabs become usable. Use a bounded map deadline; failures release into an
   honest, stable unavailable/retry surface at the same dimensions. Do not reveal
   an unfinished map and then animate it into place. Explicit retry may replace
   the failure surface after preparation. Measure added launch time alongside
   entry latency.

Preserve existing scoring, periods, registrations, privacy gates and authoritative
course assignment. No new database schema, scoring path or renderer is required
by this proposal. Current design tokens remain unchanged.

## Acceptance and verification

- After normal launch readiness, the first Compete tap shows the prepared field
  directly. Proposed warm-entry target: p95 tap-to-visible-field ≤100 ms on
  agreed release devices; validate with measurements rather than assume it.
- With frozen input data, a recording of entry and the following two seconds has
  no inline-page flash, spinner, tile fill-in, HUD shift, camera fly-in or delayed
  recenter. Measure initial map completeness separately from map-load events.
- Switching Home → Compete → another tab → Compete preserves the field instance
  and exact camera. Verify after background/resume and ordinary refresh too.
- Compete shows no app header or bottom tabs. Its close/back control restores
  the originating destination (Home for direct entry); platform Back also exits
  correctly. Exiting and reopening retains the prepared field without resizing.
- Test immediate launch taps/deep links, slow/offline startup, missing map access,
  queued/empty/points/Recovery states, account switches, event switches, wave
  rollover, Reduced Motion and memory-pressure recovery. A discarded renderer
  must re-enter preparation rather than report stale readiness.
- Add focused lifecycle/readiness and camera regression coverage. Run relevant
  tests, `pnpm typecheck`, and web build for implementation touching web. Use
  release-device recordings and startup/memory measurements for native; component
  tests cannot establish that an offscreen GPU map has produced a usable frame.

## Delivery sequence

First establish native persistent hosting, preparation readiness and launch
integration together, then relocate secondary actions and verify the complete
entry flow. Apply the same contract to web using its retained panels and shared
camera logic. Ship only after the entry, return and cold-start cases meet the
contract; flipping the initial expanded flag alone is not a complete delivery.

## Implementation verification

Native now keeps the selected field in a sibling host above the navigator rather
than moving it into a Modal. Its event/standings details use a separate Modal.
Web prepares Compete eagerly and uses a retained fixed host rather than an
expansion portal. Both warm course reads without tab-focus gating and use an
instant initial camera placement. Geographic hosts register launch readiness until
the settled map callback, an explicit configuration/read failure, or a 12-second
preparation deadline. Deadline failure stays on Retry rather than revealing a late
map. Native presentation activity is explicitly gated by the Compete path.

Regression coverage verifies the native fullscreen scene survives blur/return and
exit without collapsing, plus instant initial web camera placement followed by
animated deliberate selection. Full native and web suites and the production web
build were exercised. No release-device timing or hidden native GPU render claim
has been established by these automated checks. The proposed p95 entry target and
visual map-completeness checks remain release verification requirements.
