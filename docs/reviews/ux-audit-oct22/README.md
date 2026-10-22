# Everyday Club UX audit — October 22

Scope: the complete Everyday Club stack through #275, web and actual iPhone 17 Pro / iOS 26.5 native app. Prioritize direct interaction and visual checks; the owner explicitly waived expensive suites, typechecks and builds for this pass. Small pure-model/renderer checks support the changed behavior. Demo activity stays on this device; no production account, live tracker or health permission is changed.

## Findings and first-pass fixes

| Finding | Fix | Local evidence |
| --- | --- | --- |
| Past-self could be hidden and disappeared in perspective | Always show available past-self, never rank it; remove checkbox/switch | Native 2D/3D inspected, web checkbox absent |
| Perspective plane had a hard edge | Extended empty ground clipped to curved horizon, atmospheric blend | Native visual inspection |
| Portraits lacked clear ground position | Neon trail and elliptical position ring per athlete; dashed past-self | Native screenshot |
| Native lane buttons were the only reliable navigation | Real nested horizontal ScrollView with continuous projection; vertical page scroll retained | Drag changed visible athletes from Carla/Alice to Noah/Ava; event stayed Running, then Your lane restored Alice |
| 2D ruler overcrowded at wide zoom | Adaptive nice-number spacing, at most five distance marks | Web End key at widest range: 0, 10, 20, 30 miles |
| Earned traces faded across the viewport rather than distance | Fixed 1.5 distance-unit ramp, then stable 90% opacity back to start | Shared scene checks |
| Native board redrew decorative SVG continuously while idle | Wake clock runs during explicit Explore; static earned traces stay visible at rest | Native navigation/inspection responsive after change |

## Interaction ledger (updated with each follow-up)

- Native Home → latest activity → impact disclosure → Close returns Home: pass.
- Native Home → Compete, 2D → 3D → Standings: pass; place stays 3 / 8.
- Native perspective: direct lane drag, edge bounds, Your lane, zoom, always-visible past-self: pass.
- Native chooser → Cycling: selected; further carousel/registration checks in final sweep.
- Web: default 2D, past-self without checkbox, keyboard zoom, sparse ruler, 3D selection: pass.
- Progress, Crew, sync recap, secondary destinations and second sweep: recorded in subsequent stack entries below.

Field evidence: [native perspective](ios-field.jpg), [native direct swipe](ios-lane-swipe.jpg).

## Progress pass

- Fixed chart columns proportionally on web and native. Actual web layout measured 33.3px bars in 85.3px columns, rather than fixed 12px bars. Desktop chart height grows with available space.
- Personal records connect only real improving achievements, end at the last actual date, and show one centered point for a single record. Slower/future attempts are not chart milestones. Web inspected the Sep 23 single record without an Oct 22 extension; native 5K/10K switching retained the correct Sep 23 / Oct 13 milestones.
- Found another inconsistency: native lifetime totals showed 21 sessions while achievements correctly showed 18 because lifetime totals included future sessions. Both platforms now use one shared available-lifetime summary, excluding future/excluded activity.
- Native: Week → Month → Year → Week, Previous week (Oct 12–18), future Nov/Dec disabled, achievement list → detail → Close, 5K → 10K, and Effort score: exercised. Closing achievements retained the selected prior week.
- Web: previous-week dates/totals, single-record geometry, proportion measurement and screenshot: exercised.
- Focused PR chart/model checks pass; full suites/typecheck/build intentionally skipped.

Screens: [native Progress](ios-progress.jpg), [web Progress](web-progress.jpg).

## Crew pass — actual product verification

The missing finish was reproducible: volume crews with unavailable prior-week history had no finish at all. The visual now labels the existing configured distance goal separately from last-week history, for all distance crews. A positive prior-week baseline remains the fallback when there is no configured goal. Unknown values remain unknown; no fake prior-week data or backend target write is introduced.

The shared track is 250px tall with member portraits/initials on the visual, linked to their real contribution segments. A large checkered finish, numeric target, remaining runway and over-goal contributions use the same portable scene on both platforms. Many-member visuals scroll horizontally instead of compressing targets.

- Actual web and native Weekday miles: 50.0 mi together, target 37.3 mi, 12.7 mi beyond target. Both visibly show the finish inside the contributed distance and unfilled runway beyond the crew. Screens captured below.
- Native and web: tapped Bob's on-track marker; selection and receipt changed to 3.7 mi / 7.5% while crew totals and goal stayed fixed.
- Removed the separate shelf of member cards. Member information remains directly accessible and keyboard/tap selectable.
- Visual inspection found and fixed a web inline-SVG baseline causing both scrollbars (final client/scroll width 553/553; height 250/250) and duplicate native SVG child keys.
- Seven focused shared goal/scene checks and four web rendering checks pass, covering below/at/over-goal and absent-baseline states. Full validation intentionally skipped.

Screens: [actual native Crew](ios-crew.jpg), [actual web Crew](web-crew.jpg).


## Today-only sync confirmation

Newly changed, eligible activities from the current Eastern day appear together in an optional global receipt. Older activity, sleep and readiness apply immediately through the existing reducer. Confirmation applies the held presentation and opens the matching registered event; skip/close applies without navigation. Historical imports seed field baselines quietly, preventing a backlog of old overtake reveals. Server ingest remains durable before this local presentation step.

The queue is memory-only, account-scoped and once-only. Refresh cannot overwrite a pending receipt. Switching accounts discards its UI; a day rollover applies it quietly. Home multi-provider sync batches one receipt. Demo samples remain explicit previews with no new score writes; Data Sync has a demo-only preview for inspection.

- Actual iOS: full right swipe closes the preview; short swipe resets to 0%; Close preview returns Data Sync. An early scroll-based implementation failed the real gesture check and was replaced with an explicitly claimed native responder. The button and accessibility action provide equivalent confirmation.
- Actual web: receipt heading receives focus; keyboard End on the slider confirms and dismisses it. Closing/skip remains available.
- Focused checks: five pure sync plans (including Eastern midnight, deduplication, sample generation and exact split/final-state equivalence), two account/batch hook checks and one native confirmation check pass.
- Live OAuth, provider imports and HealthKit permissions were not exercised. Their existing ingestion remains authoritative; local demo previews do not claim live connectivity. Android hardware was unavailable.

Screens: [native sync preview](ios-sync-recap.jpg), [web sync preview](web-sync-recap.jpg).
