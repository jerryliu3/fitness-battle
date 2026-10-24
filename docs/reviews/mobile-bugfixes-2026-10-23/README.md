# Mobile cleanup follow-up — October 23, 2026

This follows the owner's pasted list. The checkout already contained much of the earlier cleanup; this pass fixes the remaining gaps without adding another scoring or activity-write path.

## Changes

| Request | Current result |
| --- | --- |
| Activity duration, distance and time pickers | Native duration/distance wheels and system date/time controls. Distance has whole/tenths columns. Cancel preserves the previous value; Done commits. The web adapter uses number/date/time inputs. Existing manual-entry validation remains authoritative. |
| Dropdown overlays | Short iOS choices use ActionSheetIOS. Other choices open a modal list over their parent rather than expanding the parent sheet. Long lists are virtualized. |
| Header effort container and progress label | Bounded width, larger meter, remaining volume inside the meter on both platforms. Primary sport still determines the main score track. |
| Weekly flame | Consecutive Eastern Monday–Monday weeks with at least one eligible counted session in any sport. Manual activity counts. Future, excluded, pending, calibration/sample and zero-volume rows do not. Until activity occurs this week, the prior streak is dimmed; a missed complete week resets it. Freeze affects settlement, not activity streaks. No new persisted scoring state. |
| Fixed event track, Past You, results and event boundaries | Already present in this checkout: Running/Cycling use GPS Tracked; Walking/Strength use Open; Past You is unranked and always available; both results stages must complete; events have dividers. Preserved. |
| Native 3D availability | Current source exposes the native SVG portrait option as “3D field”; it does not require WebGL or the old WebView deployment. The prior audit observed an installed simulator bundle with outdated controls. Native bundle export passes, but this pass does not establish which bundle is installed on the owner's device. |
| Field performance | Native retains the mounted 2D field and its scroll anchor but skips prop updates while hidden. Web decorative wake animation runs during expanded exploration rather than repainting the ordinary field at 30 Hz. Regression coverage checks idle/stopped frame scheduling. This is not a measured tenfold device loading improvement. |
| Shaky native portrait swipes | The native driver now owns compensation for the scroll view's horizontal movement. JS updates perspective geometry without asynchronously moving the SVG container back against native scrolling. Device frame-time verification remains necessary. |
| Default lane zoom | Shared geometry now exposes about five lanes at default zoom. Longitudinal distance, athlete totals and capsule distance scale remain unchanged. |
| Place/next-rival status | Plain text row above the 2D/portrait field, with no background bar. |
| Competition dates | White bordered container restored on both platforms. |
| Crew shared start | Native date/time controls replace manual text entry; existing Eastern/DST validation remains in place. Web already uses date/time inputs. |
| Crew members | Native Crew card opens `/crew-members` in the root stack, covering shell header/tabs with normal rightward push/Back behavior. Uses the existing authorized roster. Field-update notices do not interrupt this detail screen. |
| Preferences and Athlete options | Active Sports label, sport SVG icons, icons on Athlete settings destinations, white bordered sport rows and visible off-state switches. |
| Level badges | Distinct level symbols appear beside Compete names and Crew standings when an actual score is available. Unknown scores do not fabricate a level. |
| Chart track toggles | Open/GPS Tracked history lenses restored locally to the effort chart, scoped to account/sport. Changing the chart does not change the primary-sport header or competition track. |
| Light iOS tabs | App appearance is light; the native tab bar explicitly uses the light material and white background. Standalone binaries need updated native configuration. |
| Synthetic account eligibility | Product feature gates, tracker actions, profile photos, notification setup and account load/save use backend availability/session rather than the legacy demo mode label. Authenticated synthetic accounts use the same routes and membership rules. Only unconfigured offline previews seed local fixtures. Calibration/sample activity remains separately excluded from competition. |

## Database rollout and authorization

Apply `20261023154755_crew_member_effort_scores.sql` before deploying Crew level badges. It adds one membership-scoped read for both existing ledgers, uses `search_path = ''`, checks `auth.uid()`, limits peers to active shared Crew membership, revokes PUBLIC/anon execution and grants authenticated execution. It does not change rating writes or profile/RLS policies. The API selects the Crew sport's fixed track and hides unavailable badge data if the migration is not present.

`supabase/tests/crew-member-effort-scores.sql` covers active membership, removed members, outsiders and unauthenticated callers with rolled-back fixtures. It has not been executed: no disposable local PostgreSQL/Docker service is available. The connected Supabase account does not list Fitness Battle, so this pass cannot establish the deployed project's migration status. No production migration or account change was performed.

