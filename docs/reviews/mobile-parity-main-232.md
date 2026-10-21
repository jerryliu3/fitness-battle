# Mobile alignment through PR #232

Follow-up verification completed October 21, 2026.

Rebased the saved mobile work from `23ce59d` onto `origin/main` at `709d1cc` (merged #232). Resolved overlapping implementations in favor of main's newer domain behavior, then compared the mobile screens with current web source and the deployed web Home.

## Changes

| Surface | Alignment |
| --- | --- |
| Shell | Home / Compete / Progress / Crew tabs. A persistent header opens Athlete settings, with the saved avatar or canonical Ember. Header owns the top safe area so secondary screens do not double-pad it. |
| Athlete | Profile and settings live at `/athlete`; dedicated stack screens preserve normal Back and the parent overview. Profile drafts support cancel. Account holds sign out, issue reporting and account deletion. Existing tracker/settings links through `/you` redirect to Athlete; `/athlete-progress` redirects to Progress. |
| Progress | Lifetime totals include overtakes. Open/GPS effort chart, weekly distance/effort/place, benchmarks, and season history with sport and track filters. Profile settings no longer occupy this tab. |
| Home | Full-width hours chart with Sync and Manual actions in the header. Today opens a native sheet, retaining the journey. Existing grouped activity days and individual session soft deletion remain supported. |
| Compete | A reusable field renders every registered sport, with independent view/selection/zoom state and a global score lens. Standings displays full totals, effort scores and compact capsule heads. Lanes retains relative distances. Shared competition dates follow the enrolled event window. |
| Controls | Retained grouped selectors and quiet secondary actions. Removed the old sport picker, Center/Fit actions, redundant viewport caption, and disabled 1v1 button. Zoom and past-self controls only appear in lanes. Registration has a single entry below the fields. |
| Crew | Keep main's automatic shared progress, simplified standings, membership/rest/leave flows and confirmation. Crew members and actions have separate press targets. Existing demo crew pins can render read-only member totals; empty states do not invent a crew goal. Writes remain live-account-only. |
| Data Sync | Linked tracker Sync/Disconnect controls share their provider row instead of repeating entire provider cards below it. Existing upload, calibration and sample disclosures remain. |
| Maintenance | Split competition field behavior from registration/screen composition and split Progress from Athlete. Reused shared scoring, field, period, rank and journey models. Retained account lifecycle fixes from main. Updated one stale web test that still required a Center action removed by #232; web product code is unchanged. |

## Verification

Browser testing uses a locally stored disposable demo account, not a live service account. Initial interaction checks used Expo's development preview at 390px; final checks use the normal static production export at phone widths. The deployed web reference was inspected read-only.

Verified flows include header → Athlete, setup with Running and Cycling, independent field view controls, score switching, manual activity entry, multiple sessions on one activity day, and soft deletion of one test session while retaining the other. Final verification results and remaining limitations are recorded below.

- Workspace `pnpm typecheck` passed. Full workspace tests passed: shared 263, rankings 16, pursuit 2, mobile 80 and web 220; five database-dependent web seed tests skipped.
- `pnpm build:web` passed.
- Normal Expo static web and iOS/Android JavaScript/Hermes exports passed after the final code changes.
- Production preview checked at 390×844 and 320×740: Home chart/actions, Compete lanes/standings and full totals, profile/settings destinations and narrow profile layout. Home had no page-level horizontal overflow at 320px.
- Exercised a seeded Alice demo as well as a fresh local account: populated totals, verified season history through Both tracks, read-only crew membership, sign-out/account switching, profile draft/cancel, and unit/event settings. No live account, tracker, crew, notification or report writes were performed.
- Found and fixed an activity-notice redirect that interrupted the new Athlete settings routes. Five lifecycle regressions cover those destinations; the production browser confirms unit and sport changes stay in Preferences.
- Removed a duplicate empty-crew call to action found during browser review; its regression requires exactly one entry heading.
- Screenshots `mobile-main-home.png`, `mobile-main-athlete.png`, `mobile-main-compete.png` and `mobile-main-progress.png` are saved with the chat artifacts.

To reproduce the final export:

```sh
pnpm --filter @fitness-battle/mobile exec expo export --platform web --platform ios --platform android --output-dir /private/tmp/fitness-mobile-main-parity-export
```

Native layout, keyboard, gestures, permissions, real tracker OAuth, live crew writes, push delivery and photo upload require an installed development build. Xcode now reports iOS 26.5, 27.0 and 27.1 runtimes; none was booted for this pass. No native application binary was installed or tested. JavaScript/Hermes exports establish bundling only. Native fullscreen/pinch and racer-to-standings choreography remain deliberate follow-ups; the retained lane instance preserves its browsing state.
