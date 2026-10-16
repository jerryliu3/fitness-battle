# Fitness Battle / Overtaek — product overview and requirements inventory

Reviewed October 16, 2026 against the current checkout. This is a user-facing product inventory and proposed organization, not confirmation that deployed services or device integrations have been tested. Current screen code takes precedence over older README descriptions and unchecked rebuild-plan tasks.

## Product purpose

Turn everyday training into visible progress: see what to do today, watch counted activity move you along a weekly track, compare with your past self and a field, participate with friends, and build a history of results.

The recurring loop is: connect a source → bring in activity → count eligible sessions → see progress in Arena → finish a week → receive a result and rating change → return for the next week. Today gives the loop a daily entry point; Field adds social participation; You holds identity and long-term progress.

Supported sports are running, cycling, walking, and strength. Sleep is a separate experimental health competition. Training effort, training pace benchmarks, and published race results are distinct comparisons.

## How to read status

- **Available:** connected to the current UI in source; production readiness is not implied.
- **Conditional:** available only with account/service configuration or a compatible device build.
- **Demo:** synthetic/sample/local practice behavior, not a live human competition or verified tracker connection.
- **Disconnected:** underlying component or model exists, but no entry point was found in the current main-tab flow.
- **Proposed:** a recommended requirement or placement; not an existing commitment.

## Navigation at a glance

| Area | User question | Current contents |
| --- | --- | --- |
| Today | What should I do, and what have I done? | Winding checkpoints, counted-session receipts, today's suggestion |
| Arena | How am I progressing and comparing? | Weekly track, comparison with past self, replay; web adds 3D and standings |
| Field | Who am I doing this with? | Join competition, private crews, practice matchups |
| You | Who am I, and how am I progressing over time? | Profile, rating, week awards, connections; web has additional history/settings |
| Setup / account | How do I get started? | Web login/signup and onboarding; mobile account form in You |
| Pace | How do my training times compare? | Secondary web page linked from You |
| Race rankings | What are the fastest published race times? | Separate public web area |
| Design lab | What experiences are being explored? | Prototypes, not additional shipped product tabs |

Both frontends now contain the four-tab shell. The older My track / The field / Splits / Athlete descriptions do not represent the current navigation. `/` opens Today; `/board` redirects to Arena; `/progress` redirects to You; `/splits` redirects to Today.

## 1. Today

### A. Checkpoint route — available on web and mobile

Users see a winding path with past counted-session nodes, a mascot on today's node, and blank future nodes. Past nodes open a receipt sheet; today's node opens the suggestion and its explanation. Future nodes do not open actionable sessions.

This is the daily orientation screen. It currently offers a compact summary and detail sheets, rather than a full activity-management screen.

### B. Today's suggestion — available, rule-based

Users see a suggested session or rest action, an estimated duration when applicable, and a reason in the detail sheet. The shared suggestion model exists. This is not evidence of a complete personalized coaching program or an AI coach.

### C. Activity inbox and counting — disconnected / proposed placement

The shared engine supports activity dispositions, and the older activity-splits component can show counted sessions with source, volume, effort, verification, and heart-rate detail. Neither is wired into the current Today screen as a review workflow. Garmin imports explicitly remain pending until counted, making the missing entry point consequential.

**Proposed:** put an Activities section or sheet under Today, with Pending and Counted views. Users should be able to open an imported activity, understand its source and eligibility, count or exclude it, and see the resulting track update. Preserve the checkpoint route above it.

### D. Lessons — disconnected

Lesson scheduling and completion behavior exist in shared code; a prototype uses completion. The current Today screen does not expose a lesson-completion flow. Decide whether lessons remain part of the product before restoring them.

### Completion criteria

- A newly received pending activity can be found and reviewed without leaving the main product.
- Counting it updates the checkpoint history and Arena once, without duplicate credit.
- Suggestions distinguish recorded facts, sample data, and advice.
- Empty days and rest days remain useful without fabricated progress.

## 2. Arena

### A. Weekly participation — available

Users can join the primary sport's track. On web, participation requires sign-in and completed onboarding. Mobile currently permits local opt-in; account gating is not equivalent across platforms.

### B. Progress and past-self comparison — available on both platforms

Users see their current volume/points and, when available, their difference from a prior equivalent period at the same cutoff. Past you can be shown or hidden and is not ranked as a competitor. There is an explicit no-history state.

The comparison defaults to the previous week. More flexible historical bounds exist in the underlying model, but there is no full comparison-period picker in the current tabs.

### C. 2D track and replay — available on both platforms

