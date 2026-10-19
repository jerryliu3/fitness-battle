# Production motion repair — October 19, 2026

Code review of #188 → #189 → #191 → #190, through `9e013da`. The stack was merged into main as `04cec47` during this pass; repairs target main directly. The `/ux` gallery remains the reference, not evidence that production flows match it. This pass uses code inspection and automated checks; browser and device validation are deliberately deferred.

## Repaired causes

- **Lanes:** a fixed-width SVG was left without an explicit rendered width. Its immersive parent then hid horizontal overflow. The renderer now measures the available viewport, keeps labels in pixel units, centers the actual user lane, preserves the horizontal anchor on resize, and allows peer browsing at every size. Paint-server IDs are unique per sport; edge labels show real totals; marker hit areas are larger.
- **Expansion:** replaced the arbitrary fullscreen clip with measured card-to-window geometry and a reverse transition. A stable portal target moves the same live canvas into a root Radix dialog, preserving selection, zoom and horizontal position. Controls and athlete details travel with it. Escape, scroll locking and focus return belong to the dialog; reduced motion skips travel. Offscreen origins fade on return.
- **Gestures:** horizontal mouse/touch dragging has one owner and pointer capture. Embedded touch surfaces allow vertical page scrolling; expanded web lanes and an explicit native Explore control own vertical field panning. Cancels clear the gesture. Native zoom no longer resets a manually chosen center.
- **Viewport commands:** Fit field interpolates center and span together, using the destination span for clamping. Center me restores live following. Manual pan/zoom interrupts from the displayed viewport; RAF cleanup does not update unmounted state. Reduced motion disables overtake replay.
- **Standings:** retains the lane tree instead of exit-before-enter remounting; stage height interpolates when content changes. Restores tied places through the existing ranking helper and caps row stagger. Details remain available in both views.
- **Sheets:** removed CSS and Motion competing for the same transform. Opening haptics follow the semantic open event, not every animation start. Explicit focus return supports sheets without a Radix Trigger. Native backdrop fades separately from the sliding panel and retains the modal through exit, including interrupted reopening.
- **Navigation/settings:** one semantic link click now owns each tab navigation; modified clicks remain browser links and selected-tab retaps do nothing. Settings find their own scroll root, retain the parent's offset, focus the detail, make the covered overview inert, and restore its invoking control after exit.
- **Home/native:** removed the full-screen transparent ScrollView intercepting journey touches. Chart and journey share one scroll surface. Web journey entrance no longer moves circles independently of their measured connecting path; its timer has a stable day dependency and respects reduced motion.
- **Other:** interrupted number updates resume from their visible value; score-lens storage hydration starts from the same server/client state and tolerates blocked storage. Removed medal press feedback that suggested an action without opening anything.

## Compared with the original 18 prototypes

“Partial” means the production flow still lacks part of the proposed choreography, even after these repairs.

| # | Flow | Code-pass status / remaining work |
|---|---|---|
| 1 | Lane expansion | Web implementation repaired. Native still lacks source-linked fullscreen expansion; Explore is a gesture mode, not a fullscreen equivalent. |
| 2 | Today → session | Partial: web still replaces Home for full detail, losing source/scroll continuity. Needs a retained source-linked detail surface. |
| 3 | Shared sheets | Entry/exit ownership, native scrim and focus repaired. Content-sized detents, interactive native drag/cancel and animated content resizing remain. |
| 4 | Athlete settings | Web parent scroll/focus repaired. Native needs review of interactive stack Back/cancel rather than global fade. |
| 5 | Primary tabs | Duplicate navigation repaired; retained state and indicator remain. Directional body handoff/rapid-navigation behavior needs browser validation. |
| 6 | Scope/lens | Hydration repaired. Production deliberately uses one global score lens, unlike the prototype's per-sport memory; do not silently change that decision. |
| 7 | Field manipulation | Web commands and gesture arbitration repaired; native scroll arbitration/zoom anchor repaired. Native command interpolation and anchored pinch are still absent. |
| 8 | Lanes → standings | Retention, size continuity and tie ranking repaired. Shared marker-to-row choreography remains absent. |
| 9 | Athlete inspector | Available inside expanded field and both modes. Still inserts/removes a dock rather than retaining a fixed inspector footprint. |
| 10 | Journey | Broken native layering and web path/intro mismatch repaired. Coordinated insertion/reflow and retained day expansion remain. |
| 11 | Registration | Existing confirmed join flow retained; source-to-new-sport identity transition remains incomplete. |
| 12 | Metrics/charts | Interrupted ticker fixed; existing chart interpolation retained. Audit metric/axis/scope timing visually. |
| 13 | Crew | Existing invite/feedback improvements retained. Stable crew/feed reflow needs visual validation; no claim of a complete shared-layout implementation. |
| 14 | Awards | Removed misleading press-only behavior. The proposed medal pickup/detail/return is still unimplemented. |
| 15 | Async feedback | Existing result haptics retained; shared sheet repairs apply. Validate failure/retry, draft preservation and action-size stability. |
| 16 | Profile editor | Existing inline editor retained. Validate keyboard/safe-area behavior and portrait continuity on device. |
| 17 | Return/recap | Existing return flow retained; shared sheet repairs apply. Recap-to-history continuity remains partial. |
| 18 | Setup/secondary routes | Not redesigned in this repair. Directional step retention and native route transitions still need implementation review. |

## Next validation pass

1. Desktop and narrow web: expand/collapse from different scroll positions; resize/rotate while expanded; repeat quickly; Escape and keyboard focus return; offscreen origin return.
2. Few and many peers: inspect You and ghost, pan horizontally beyond both edges, pan vertically only when exploring, switch standings/back, verify ties and scroll retention.
3. Interrupt Fit/Center with a drag or zoom; change scope; verify Center follows later value updates and reduced-motion replay stays quiet.
4. Rapid tab changes and browser Back; settings opened halfway down Athlete; sheet reopen during exit; keyboard-only close/return; no duplicate navigation.
5. Native device: Home journey touch/scroll, Explore arbitration, zoom anchor, sheet Back/keyboard/safe areas/reopen/rotation and reduced motion. Native fullscreen lane expansion is a known missing flow, not a validated feature.
