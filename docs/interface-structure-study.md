# Interface structure study — Home / Arena / Crew / Athlete

October 16, 2026. An interactive, local-only study of the proposed product organization. The existing product screens remain available. This study is separate from the earlier Split/Bounce/Folio prototypes.

## Open it

- Web: run `pnpm dev`, then visit `/design/structure`. This is a standalone study route.
- Native: run `pnpm dev:mobile`, then open `overtaek:///structure` in a compatible app build. Open this standalone route directly; production navigation is unchanged.
- Browser preview of the native implementation: `pnpm --filter @fitness-battle/mobile study`, then open `http://localhost:8081/structure`. This opt-in preview uses client rendering so native storage/auth modules are not server-rendered; the normal static-export setting remains unchanged.
- Select a direction, then visit all four tabs. Web has a phone-width preview and an index linking to all 20 compositions. The phone-width web preview is responsive web; the separate Expo route is the actual native implementation.
- Web links support `?concept=trail|index|orbit|club|focus&tab=home|arena|crew|athlete&view=phone|wide`. Native accepts `concept` and `tab` as the same query parameters.

No publishing, migrations, account writes, provider authorizations, invitations, or messages are performed by this study. Local changes reset on a full reload. Opening the web comparison index remounts the sample app and also resets its local interaction state.

## Five complete directions

Each row has a separately composed Home, Arena, Crew, and Athlete screen on both web and native: **20 screen compositions per platform**. Shared widgets keep facts consistent while their placement, density, hierarchy, and emphasis change.

| Direction | Home | Arena | Crew | Athlete |
| --- | --- | --- | --- | --- |
| **Trail** | Friendly suggestion hero, arrival notice, winding journey; desktop week rail | Active registration chips, graphical lanes, awards and ranking rail | Crew identity banner, shared goal, feed, member rail | Identity, season summary, Elo preview, setup menu |
| **Index** | Numbered week and training journal; compact receipt-like path | Classification-led layout; native ranked rows, desktop registration index | Roster-first native register; desktop member index beside activity | Dossier hierarchy; preferences index before detailed progress |
| **Orbit** | Dark metric tiles and daily signal, with journey below/beside | Performance tiles, active contests, lane-based comparison | Collective goal with native progress ring; connected activity dashboard | Elo visualization as the primary dashboard tile, supporting identity/settings |
| **Clubhouse** | Daily-edition masthead, oversized suggestion feature, field notes | Past award as an editorial feature; current contest follows | Oversized club identity and activity-first social magazine | Athlete cover/profile, season stats, progress story, settings rail |
| **Focus** | One recommendation, collapsible week summary, quiet winding path | One competition at a time; awards behind a disclosure | Goal and encouragement first; native activity behind a disclosure | Centered identity, short setup menu, dedicated long-view progress CTA |

The prototype palettes stay in the product's plum/ink/lime family. They are presentation-study tokens in a plain shared fixture module; production design tokens and competition rules are unchanged.

## Product organization explored

- **Home:** daily exercise/rest suggestion, Ember at today, the last 10 past session/day blocks, noninteractive future placeholder, and session receipts. Scrolling reveals the older sessions. Web contains a bounded scroll region; native uses the main screen's natural scroll.
- **Arena:** every sample active registration, sport selection, a dedicated registration dialog/sheet, solo/crew participation, GPS-verified versus Open track selection, current standings, prior-self comparison, past awards, and all-time pace rankings. No replay or what-if controls.
- **Crew:** crew identity, membership, shared distance goal, activity/leaderboard switch, reversible cheers, invite-code panel, crew-name editing, and nudge composition. Nudges remain previews. Real membership administration and sending are outside this study.
- **Athlete:** identity, preferences, notifications, connections, and a progress entry opening statistics, Elo charts, and history-range controls. Awards are placed in Arena instead of on the profile.

## Interactions to evaluate

1. **Daily suggestion:** tap Ember on today's path tile. A detail sheet/dialog explains the session, duration, and reasoning. Keep the suggestion or choose rest. Native Ember animates on press; web Ember has motion/hover treatment. Reduced motion is respected.
2. **Activity detail:** tap one of the 10 older tiles. Inspect date, volume, source/verification, counted status, and the Arena link.
3. **Register:** choose Arena → Register. Use GPS / Non-GPS / Health categories; select a sport, solo or crew, and GPS-verified/Open where relevant. Confirm to update the local active list and selected contest. The empty-state CTA enters the same flow.
4. **Score meaning:** switch between Running, Strength, and Sleep registrations. They display kilometers, sessions, and a sleep score respectively. Past-self comparison uses the same unit and never occupies a ranked place.
5. **Crew:** toggle Activity/Leaderboard, cheer and un-cheer, open invite code, edit crew name, and compose a nudge preview. No real invitation or nudge is sent.
6. **Progress:** open Athlete → Progress, then switch 4 weeks / 12 weeks / Year to change the illustrative trend and rating delta.
7. **Preferences:** edit the display name, choose units, and toggle notifications. These controls keep local session state. Sample distance fixtures remain explicitly labeled in kilometers; selecting Miles does not falsely relabel unconverted data.
8. **Secondary flows:** use the study's scenario controls for **No registrations/Empty arena**, **New progress**, **Week complete**, and **First visit**. These are deliberate previews, not actual settlement or automatic background activity detection.
9. **History setup:** preview You → Connect → History. The one-time history button becomes unavailable after completing it in the local session. It does not generate calibration workouts or import real records.

## Scope and intentional limits

- Running, cycling, walking, strength, and sample sleep are selectable. Trail running, swimming, indoor exercise, and heart-rate competitions are shown as future exploration, disabled. Adding them to a design does not silently add them to the scoring engine.
- GPS-verified and Open are registration choices, not one interchangeable rating. Sleep uses an independent score. The displayed history is illustrative.
- Connection rows preview the interaction; they do not claim live authorization. Published race rankings remain a separate web destination.
- The study omits replay, hypothetical mileage additions, and external 1v1 invitations.
- App data and services are not changed; the study cannot establish persistence, real multiplayer, tracker correctness, or notification delivery.
- iOS/Android exports check native bundle compatibility. Physical-device motion, gestures, keyboard behavior, and accessibility still need device review.

## Implementation map

- Shared concept definitions, sports catalog, sample days, and contest-specific units: `packages/shared/src/layout-concepts.ts` (no platform imports).
- Web route and interactions: `apps/web/src/app/design/structure/structure-lab.tsx`.
- Web responsive layout, five component treatments, dialog/sheet styling, and motion: `apps/web/src/app/design/structure/structure.css`.
- Native route: `apps/mobile/app/structure.tsx`.
- Native compositions, modals, charts, gestures/controls, and local state: `apps/mobile/src/prototypes/structure-lab.tsx`.

## Deciding what to build

Evaluate one screen across all five directions before choosing a whole identity. A useful combination might be Trail Home, Orbit Arena, Clubhouse Crew, and Focus Athlete. Record a choice as: **screen + direction + behavior to keep + behavior to change**. Selection does not automatically replace the production screens.
