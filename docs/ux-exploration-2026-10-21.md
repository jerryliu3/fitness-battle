# More personal, more earned — UX exploration

October 21, 2026. Proposal for review; no production behavior or design selection changes. Fixtures in the companion conversation preview are fictional.

The [standalone browser review](design-studies/earned-personal/README.md) adds visible topic, concept and session-state controls as an alternative to the conversation preview.

The production foundation is Open Field with Everyday Club's warm white, charcoal and gold, DM Sans, polished glass capsules and canonical Ember. Preserve that foundation. The opportunity is to make effort feel consequential, people recognizable and history understandable.

## 1. Session detail: anticipation before activity, satisfaction afterward

### Daybook — recommended foundation

A day has one overview: date, an expressive headline, a useful dominant visual, then its sessions. Before a recorded activity, show the existing suggestion as a modest invitation: estimated time, purpose, why it was suggested and Add activity / Sync. A rest suggestion receives an equally considered treatment. Say “Nothing recorded today” rather than assuming the person has not exercised.

After one session, feature its distance or duration, source and counted status. With multiple sessions, use a vertical time-ordered sequence with a summary in time and session count; do not sum running and cycling distances into one headline. Tap a session to expand its receipt. Show sport-specific distance, moving time and heart rate only when available. The visually rewarding part is a truthful contribution strip: week volume added, crew contribution if applicable, and milestone progress or confirmed score gain.

The same date overview accommodates zero, one and many sessions. Suggestion content never looks like a completed activity. Keep the parent Home mounted and preserve scroll. Put Delete in the selected session's overflow/detail, with confirmation or undo; never make it the main visible action on every row.

### Session stage — strongest emotional alternative

One large athletic composition occupies the top half: a track fragment, oversized moving-time typography, a canonical Ember gesture and restrained material detail. Before activity, it is a briefing plate; after activity, a completed session plate with “What this added.” Two or more sessions have a visible count and a selectable session rail. Route geometry, splits and pace traces are conditional on actual underlying data; a decorative track is explicitly abstract and cannot stand in for GPS.

This feels like opening a meaningful object. Its risk is excessive visual spectacle and poor browsing of multi-session days. Keep source/eligibility legible and make the day's session rail visible without swiping blindly.

### Brief → receipt — best flow experiment

Replace the current peek → See session → basic page chain with direct opening of the day sheet. Inside it, use two optional sections: Overview and Impact. Before recording, Overview contains the suggestion; after recording, it contains the activity receipt. Impact explains the counted contribution. A short, dismissible reveal is appropriate once after a newly confirmed gain; revisiting opens the settled state immediately.

Do not invent an in-app workout recorder, countdown or Start workout action: the current paths are tracker sync and manual Add activity. Do not force an extra step just to view an already recorded session. Pending/excluded sessions show their real status and cannot claim a ranking or score gain.

**Decision test:** Can someone explain what they did and what changed in under ten seconds? Does the empty state feel inviting without fabricating progress? Can they find each session and safely remove only that one?

## 2. Racers: recognizable identity inside the existing material

### Portrait core — recommended first slice

Retain the polished capsule perimeter, with a small circular portrait inset at useful zoom levels. Use the same portrait in the roster, Crew and Athlete. The face sits above the glass treatment so tint never muddies it. No photo uses the shared person fallback or the person's selected Ember representation, rather than invented photos. Gold remains a first-place signal; everyone else's shell stays platinum. A neutral self outline and “You” label distinguish ownership independently of rank.

At overview scale show the capsule only; selecting a racer reveals their name and portrait in a compact inspector. Photos are identity, never a score encoding. Requires explicitly exposing authorized peer portrait URLs: current lane identity and Crew member payloads are name/initial based.

### Ember pilot — strongest character direction

Canonical Ember is seated in a small cockpit within or immediately above each capsule. Keep the same anatomy and face; later customization can change one accessory, a restrained finish or a small pennant. All racers have equal silhouette bounds so cosmetics cannot imply better performance or obscure another person. Show the chosen form consistently in Crew and profile detail.

Initially everyone can use canonical Ember, but that alone will not distinguish 5–10 people. Pair it with a persistent name/portrait inspector and stable modest identity cues. Customization, ownership and unlocks remain future product work, not rewards promised by this exploration. Remove or redesign the existing leader-only floating Ember to avoid two competing character roles.

### Personal pennant — cleanest at crowded scale

Leave heads simple. Add a small portrait/Ember pennant to the selected or nearby racer, with the name and gap. The stable capsule is a position marker; the pennant carries personality at a readable fixed screen size. This accommodates the proposed smaller world-space marker particularly well. Show at most the self pennant and one selected rival; hide the others to prevent label collisions.

**Recommendation:** Portrait core nearby, personal pennant when selected or zoomed out, Ember as an optional representation. Avoid assigning every athlete a bright color or a continuously moving mascot.

## 3. Scale and place: a larger world with readable people

