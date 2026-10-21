# Mobile parity audit — October 20, 2026

## Scope and evidence

Compared the Expo routes and features with the production web routes, `docs/design-guide.md`, and the October 19 motion repair review. Ran Expo in its browser preview and subsequently exported its normal static production build. Browser checks used a local demo account, including empty Home, setup, registration, an active running field, and Athlete settings. These checks do not establish native-device or live-service correctness.

No iOS simulator is available on this machine (`xcrun simctl` is unavailable). HealthKit, Health Connect, native OAuth return, camera/photo permissions, push delivery, native keyboard avoidance, Android system Back, and iOS interactive Back still need physical-device or simulator checks. Existing tracker/account unit tests remain useful but do not replace those checks.

## Repairs in this pass

| Area | Finding and repair | Evidence |
| --- | --- | --- |
| Athlete navigation | Local panel state replaced the overview and bypassed normal stack Back. Athlete now has Progress and Settings destinations; the hub opens dedicated stack screens and keeps the underlying overview mounted. | Browser: Athlete → Settings → Preferences → Back → Settings → Back → Athlete. |
| Profile | Profile fields were buried among units, sport enrollment and freezes. Edit profile now has a separate destination, field length limits and keyboard inset adjustment. | Browser: edit a name draft, cancel, verify original values return. No live profile mutation tested. |
| Account | Sign out, Report an issue and Delete account are grouped under Settings → Account. | Browser inspected all three; opened report sheet and verified honest demo disclosure. No report sent or account deleted. |
| Notifications | A Notifications destination also exposed unrelated enrollment writes and implementation-heavy copy. It now contains notification choices, labels for switches, visible failure feedback, a loading retry path and guarded test delivery. | Browser: hub → Notifications, master and disabled category states. Permission and remote delivery not exercised. |
| Tab navigation | Custom tab bar skipped React Navigation events and optimistically claimed selection before navigation finished. It now emits cancellable tab presses and long presses, follows navigator state and avoids navigating again on retap. | Component tests cover prevented navigation, retaps, long presses and deferred selection; browser tab navigation exercised. |
| Crew empty state | A one-person placeholder showed an arbitrary shared target and Invite/Share/Settings actions before a crew existed. Empty crews now show one create/join entry, with an explicit live-account requirement for demo users. Existing live crews keep their supported actions. | Component tests cover live empty crews and demo accounts; production browser empty state checked. |
| Home recommendation | Suggestion detail replaced the entire Home tree, losing source/scroll continuity. One visible recommendation now expands in place; the Today journey node opens it and scrolls to it. Removed unreachable duplicate activity-detail UI. | Browser: expand/collapse without route replacement. Journey day detail remains handled by its existing sheet. |
| Registration | An empty `joinError && …` expression placed a bare string in a native View. Registration now uses a boolean condition. | Reproduced browser rendering error; component regression rejects bare native View text while opening registration. Browser exercised setup gate and demo running registration. |
| Sheet exit | Clearing the selected account action replaced report content with deletion copy during the retained exit animation. Sheets now retain their last open content until exit finishes. | Reproduced with Escape in browser; regression test verifies report content remains during exit and modal subsequently hides. |
| Compete controls | Zoom, center, fit and ghost controls crowded the main card and remained visible in standings. They now live in Field controls, available for lanes. Unavailable 3D no longer consumes a full primary view tab. The 1v1 teaser no longer has a redundant disabled action. | Production browser checked controls expansion, Fit field, Center me and standings control removal. 3D remains unavailable, as on web. |
| Lanes/standings | Switching modes unmounted the lane canvas and reset internal browsing state. Its instance now stays mounted but hidden in standings, and its animation clock pauses. Standings rows have 48px minimum targets; inspector dismissal has a shorter visible label. | Component regression verifies one lane mount across both mode switches and hidden-clock state. Browser verified tied places, athlete inspection and switching back to retained lanes. |
| Capsule visibility | Field clipping cut off capsule heads at viewport edges. Only wakes are clipped now; heads remain outside that clip. Static heads are memoized independently of the wake clock. | Code inspection plus production field rendering. Rotate/resize and native SVG rendering still require device QA. |
| Motion | Native overtake replay ignored reduced motion and continued outside Compete. Replay now finishes immediately for reduced motion or an unfocused screen. Shared sheets and wakes use a preference hook that ignores stale asynchronous reads. | Reduced-motion regression covers a device event racing the initial preference read. Native animation pacing remains unverified. |
| Setup | No explicit cancel/back action and no automatic iOS keyboard inset adjustment. Added Back with a deep-link fallback and updated the tracker destination instructions. | Setup route exercised in browser; native gesture and keyboard verification outstanding. |
| Export | Normal Expo static export failed with `window is not defined`: module-level auth initialization used AsyncStorage's web adapter in Node. Only server export now disables persistence and refresh; native and browser retain both. | Four platform/environment tests; normal `expo export --platform web` succeeds after the fix. See Supabase's [initialization options](https://supabase.com/docs/reference/javascript/initializing). |
| Shell | Initial font loading used obsolete colors; changed to shared shell tokens. Secondary native routes use platform stack transitions instead of a global fade. | Typecheck and production export. iOS interactive transition still needs native QA. |

## Remaining gaps, in priority order

1. **Native field exploration:** fullscreen expansion, anchored pinch, interpolated Center/Fit commands and the shared racer transition into standings remain behind web. Keeping the canvas mounted prevents state loss but does not implement that choreography.
2. **Device interaction pass:** test keyboard/safe-area behavior in auth, profile, setup, imports and report sheets; Android Back; iOS swipe Back/cancel; rotation; Explore arbitration; screen-reader focus return; reduced-motion startup and replay. Browser checks cannot establish these.
3. **Live integrations:** verify real tracker OAuth, health ingestion, import retry, expired sessions, photo upload and notification registration/delivery on development builds. Demo disclosures remain in place. Do not treat demo registration as live enrollment verification.
4. **Crew:** native already implements crews, invites, activity, leaderboard, sharing, cheers, rest and leaving; that is code evidence only. A live multi-user pass is needed for authorization failures, reconnects and list reflow. The empty layout was simplified in this pass; live populated crews remain unverified.
5. **Home history and awards:** native lacks web's persistent per-day journey reveal treatment and the proposed medal-detail flow. Avoid inventing sessions, rewards or ownership to fill empty states.
6. **Preview fidelity:** Expo web's installed SVG adapter emits development warnings for native responder props on SVG groups and `maskType`. These are separate from the repaired registration text error; review the adapter before using browser console cleanliness as a native release gate.
7. **Regression coverage:** add device-driven smoke coverage once a runnable iOS/Android development build and device runner are available. The current UI tests mock native primitives and cannot catch platform rendering/gesture regressions.

## Verification results

- Workspace typecheck passed after the final changes.
- Mobile: 66 tests passed across 16 files, including 12 new regression cases in six new test files.
- Full workspace test run passed earlier in the pass; five existing web seed tests skipped without their database. Subsequent application changes were confined to mobile and its suite was rerun.
- Production Next web build passed; its first sandboxed attempt could not fetch Google Fonts, and the network-enabled retry succeeded.
- Expo normal static web export passed after the auth fix, including Settings and its detail routes.
- iOS and Android production JavaScript/Hermes exports passed. This verifies native bundling, not installation or runtime behavior on a device.
- Browser checks covered 390px width; Settings was additionally checked at 320px. Screenshots are saved with this chat's artifacts.

## Repeatable verification

- `pnpm typecheck`
- `pnpm test` (existing database-dependent web seed tests can skip without their database)
- `pnpm build:web` (needs access to configured Google Fonts)
- `pnpm --filter @fitness-battle/mobile exec expo export --platform web --output-dir /private/tmp/fitness-mobile-audit-export`
- `pnpm --filter @fitness-battle/mobile exec expo export --platform ios --platform android --output-dir /private/tmp/fitness-mobile-native-audit-export`
- Browser: Home recommendation and Today node; registration/setup gate; switch Open/GPS; Fit/Center; lanes ↔ standings; tied places; inspect/dismiss athlete; Athlete → Settings → detail → Back; profile draft/cancel; Account report open/Escape; notification disabled/loading/error states.

For a fast browser-only development preview use `pnpm --filter @fitness-battle/mobile study`. Also run normal static export: the preview deliberately avoids server rendering and previously hid the auth-storage export failure.

## Visual follow-up after user review

The first pass addressed grouping and correctness, but did not establish button-by-button aesthetic parity. The user correctly identified that Compete still looked like a collection of separate outlined actions. This follow-up compares the production web header, segmented controls, field hierarchy and benchmark navigation directly with the native implementation.

- Replaced independent outlined score/view choices with grouped soft-background segments. The score lens now belongs to the Competition header and uses the shared gold selected color.
- Removed the redundant single-sport selector; multiple active sports retain a horizontal picker. Registration has one primary action below the field instead of competing with the sport selector.
- Added the existing tied place/field-size presentation beside the sport total, replacing the duplicated score-track label.
- Made Field controls a compact soft panel, Explore a concise labeled control, and benchmark navigation a destination row. Replay and inspector dismissal use lightweight text actions.
- Secondary shared buttons have a flat one-pixel border. Only primary actions retain the tactile base; button labels use readable 14px UI text.
- Verified the revised layout at 390px and exercised Open/GPS and lanes/standings switching in the production browser export. The native interaction regression was updated for the grouped controls; 66 mobile tests and workspace typecheck pass.

These are Expo web browser checks and native JavaScript bundle checks, not an installed Android/iOS app test. Xcode is now installed and its first-launch status check succeeds, but `simctl list runtimes` is empty. Android tooling includes a Medium Phone API 37 emulator configuration; no native application was installed or exercised in it during this pass.