Users can compare lanes, select an athlete for detail, and inspect progress at earlier cutoffs. Web has a continuous rewind slider and checkpoint buttons; mobile uses cutoff buttons. Web also includes a selectable standings roster.

The track visualizes accumulated activity, not live GPS positions. Other athletes' intermediate positions can be distributed from totals, so replay should not be presented as a precise reconstruction of their workouts.

### D. 3D Pursuit — available on web only

Users can switch from lanes to 3D, choose Follow / Above / Avatar camera views, select a runner, and customize kit color, skin tone, and hair/headwear. The UI falls back to 2D when 3D is unavailable. The current look controls are view-local state, not a demonstrated saved avatar profile.

### E. What-if preview — available on web only

Users can preview an additional amount of distance/points and see the comparative effect, then reset the preview. This does not record a workout or change earned results.

### F. Return with new progress — partial

Mobile has logic to detect previously unseen counted sessions on opening/foregrounding, route to Arena, show the new-session count, and continue to Today. It observes local state; it is not proof of background provider sync. Equivalent arrival behavior was not found in the current web shell.

### G. Week-complete result — disconnected presentation

Settlement and historical results exist, and a dedicated week-reveal component remains in source, but that component is not mounted in the current main screens. Awards/history do show settled results. The one-time celebration/receipt needs reconnecting.

### Completion criteria

- Track totals reconcile with counted activity and clearly identify units.
- Past-self overlays use equivalent elapsed windows and never occupy a ranked place.
- Synthetic competitors are distinguishable from real participants.
- New-progress arrival and week-complete receipts work predictably on both platforms.
- 3D failure, reduced motion, and empty history have usable alternatives.

## 3. Field

### A. Join a weekly field — available, currently synthetic matching

Users can join a sport's field. The standard field is a small density group, described as eight people. Regular peers are generated for the viewer; this is not a production pool of live matched athletes or a universal leaderboard.

Mobile also exposes other sports for opt-in or switching primary sport. Web currently places primary-sport selection in You.

### B. Join together with a crew — conditional, web

When eligible crews are available, web users can join alone or choose a crew's shared individual field. Each member opts in independently. A crew board can include synthetic fillers. Group approval and team-versus-team scoring are not built.

An existing switch component supports moving on/off a crew board, but it is not mounted in the current Field screen. Joining a crew after already joining the week therefore needs a clearer route into shared participation.

### C. Private crews — conditional, fuller on web

Web users can:

- Create a crew and distribute its invite code.
- Join a crew using a code.
- Choose same-sport volume, individual three-session targets, or cooperative distance format.
- View members, session counts, target status, crew distance, and weeks with shared activity.
- Share this week's counted sessions with the crew.
- Cheer another member's shared activity.
- Mark a rest week. This is separate from a rating freeze.

The current UI offers limited target configuration and simple progress summaries, not a complete crew administration product. Demo mode does not deliver invitations.

Mobile currently has an invite-code join sheet, rather than the full creation/roster/share/cheer interface. Its join request does not attach the mobile account's Bearer token in this screen, so authenticated joining needs repair and validation.

### D. Practice 1v1 — demo

Users can start a practice matchup and compare effort totals. Web also has a named-rival invite control. These actions create synthetic practice rivals, not a delivered challenge to another real person. Live invitation acceptance, real-user matching, and live duels remain deferred.

### Completion criteria

- Mobile crew actions use the signed-in identity and show a durable joined state.
- Crew membership and competing on the crew field are explained as separate choices.
- Users can reach shared-field participation after joining either the crew or the week first.
- Real invitations require delivery, acceptance, lifecycle states, and real participant scores before being described as live.

## 4. You

### A. Identity and profile — available on both platforms

Users can see identity, rating, and rank, and edit their display name and city. Mobile includes sign-in/create-account forms here when signed out and account details/sign-out when signed in. Web uses dedicated login/signup pages and gates You behind account access.

### B. Week awards — available on both platforms

Settled weeks produce cards showing sport, place, week, effort, and rating change. Empty state: no awards yet. These are computed result cards, not a separate collectible or XP system.

### C. Performance history — available on web; mobile incomplete

Web additionally exposes an athlete summary, week records, and season history with open/verified result tracks. Historical results are capped at 104 rows. Mobile's current You screen has the award shelf but not equivalent detailed history and records sections.

### D. Sports, ratings, and freezes — available on web

Users can select a primary sport, inspect open/verified ratings and level bands, and spend one of three starting week freezes. A freeze protects rating for the week; it does not represent a crew rest flag or pause lesson scheduling. Ratings start at 1000, have an inactivity-decay rule, and cannot fall below 500.