The present unfolded map uses `markerScale = defaultSpan / currentSpan`, while its default spans are 6 km / 4 mi / 20 points. Zoom therefore changes world, spacing and capsules together; zooming alone does not reduce a capsule's represented distance. Change base world-space marker geometry as well as the camera. Oval projection requires a separate calibration.

### Local chase — recommended default

Explore roughly 1.2–1.6 km of visible course, with a 100 m head occupying about 26–35 px in a 420 px plotting area. The general relationship is `head pixels = plot pixels × 100 / visible meters`. This is illustrative; use actual measured plot height. In a 6 km overview, the same head is 7 px. The product needs semantic zoom rather than forcing faces into tiny marks.

Keep at least a 44 px independent hit area, resolve nearby touch targets by selecting the lane/nearest athlete, and leave side labels at readable screen sizes. The 100 m is a representation scale, never the athlete's body length or precision of tracking. Convert 100 m to the user's display units rather than redefining it as 0.1 mi. Non-GPS effort needs its own scale; no conversion to physical meters.

### Wide grounds — strongest sense of scale

Preserve a wide 6 km window but shrink capsule heads to their 100 m equivalent. A selected racer's fixed-size portrait pennant restores recognition. Reduce scenery density, use distant repeated landmarks and show accumulated-distance context. More canvas alone will not make the world feel larger if capsules still consume a large portion of the ruler.

### Overview + chase — best navigation refinement

Use the already implemented overview as the whole-field reference, with a smaller detailed window above. Selecting a position in the overview moves the detailed window; the window itself makes the scale relationship explicit. Extend the existing navigation rather than add a second minimap. Keep out-of-range arrows truthful and past-self visually distinct and unranked.

Across all three, replace top initials with live place labels such as `2nd` and `3rd · You`, while keeping lane identity and horizontal order stable during overtakes. Ties share place. Past you has no place. The name belongs near selection/portrait or in standings. Do not reorder lanes each time the rankings change.

**Recommendation:** Local chase with existing overview, 100 m world-space heads, semantic zoom and place headers. This intentionally revises the current viewport contract and needs a design-guide update when selected. Share geometry across web/native; do not alter totals, rank or scoring. Check 2D and 3D consistency explicitly rather than assuming the renderer supports portraits or identical geometry.

## 4. Progress: make history browsable and metrics interpretable

### Weekly chapters — recommended history replacement

Replace the dense “Season history” ledger with “Past weeks,” grouped by month. Each compact weekly card has date, finish (`2nd of 8`), a small training-volume silhouette and Effort Score change. Expand into the existing dimensional settled-result treatment plus supporting data; do not invent a second weekly-results object. Frozen, inactive and partial-current weeks receive distinct honest states. Exclude current partial weeks from the settled-results list.

The existing count counts result rows, not necessarily unique weeks when both tracks/all sports are selected. Use a true distinct-week count or call them results. Sports and tracks remain explicit. “Season” should be reserved for an actual season domain model, which is not established by a visual grouping.

### Score journey — best explanation of development

Lead with one Effort Score step chart and selectable weeks. Selecting an event opens a short receipt for the change and the weekly result. Distinguish confirmed activity milestones from settlement changes. Do not reconstruct dated activity awards from the current aggregate high-water receipt: it has no per-activity award timestamp. Today's current score can be accurate while a historical daily curve is incomplete. Add durable event data before promising a precise daily attribution chart.

### Training atlas — best exploratory view

A restrained calendar of weeks leads into aligned weekly volume bars and a selected week's sessions. Use distance for GPS sports, duration for strength, and show only one sport/metric at a time. A secondary result badge carries placement; color intensity cannot simultaneously mean distance, place and Effort Score. This direction suits long histories but makes results less prominent than Weekly chapters.

Across these directions, consolidate sport and Open/GPS into one visible context row. Keep time range selection local to history. Filters remain immediately accessible; move account configuration to Athlete and place “How scoring works” beside score details. If recent choices are remembered, keep their visible labels so the displayed scope is never hidden. Avoid multiple independent sport selectors for neighboring panels.

**Recommendation:** Weekly chapters under a single score chart, with Training atlas as a secondary history view later. No fabricated chart trajectories in empty/single-week states; show a useful baseline and one real receipt.

## 5. Crew: people first, one finish line

PR #121 is the material/motion relay reference: shared target, explicit finish line, direct segment selection and contribution detail. PR #122 is the separate congratulations/rematch exploration. Current `CrewRelay` computes proportional segments and a finish marker, but selection is a dropdown; its target is null for same-sport volume crews, including the current demo crew. That means a missing goal is not always just styling.

### Team shelf — recommended identity layer

Keep the existing crew title card. Add a horizontal, snap-scrolling roster below shared progress: consistent portrait/Ember, name, counted contribution and sessions. Show the edge of the next card and a compact “View all” list so membership is discoverable without swiping through everyone. A zero contribution member remains present; an explicitly declared rest week has a calm label. Avoid inferring that no recent activity means someone is resting or currently online.