## Secondary-content audit

| Area | Recommendation | Reason |
| --- | --- | --- |
| Home | Keep the chart and latest activity simple. Retain the visual rival card and existing dedicated week destination. | These already provide hierarchy without fragmenting routine logging. |
| Compete | Retain the complementary Coming soon / Beyond this week cards. Keep event navigation and the field consistent. | Secondary options can vary in size without making standings harder to compare. |
| Progress | Next candidate: compact records and achievement previews opening dedicated detail screens. Keep range controls with their charts. | The overview currently exposes multiple inspection controls; full history benefits from more room. |
| Crew | Members is now a stack destination. Next candidate: one upcoming-start preview opening session/RSVP detail when the list grows. | Member and session detail deserve space; a single short RSVP status does not need another screen. |
| Athlete | Keep the icon navigation rows and full-screen settings. | Utility pages benefit from predictable structure more than decorative card variation. |

Avoid changing all cards at once. Prioritize records/achievement detail and long Crew session lists; reuse existing real data and navigation. This audit does not introduce a broader visual redesign or invent new metrics, rewards or notifications.

## Verification

- Full workspace typecheck and test suite are recorded after final changes below.
- iOS Metro/Hermes bundle export passes. This checks native imports and compilation, not on-device picker presentation or swipe frame times.
- Browser smoke check: bounded effort meter/flame, five-lane field, date container, portrait controls and the independent chart lens. Switching Open history changed its displayed score while the header retained GPS Tracked.
- The normal production web build was attempted twice; Google Fonts downloads failed, including the network-enabled retry. No fonts or build checks were disabled.
- Native simulator visual testing, SQL fixture execution and measured before/after device timings remain unperformed.

### Final local checks

`pnpm typecheck` passed. `pnpm test` passed 753 tests (5 existing skips): rankings 16, shared 352, pursuit 2, native 112 and web 271. Added coverage includes Eastern/DST streak boundaries, default five-lane geometry, synthetic account load/save and tracker eligibility, Members stack navigation, picker cancellation/decimal/time commits and idle wake-clock cleanup. Browser inspection also confirmed Active Sports icons and off-state contrast.

The final source was exported again to an iOS Hermes bundle successfully after the chart changes. A booted iPhone simulator exists, but the computer-use surface could not access Simulator; no native visual pass is claimed.

## PR-stack follow-up

Rebased onto `origin/main` at `acfda40`, preserving the merged field-header controls, Progress detail routes, activity sport icons and Crew settings simplification. Each cleanup PR boundary passed `pnpm typecheck` and `pnpm test`: foundations 755 tests; fields/Crew 756; Home/Athlete 756, all with the same 5 existing skips.

The Google Fonts build failure is addressed by vendoring the existing families and licenses and using `next/font/local` for both product and study routes. Assets are compressed to WOFF2 without changing CSS variable names. The normal production build is rerun without mocked font responses or network exemptions.

### Completed native and font-build validation

The normal production `pnpm build` passed with the checked-in WOFF2 fonts, no font mocks and no network exception. No product/design TypeScript or CSS source still references Google Fonts endpoints or `next/font/google`.

Generated the ignored iOS project, installed pods, and ran a complete Xcode Release Simulator build with Xcode 27.1 / iOS 27.1 SDK:

```sh
xcodebuild -workspace apps/mobile/ios/Overtaek.xcworkspace -scheme Overtaek \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /private/tmp/fitness-stack-ios-build \
  CODE_SIGNING_ALLOWED=NO build
```

The command exited 0 with `BUILD SUCCEEDED`. `Overtaek.app/Overtaek` is a universal arm64/x86_64 Simulator executable and `main.jsbundle` is present. This validates native module compilation, linking and Release JavaScript bundling, including both picker packages. It is not a signed device/App Store build or an interactive Simulator UI test.

Review/merge order: [#303 Foundations](https://github.com/jerryliu3/fitness-battle/pull/303), [#304 Fields/Crew](https://github.com/jerryliu3/fitness-battle/pull/304), [#305 Home/Athlete](https://github.com/jerryliu3/fitness-battle/pull/305), [#306 Offline fonts](https://github.com/jerryliu3/fitness-battle/pull/306). CI Typecheck & Test passed on all four runtime commits. No local/production SQL migration was applied; the local Docker daemon remains unavailable.