The current main Arena uses the open board. Having verified ratings in the model/profile does not mean there is a complete verified-board navigation flow.

### E. Tracker connections — conditional on both platforms

| Source | User capability | Current limit |
| --- | --- | --- |
| Strava | Connect cloud account and sync activity | Keys, live mode, and account required; otherwise stub |
| Garmin | Cloud connection/sync; web FIT/GPX/TCX/ZIP import | Cloud access needs credentials/approval; files can work without approval |
| Apple Health | Sync device workouts on iOS | Compatible native build required; unavailable from web or Expo Go |
| Health Connect | Sync device workouts on Android | Compatible native build required; unavailable from web |
| WHOOP | Connect and sync workouts/readiness | Credentials required; no live sleep-night import yet |
| Oura | Connect and sync workouts/readiness | Credentials required; no live sleep-night import yet |

Web exposes disconnect controls and Garmin file upload. Mobile's current tracker rows focus on connection/device sync and do not match all web controls. A connection flow being coded is not proof that a provider is configured or operational in the deployed app.

### F. Calibration — demo on web

Onboarding and You offer a one-time 90-day light/steady/heavy sample-history calibration. It seeds an initial level and cannot be rerun. Sample history does not count as completed workouts. Real first-sync history retrieval exists separately; the calibration UI must not be described as verified historical analysis.

### G. Sleep — demo/experimental on web

Users can join a separate sleep board, add a sample night, inspect score/duration/stages, compare the latest night with a recent average, view weekly nights and standings, and leave. Sleep has its own results/rating logic. Current provider integrations do not supply real sleep nights, despite broader aspirational copy in the panel. It is not presently a live sleep-tracking feature.

### H. Settings — available, platform differences

- Web: theme choices, profile editing, notifications, sport preferences, freezes, calibration, connections, and sign-out are collected on You.
- Mobile: profile/account/connections/awards are on You; notifications open a separate Settings screen.
- Notification preferences cover week summaries, rival moves, lesson reminders, and connection alerts, with permission and test-send controls.
- Native push delivery has an Expo-backed path for configured device builds. Simulator/demo tokens are stubs. Web uses local browser notifications; background web push is not implemented.
- Web event triggers exist; notification infrastructure alone does not guarantee scheduled delivery while the app is closed.

### Completion criteria

- Account, profile, results, and tracker status remain consistent across devices.
- Settings have clear subsections instead of requiring users to scan one long profile page.
- Demo history and sleep are labeled at the point of use.
- Notification toggles accurately describe platform delivery limitations.

## 5. Outside the main tabs

### Account and onboarding

Web signup/login supports a return destination. Setup collects name, city, primary sport, optional sleep participation, optional Strava connection, and optional one-time calibration, then lets the user start competing. Mobile has account entry but no equivalent guided onboarding route in the current app tree. Password recovery/account deletion are not exposed in the inspected account flows.

### Training Pace — secondary web page

Running and cycling time benchmarks can be viewed by distance and Global / Local / Category scope. Your entry depends on suitable activity history; longer sessions are scaled to the selected distance. Peer times are synthetic. This comparison does not affect weekly effort rating.

### Public Race Rankings — separate web area

Distance boards cover 5K, 10K, half marathon, and marathon, with women's/men's tables showing athlete, finish time, clock type, race, and year. Data comes from imported published race results, separately from training competition. Import files existing in the repo does not guarantee they have been applied to the hosted database. Half-marathon coverage is still missing in the data-status inventory. Cross-event athlete identity merging is out of scope today.

### Design explorations

The `/design` family contains alternative brands, home concepts, spatial comparisons, and mascot studies. These are evaluation surfaces with sample interactions. They should not be counted as additional finished user capabilities.

## 6. Cross-cutting product requirements and gaps

| Topic | Current reality | Remaining requirement |
| --- | --- | --- |
| Account continuity | Web signed-in competition state is relational/account-backed; mobile competition store uses device AsyncStorage | Connect mobile to account load/save with safe account switching and error handling |
| Offline/demo use | Browser/phone can demonstrate local progress | Preserve honest provenance and avoid mixing one person's local state with another account |
| Weekly cycle | UTC Monday-to-Monday; settlement occurs on app access/save | Decide whether unattended settlement/notification needs server scheduling |
| Competition truth | Most field peers and practice rivals are synthetic | Real matching, shared authoritative standings, and density strategy remain product work |
| Activity trust | Open/verified tracks and dispositions exist | Restore visible review/counting and explain eligibility; do not equate a file import with verified activity |
| Recovery and failures | Web shows load/save errors, retry, and a legacy-history recovery offer | Equivalent mobile account recovery and save feedback |
| UI parity | Same four tab names, different feature depth | Deliberately port missing capabilities or document intentional platform differences |
| Rule extension | Period abstractions support more than weekly | Daily/monthly/custom competition controls are not current user-facing functionality |

