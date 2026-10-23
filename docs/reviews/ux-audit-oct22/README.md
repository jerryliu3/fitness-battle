# Everyday Club UX audit — October 22

Scope: the complete Everyday Club stack, with follow-ups 15–19 stacked above #275, web and actual iPhone 17 Pro / iOS 26.5 native app. Prioritize direct interaction and visual checks; the owner explicitly waived expensive suites, typechecks and builds for this pass. Small pure-model/renderer checks support the changed behavior. Demo activity stays on this device; no production account, live tracker or health permission is changed.

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
- Progress, Crew, sync recap, secondary destinations and second sweep: recorded below.

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


## Second audit sweep and additional fixes

The second pass deliberately revisited the main journeys after the first fixes and exercised secondary navigation. Findings below are fixed in follow-up 19.

| Additional issue | Applied fix and recheck |
| --- | --- |
| Nested native horizontal event paging trapped vertical gestures on the field | Keep one horizontal lane ScrollView. Switch event by swiping the title, choosing it, arrows or dots; render only its content. Actual final native vertical drags scrolled the page in both directions, horizontal field drag exposed Noah/Ava while Running stayed selected, and Your lane restored Alice. |
| Native chooser → registration closed both sheets | Added an optional sheet-closed callback; wait for the native iOS dismissal before opening registration. Opened, closed and repeated the exact chooser → Register journey; the registration sheet appeared both times with existing registrations disabled. |
| White status text disappeared against the bright 3D sky | Dark inset status plate on both platforms; actual native screenshot and web computed background `rgba(16,46,56,.93)` confirmed. |
| 2D place overlay covered the lane's ordinal header | Reserved clearance between status and lane labels on both platforms; native inspection showed the label below the plate; web measurement confirmed 31.7px clearance at desktop and 390px widths. |
| Native replay Close results sat underneath the notch | Modal gets its own safe-area provider. Actual replay screenshot showed Close results fully below the status bar; receipt → Next round → Back to Compete worked. |
| Native result button hid all result data from accessibility | Label now reads dates, lens, place/field size, volume, before/after score and signed delta. Actual AX tree confirmed the complete summary. |
| Demo trackers claimed Connected/Syncing | Both settings screens explicitly say Demo · sample data; real stubs retain sample evidence labels. Sample sleep action now says Add sample night. |
| Scoring guide promised score never decreases | Copy matches the existing Elo model: weekly movement may be signed; inactive weeks decay; earned milestone receipts persist. Freeze holds the weekly adjustment. No scoring implementation changed. |
| Home claimed no settled recap while GPS results existed | Latest closed result now falls back to GPS, preferring Open for the same primary-sport round. The card labels its lens and actual latest week. Actual Home on web/native showed the GPS recap instead of the empty state. |
| Small web sync controls, singular-session grammar | Minimum 44px targets verified by rendered button measurement; training labels use session/sessions correctly on both platforms. |

### Final interaction matrix

| Journey | iOS native | Web |
| --- | --- | --- |
| Home summary → activity receipt → impact disclosure → close | Exercised; blank manual form also rejected with duration guidance; remove → Keep session canceled safely | Home/Compete cross-links and existing summary inspected |
| Compete event switch and chooser | Header left/right swipes changed Running ↔ Cycling; accessible chooser and registration handoff exercised | Next event changed Running → Cycling; existing chooser inspected |
| 2D/Standings/3D, past-self and field controls | All three views exercised; past-self always present in field; direct final lane drag and Your lane; zoom | Default 2D, three view tabs, Enter on lane controls, zoom and adaptive ruler exercised |
| Training Week/Month/Year, previous period, future disable | First pass exercised all ranges and prior week; selected period survived achievement dismissal | Desktop plus actual 390px CSS layout, ranges and disabled future navigation checked |
| Personal records | 5K/10K and actual end date checked | Single Sep 23 milestone has no synthetic extension |
| History and weekly reveal | All sports/Both filters, latest replay, receipt flip, next-round and return exercised | Both exposed two GPS weeks after the expected empty Open filter |
| Crew shared week and members | Target/finish/overflow verified; Bob selection and members sheet exercised | Keyboard Enter selected Bob and updated 3.7 mi/7.5% receipt; finish and runway inspected |
| Start Line schedule | Form opened and empty submission retained the form; no invitation or session was sent | Empty submission showed Give the session a name; Escape dismissed the sheet |
| Sync confirmation | Full swipe, short reset, Close preview and Finish preview exercised | Focused heading, End-key confirmation and dismissal, including narrow screen |
| Athlete settings | Data Sync labels, Metric → Imperial restoration, scoring, Notifications and Account visited; no OS permission or destructive action invoked | Data Sync targets measured 44px; narrow layout and explicit sample status checked |

Responsive web checks measured the actual DOM width rather than assuming the browser viewport override: 390px and the host's minimum 342px CSS width, plus normal desktop. Crew and Data Sync had no document overflow at the checked widths; the 390px training bars measured 14px in 39px columns. Temporary viewport overrides were reset. Desktop charts were also measured in the first pass (33px bars / 85px columns).

The existing persistence path was reviewed read-only with the Supabase skill: activity and readiness saves are upsert-only, and account loading hydrates relational activities, so a receipt does not delete server-ingested work. No database, RLS, auth or provider implementation changed in this audit. Live sync/OAuth and permissions still require testing with a real account/device; Android hardware was unavailable. Full suites/typecheck/build remain intentionally skipped. Focused native event-swipe/modal-handoff and portrait-control checks plus a latest-recap fallback check support the final fixes.

Navigation inventory, overlap findings and prioritized grouping recommendations: [navigation audit](navigation-audit.md). No primary destination was consolidated or removed.

Final evidence: [native field after second sweep](ios-field-final.jpg), [web Home with repaired recap](web-home-final.jpg). Earlier progress, Crew and sync screenshots remain linked above.

## CI follow-up

After the owner requested repairs to the failing PR checks, full local `pnpm typecheck` and `pnpm test` were run successfully. The original audit's full-validation waiver above describes that earlier pass.

The capsule raster test now measures the local head bounds, preserving visibility/size assertions without counting the intentionally solid earned trail as head pixels. Native interaction coverage now opens the accessible event-title control and verifies that registration waits for the chooser's closed callback. A fixed fixture clock and an activity timestamp before the exclusive current-time boundary remove a timing race in the animation check. These are test corrections; product behavior is unchanged. The shared fixes were committed to #276 and propagated through #277–280 with normal merges, preserving published history.