### Relay ribbon — recommended shared-week visualization

Restore the target, actual total, remaining amount, unused course and a clearly labeled checker finish. Each person's proportional segment is directly selectable and highlights the matching roster card. For very small segments, the roster supplies a usable touch target. Labels and portraits identify people; color is secondary. Order remains stable rather than becoming a contribution leaderboard.

With no configured goal, show total and contributions with no finish line. Offer choosing a goal only through an authorized settings flow. When a target is exceeded, keep the target at its numeric position and show true overflow; never compress the entire chart into an unexplained 100%. Session-target crews use sessions. Do not add unlike sports' distances or imply equal contributions.

### Shared expedition — most expressive alternative

One schematic winding path carries a single crew marker toward the actual weekly goal. Member portraits sit together around that marker; selecting a person reveals the distance or sessions they contributed. A confirmed activity extends the shared trace with one short handoff gesture. This is asynchronous contribution, not simultaneous GPS, a roster duty or an assigned turn.

This provides the strongest “we are going somewhere” feeling, but proportional individual contributions are less legible than the ribbon. Preserve them in the inspector and the member cards.

**Recommendation:** Team shelf plus Relay ribbon, preserving the title card. Consider the expedition only after verifying users understand who contributed and what remains. Photo-bearing cards need a real member-photo payload; the current member API only supplies names/status. Do not add a social feed to solve group tangibility.

## 6. Activity → Effort Score: make the existing rule visible

The rule already exists. In active opted-in sports, counted volume immediately awards +1 Effort Score per rank-priced milestone. Entry rank fixes that round's price. Bases: 1 mi running/walking, 5 mi cycling, 30 min strength; rank multipliers 1, 1.5, 2, 2.5, 3, 4 and 5. Open and GPS are separate tracks. Partial volume contributes to the next milestone; a session does not automatically award a point. Receipts are a durable high-water mark, so removing and re-adding activity cannot re-award it. The score cap also applies.

### Next-point rail — recommended Home placement

Below Home's weekly hours chart, show a compact rule and progress rail for the selected active sport/track: “0.7 mi to +1 Effort Score,” then “+3 from activity this week.” Example fixture: Active running, +1 per 2 mi; 7.3 mi counted gives three full milestones and 0.7 mi remaining. Use the same calculation in the session detail. Present a paused/unavailable state for inactive enrollment and a different completion state at the score cap.

### Impact receipt — recommended session placement

After confirmation of counting, show actual volume added, progress toward the next milestone and confirmed score change when attributable. A workout that crosses several milestones has one concise `+N`, not repeated interruptions. Manual sessions explain Open eligibility; GPS may appear in both tracks, but their gains must never be summed into one advertised award.

Current receipts store per-week aggregate earned totals, not per-activity historical awards. Initially use “Your week now: +3 from activity” and “0.7 mi to the next point.” Exact “this session earned +2” requires a reliable before/after attribution record, especially during multi-activity sync, deletions and week rollover.

### Score anatomy — recommended Progress placement

Explain the current score with earned activity and weekly settlement events. Start with a compact “Activity milestones this week: +3” plus the entry-rank rule, separately from the latest settled-week change. A more detailed waterfall/event chart is a later slice once actual event provenance exists. Include negative/zero weekly changes, freezes and idle-week behavior accurately rather than promising permanent score growth.

Do not call activity volume/weighted effort and the long-term Effort Score the same thing. Rank progression is much slower than a single milestone; the two meters need separate labels and scales. Keep future cosmetic Ember rewards separate from scoring.

## Proposed build sequence

1. **Daybook + next-point rail:** fix the high-frequency detail experience and surface the existing growth mechanic. Unify zero/one/many states, remove destructive visual emphasis, retain parent context.
2. **Portrait/pennant identity + scale:** validate readability at the intended 100 m scale; then apply rank headers and shared geometry on web/native. Profile payload authorization is a dependency.
3. **Crew shelf + relay:** restore the cooperative goal story and direct contribution inspection; retain an honest goal-free format.
4. **Weekly chapters + score explanation:** replace the ledger and consolidate scope controls, reusing settled-result cards. Add accurate event history before detailed score attribution.

Selection should update `design-guide.md`; this exploration deliberately records options without making them production rules. No dependencies, application code, schema, scoring rules or tests are changed by this proposal.

## Exploration verification

The companion conversation study contains 18 directions, three per topic. All 18 were rendered at 320, 390 and 736 px browser widths with no horizontal overflow or JavaScript errors. Crew contribution selection, racer selection and the session Overview/Impact switch were exercised. The Daybook's zero/one/two-session states were checked, and representative session, identity, map, history and crew screens were visually inspected, including the session treatment in dark appearance. Portraits are placeholders and canonical Ember is existing project artwork.

These checks cover the illustrative study, not a live account, native rendering or production data integration. Application tests, typecheck and build were not run because this change contains only an exploration document; workspace dependencies are not installed in this checkout.