## 7. Proposed placement and move map

These are recommendations for discussing changes, not changes already made to the application.

| Feature | Current location/state | Proposed destination | What should move |
| --- | --- | --- | --- |
| Activity review and counted list | Older unmounted components + engine | Today → Activities sheet | Source, eligibility, count/exclude controls, receipt |
| Daily suggestion and optional lesson | Suggestion sheet; lesson completion disconnected | Today → Today detail | Recommendation and explanation; restore lesson only if retained |
| 2D/3D, replay, ghost, standings | Arena; older names remain in source | Arena | Keep custom visualization and unify surrounding controls |
| Arrival and week-complete receipts | Mobile arrival; unmounted week reveal | Arena overlay | Progress/result receipt followed by return to Today |
| Joining, crews, real challenges | Field, uneven platform support | Field | Membership, join-alone/together, roster, invites and matchup lifecycle |
| Awards, records, season history | You, web richer | You → Progress | Long-term result views, rather than current-week track controls |
| Connections and Garmin import | You | You → Connections | Provider actions, last sync/status/errors, file import |
| Theme, notifications, freezes | Mixed into web You | You → Settings | Preferences and account controls; keep summary links on profile |
| Calibration | Onboarding + You | Onboarding; Connections until used | One-time setup with accurate sample/live labels |
| Pace | Secondary web route | You → Benchmarks | Keep separate from effort ranking |
| Public race rankings | Separate public area | Benchmarks link to Race Rankings | Maintain separate race-result provenance |
| Sleep | Large web You panel, sample-only | Explicit experimental Health detail | Keep opt-in and sample labeling; expand after real ingestion |

## 8. Recommended build order

1. **Close the activity-to-progress loop.** Restore pending activity review/counting, reconcile totals, reconnect arrival and week-complete receipts. This makes the core product understandable.
2. **Make account continuity real on mobile.** Persist/load account competition state, handle sign-out/account switching, and authenticate crew requests. Signing in should recover the user's actual progress.
3. **Complete four-tab parity.** Bring crew workflows, history, preference controls, and onboarding to the intended platform baseline. Keep 3D a documented web extra.
4. **Validate live sources.** Exercise configured OAuth, native permissions, imports, sync failures, provenance, and repeat sync against real accounts/devices.
5. **Choose live social scope.** Finish private shared fields first, or explicitly invest in real-user density and challenge acceptance. Do not treat synthetic practice as completed live multiplayer.
6. **Expand secondary features deliberately.** Live sleep ingestion, unattended notifications, additional race-result coverage, and richer coaching follow the core loop.

## 9. How to specify an individual move

Use: **“Move [feature] from [current location] to [tab → section]. Keep [data/behavior]. Change [interaction]. It is complete when [observable user outcome] works on [web/mobile].”**

Example: “Move activity review into Today → Activities. Keep imported activities and their counted/pending state. Let users count or exclude a session from its receipt. It is complete when counting a pending Garmin import adds one checkpoint and updates Arena once on both platforms, surviving reload.”

Example: “Move notification and theme controls under You → Settings. Keep saved preferences. Leave one settings entry on the profile. It is complete when users can change preferences, return to their prior tab, and see the same saved choice next time.”

## Source map

- Current web shell: `apps/web/src/shell/phone-shell.tsx`; tab content in `apps/web/src/features/today`, `arena`, `field`, and `you`.
- Current mobile tabs: `apps/mobile/app/(tabs)/`; notifications: `apps/mobile/app/settings.tsx`.
- Mobile local persistence: `apps/mobile/src/lib/compete-store.tsx`.
- Disconnected presentation: `apps/web/src/features/split/components/activity-splits.tsx`, `week-reveal.tsx`; `apps/web/src/features/rally/field-join.tsx`.
- Domain behavior: `packages/shared/src/compete/`; shared navigation and presentation models: `packages/shared/src/shell.ts`.
- Existing capability caveats: `docs/data-status.md`, `docs/integrations.md`, `docs/compete-persistence.md`.
- Intended frontend direction: `docs/frontend-rebuild-plan.md` (its pending checklist is older than the implemented four-tab shell).
