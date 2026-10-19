# Motion & touch prototypes

Open `/ux`, or a direct scene such as `/ux#awards`. The existing `/ux` design access gate and no-index policy remain in place. The former `/ux` redirect to `/design` is replaced by this gallery; `/design` and its existing studies remain available.

This is one isolated prototype PR based on `origin/main` at `100f178`, which already includes the newer lane expansion/recenter fixes. It does not apply the earlier audit's production recommendations or modify app state, scoring, trackers, crews, native navigation, or reward ownership.

## Efficient review

- Use the numbered index or Previous/Next to visit all 18 ranked flows.
- Each scene supplies an instruction, interactive components, a motion recipe, a mobile touch recommendation, and a visual event monitor.
- Use Reset to restore a scene, Slow motion to inspect choreography, and Reduced motion to inspect the alternative. The system preference takes precedence.
- One scene mounts at a time. Layout identities are scoped to the scene/reset; timers and viewport animations clean up on unmount. No network calls, new assets or packages are needed.
- Scenes are intentionally small: arena expansion stays inside the preview frame rather than requesting browser fullscreen; setup/settings/tab changes model navigation locally; feedback and registration simulate outcomes rather than calling APIs.
- Source: `catalog.ts` (18 specs and tactile recipes), `demos.tsx` (small interactive scenes), `lab.tsx` (review shell/visual monitor), `smoothness.css` (root-scoped styling).

## Scene coverage

| # | Hash | Review interaction |
| --- | --- | --- |
| 1 | `arena` | Change zoom/selection, expand and collapse; state survives |
| 2 | `session` | Open and collapse Today; the following journey makes room |
| 3 | `sheets` | Open, resize content, dismiss by Close/Escape/backdrop; focus returns |
| 4 | `settings` | Scroll to Data Sync, open at the heading, go Back to the retained list |
| 5 | `tabs` | Change tabs rapidly; tab-local notes persist |
| 6 | `scope` | Change sport/score lens; each sport remembers its lens |
| 7 | `viewport` | Drag, zoom, Center me, Fit field; drag interrupts programmatic motion |
| 8 | `standings` | Lanes to rows, update places, switch back to fixed lanes |
| 9 | `selection` | Select/switch athletes without moving the field or detail dock |
| 10 | `journey` | Insert a day, open it, collapse it; existing days retain identity |
| 11 | `registration` | Choose sport, confirm simulated join, carry label into inserted card |
| 12 | `charts` | Apply confirmed data; metric/line/points/bars move together |
| 13 | `crew` | Switch crew/feed/standings and cheer locally |
| 14 | `awards` | Unfold shelf, pick up medal, one shine/turn, return to original mount |
| 15 | `feedback` | Pending → success/error; retry retains draft; stable action width |
| 16 | `profile` | Edit/save/cancel while portrait remains anchored |
| 17 | `recap` | Positive/frozen result, explicit reveal, file into history, silent replay |
| 18 | `setup` | Forward/back with retained name; finish into benchmark filters |

## Mobile exceptions only

The gallery shows a **Mobile adaptation** note only for flows requiring a different small-screen/native treatment: arena expansion, Today detail, sheets, settings Back, viewport gestures, lanes-to-rows, athlete inspection, registration handoff, medals and profile editing. `MOBILE_NOTES` in `catalog.ts` is the source. Other scenes reuse the existing choreography; no duplicate mobile demos are necessary.

The important differences are safe-area/root-overlay ownership, keyboard and sheet gestures, interactive Back cancellation, gesture arbitration with page scrolling, bottom docks instead of side inspectors, and offscreen source/destination handling. In particular, phone medals lift into a scrollable detail sheet and reverse on swipe dismissal; the current inline web detail demonstrates the shared medal motion rather than implementing that native sheet. Native rollout should use local Reanimated/gesture primitives, keep direct manipulation on the UI thread, provide 44px+ effective touch targets, and verify iOS/Android Back, rotation, keyboard and reduced-motion behavior on devices. Phone-width browser checks alone do not validate those native interactions.

## Haptics: proposed native contract

The visual pulse marks event meaning and rough emphasis; it is **not** an accurate waveform or device haptic preview. `catalog.ts` describes every scene's trigger, feel and Expo mapping. A `none` event is intentional silence. Passive refresh, camera motion, chart frames and scrolling should not vibrate.

No `expo-haptics` dependency is installed by this PR. A later native rollout can install the Expo-compatible version with `npx expo install expo-haptics` and adapt the event boundary, for example:

```ts
import * as Haptics from "expo-haptics";

const impacts = {
  soft: Haptics.ImpactFeedbackStyle.Soft,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
};
const notifications = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

// Called at the semantic event, never from a render or animation-frame loop.
async function playCue(kind, { enabled, controlAlreadyPlayed }) {
  if (!enabled || controlAlreadyPlayed || kind === "none") return;
  try {
    if (kind === "selection") await Haptics.selectionAsync();
    else if (kind in impacts) await Haptics.impactAsync(impacts[kind]);
    else if (kind in notifications) await Haptics.notificationAsync(notifications[kind]);
  } catch {
    // Unsupported hardware/settings must never block the action.
  }
}
```

The snippet illustrates event mapping, not a drop-in native module. Rate-limit repeated selection cues (the visual monitor uses 80ms); use platform-appropriate Android effects where supported instead of assuming iOS intensity names feel identical. Keep native switches/pickers' built-in effects from doubling up. Haptics and reduced visual motion are separate preferences: honor a dedicated haptic opt-out and OS behavior. Trigger notifications only on confirmed outcomes; medium medal contact is inspection feedback, never a claim of a new reward. Tune on physical iOS/Android hardware before rollout.

References: [Apple haptic guidance](https://developer.apple.com/design/human-interface-guidelines/playing-haptics), [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/), [Motion layout animations](https://motion.dev/docs/react-layout-animations), [Motion retained exits](https://motion.dev/docs/react-animate-presence).

## Framework notes

The installed Next 15.5.27 package has no `node_modules/next/dist/docs/`. Its [versioned client/server guide](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) was used as fallback: the route stays a thin server wrapper and interactivity lives behind `use client`. Study modules follow the existing private `_studies/` boundary, and production features never import them.

## Verification

Run `pnpm typecheck`, `pnpm test`, and `pnpm build:web`. Browser review should cover all 18 scenes at desktop and phone widths, reduced motion, keyboard dismissal/focus, rapid switching, interruption and error retry. These are presentation prototypes; native feel, release-build performance, full-screen production integration and live persistence remain outside this PR.

Verified October 19, 2026: workspace typechecking and test suite pass (488 passed, 4 skipped); production web build passes. All 18 desktop scenes were exercised; all 18 idle layouts were checked at 390 CSS pixels with no horizontal page overflow. Targeted checks cover sheet Escape/focus return, tab-local state, score-lens retention, standings reordering, report failure/retry, reduced-motion medal contact, medal focus restoration, and reduced-motion recap/replay cue priority. The isolated browser reports no application errors; Chrome extension-injected hydration warnings were observed separately. Physical-device haptics have not been tested.
