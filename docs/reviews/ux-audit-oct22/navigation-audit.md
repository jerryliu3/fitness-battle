# Navigation and grouping audit — October 22

This is an evaluation of the shipped stack, not a navigation reorganization. Findings come from source inventory and hands-on web/iOS journeys, not a user research study. Keep the four primary destinations: Home, Compete, Progress and Crew. Athlete settings remain behind the profile entry.

| Area | Current surfaces and overlap | Recommended grouping for a later change |
| --- | --- | --- |
| Home (`/today`) | Weekly summary, rival chase, latest activity, week recap, activity journey; links into Compete and Progress | Keep an action-oriented landing screen. Reuse the same activity receipt and week receipt from every entry instead of adding separate detail pages. |
| Compete (`/arena`) | Event carousel and chooser; Open/GPS lens; 2D/Standings/3D representations; ground picker; latest results; all-time benchmarks | The event is the object, the score lens is its scope, and 2D/Standings/3D are views of it. Keep those levels visually distinct. Put ground customization behind the field control. Keep 2D default. Do not add a separate sport picker inside the board. |
| Progress (`/you`) | Overview contains Training atlas, achievements, personal records and week recap. Effort score has sport/score history. History has week chapters and awards. | These three sections are defensible. Consider a single Records area for personal records and all-time benchmarks; currently the public benchmark entry is under Compete while personal bests are under Progress. Preserve the distinction between personal training records and public race rankings. |
| Past results | Progress History expands a result inline; Latest results navigates to a Compete takeover | Prefer inline inspection from History; use the takeover for the deliberate weekly reveal. A later change should preserve the originating screen when closing a replay, rather than always returning to Compete. |
| Crew (`/field`) | Crew carousel, shared week, individual competition field, members/settings and Start Line scheduling | Keep Shared week (cooperative contribution) distinct from the ranked crew field. Member markers now belong on the shared visual. Keep scheduling secondary, with no social-feed destination. |
| Athlete (`/athlete`) | Profile, Data Sync, Preferences, Notifications, scoring guide and Account | Keep account/connection controls here. Preferences currently mixes units, sport renewal and freezes. A later change should group renewal/freezes under Competition settings, with event registration still owned by Compete. Keep the primary-sport preference separate from selecting the currently viewed event. |
| Sync recap | Global today-only receipt after a sync; confirm/skip routes onward | Keep this transient and optional. Do not create a permanent backlog tab. Older sync history belongs in existing Progress/activity views. |
| Legacy/debug surfaces | `/athlete-progress`, `/athlete-settings`, `/settings`, benchmarks and design/structure studies | Retain compatibility redirects but avoid exposing competing labels for the same destination. Design studies are not product navigation. |

## Priorities

1. Clarify Compete's control hierarchy before adding another lens or map mode. The second pass verified that lane exploration stays inside an event; the native event header now also swipes so switching events has a reliable gesture surface outside the interactive board.
2. Unify Records/benchmarks entry points and result replay return behavior. These are the clearest repeated tasks across tabs; neither requires another primary destination.
3. Split competition preferences from device/account preferences once the next settings pass is approved. Do not move registration or freezes during this audit.
4. Keep Crew scheduling and account-specific management secondary. Do not turn the shared-week visual into a feed.

## Changes applied during this audit

These repair existing interactions rather than reorganizing navigation: explicit native event-header swipe and accessible chooser; chooser-to-registration waits for modal dismissal; readable field status over scenery; clearance above 2D lane headers; result replay respects the native safe area and reads its result summary to assistive technology; Data Sync has 44px web targets and explicit sample labels. No primary route or section was removed or consolidated.
