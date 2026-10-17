# Selected material and motion directions

October 16, 2026 · Overtaek design exploration · Refined after user review

This study records the selected directions and their refined product placement. It preserves the Focus identity and Home / Compete / Crew / Athlete navigation. It is a design proposal with sample-data sketches, not a production launch or a replacement of the [design guide](design-guide.md).

Compete is the current visible tab label; the existing lane experience keeps its `/arena` route. Older exploration notes call that surface Arena.

## Review and decisions

| Direction | User feedback | Refined direction |
| --- | --- | --- |
| Glass Track | Strongly liked | Floating glass controls and an athlete inspector above existing Compete lanes. |
| Forged Week | Strongly liked | Earned weekly result objects first; optional Home targets are a separate feature proposal. |
| Body Clock | Liked; placement uncertain | Secondary timing detail within Athlete / Progress, conditional on usefulness and data. |
| Benchmark Lab | Liked; wants PR history | A dated personal-record timeline with source receipts. |
| Crew Relay | Strongly liked | Apply to the existing cooperative crew goal and inspect each member's contribution. |
| Training Rhythm | Chart useful; wants weeks; selection unclear | Weekly history, cleaner selection, bars/line comparison and inline session inspection. |
| Finish-Line Replay | Liked within existing UX | A return moment inside Compete with no dedicated destination. |
| Session Anatomy | Drop | Removed from the active study and sketches. |

Another round of ideas in different areas is a separate future exploration; this study captures and refines the selected directions.

## Review the sketches

Open [the standalone review](design-studies/material-motion/review.html) in a browser. The picker contains seven experiences. Figures, people and results are fictional. The [editable source](design-studies/material-motion/concepts.fragment.html) and [preview notes](design-studies/material-motion/README.md) are retained alongside it. The review does not call application APIs, claim tracker connectivity or change domain behavior.

## 1. Glass Track — an arena you look into

**Placement:** existing Compete, in 2D and 3D. **Object:** the lane field. **Interaction:** select an athlete and inspect their exact total and gap without leaving the field.

Let the field occupy most of the screen. Sport, view mode and centering controls sit on a few rounded glass surfaces above it. Track lines continue beneath them. Tapping a runner grows an inspector from the selection. Press feedback combines a short highlight with gentle compression; navigation and controls share a coherent floating plane.

Glass reveals depth while exact values retain a substantial reading layer. Keep the field as the content surface rather than making every metric card translucent. Native Liquid Glass and browser approximations require platform-specific choices; blur alone is not optical refraction.

**First slice:** athlete lens and existing view/centering controls. Preserve stable lane identities, own-lane tennis color, the athlete-centered viewport, true gaps and the unranked prior-self ghost. Tinted/opaque and reduced-motion versions provide the same actions.

**Evaluate:** find yourself, inspect a rival's gap, change view and restore centering without losing context. Check legibility over busy content.

## 2. Forged Week — keep the result you earned

**Placement:** existing weekly awards in Compete and Athlete. **Object:** a dated, dimensional medal or result plaque. **Interaction:** turn and flip it to the real result receipt.

Start with the competition's actual output: a settled result. Engrave the sport, period, placing, counted total and rating change. Collected weeks form a shallow shelf or tray, with readable dates and a useful flat archive. Use connected thickness, a polished rim, restrained sculpted lettering and reflections that follow the same pose.

Gold/silver/bronze and explicit place can distinguish podium results. Other results retain their actual eligibility and naming: material cannot create a new award entitlement. An active-week preview says “In progress”; its final place and finish appear only after settlement. A weekly contest has a close and a result, not a completion percentage.

### Goalmaxxing and optional personal targets

The actual private Goalmaxxing source was inspected locally. Its canonical mapping is **easy → Liquid Glass, medium → Anodized Alloy, hard → Chromatic Foil**. Connected thickness, pose-driven lighting, sculpted text and confirmed-credit fragment reassembly are the reference. Its product logic and chrome are not imported.

An **optional personal target on Home** could use a goal plate: choose a sport, a supported unit such as distance or sessions, and a weekly amount. With no goal selected, Home has no empty completion card. Difficulty selection is a possible later design, not necessary to unlock attractive materials. Persistence, goal edits and completion eligibility need a separate product decision and implementation.

| Personal target | Competition result |
| --- | --- |
| Optional and chosen by the athlete | Derived from the existing competition |
| Progress toward a chosen amount | Position and counted total within a period |
| May complete before week close | Final outcome after settlement |
| Could assemble a plaque from confirmed contributions | Activity volume cannot guarantee a podium finish |
| Does not gate entry or alter scoring, Elo or awards | Retains canonical scoring and settlement |

The sketch opens on a settled medal. “Home goal · optional” separately explores a target plate and the glass/alloy/foil finishes. Difficulty never equals rank.

**First slice:** one existing settled award with front/reverse inspection. **Evaluate:** explain what was earned, when it became final and how to find the receipt. Personal targets are independent of this work.

## 3. Weekly Training — see how training changes

**Placement:** Athlete → Progress; optionally a compact recent-history preview on Home. **Object:** weekly training totals. **Interaction:** select a week and inspect its counted sessions in place.

Replace the daily ribbed ribbon with a clean 8–12-week history in the eventual product. The sketch uses seven weeks for phone readability. Start with one sport and distance; duration or session count can follow. Use the same source/eligibility rules as the matching detail. Training-history buckets use half-open Mon–Mon UTC bounds. Competition keeps its canonical period helper, including a seated enrollment window when applicable; the chart must not silently redefine it as a calendar or rolling-seven-day contest.

**Bars are the leading choice for weekly volume.** Each mark represents a discrete period total. Use a zero baseline, one quiet selected state and a gap for genuinely missing data. Remove the raised rubber styling and ornamental selected card.

**A line is a comparison option for the longer-term shape.** It is easier to scan for direction but can imply continuity between independent totals. Use points, straight connections, gaps for missing data and no smoothing. Bars/Line is an external study control on identical data, not proposed permanent product chrome.

The current week is explicitly partial: a hatched bar or hollow point and dashed final connection. Do not describe a comparison of a full week against a partial week as improvement/decline. A same-cutoff comparison requires actual comparable records.

### What selecting a week does

1. Tap a bar/point, or choose a week from the accessible selector. The chart stays put.
2. One quiet detail area below it updates exact bounds, total, unit and session count. This area is present before interaction; selection does not introduce a modal or navigate away.
3. Expand “Counted sessions” to inspect the contributions. Production session selection should open the existing activity detail with existing back behavior.
4. Switching Bars/Line in the study retains the selected week and detail.

Selection cannot log activity, create a goal or change score. Empty, missing and partial periods need distinct labels. **First slice:** completed-week bars and inline details using existing history. **Evaluate:** identify the unit and partial week, then find a session. Choose bars versus line based on comprehension as well as preference.

## 4. Body Clock — give the clock a natural home

**Placement:** secondary “Daily timing” within Athlete → Progress, entered from a selected day or existing sleep detail when available. **Object:** a 24-hour timeline. **Interaction:** inspect a recorded workout or sleep interval.

Keep it off default Home and avoid a new tab. Its job is “When did I move, and where did recorded sleep fall around it?” Workouts occupy an outer track, sourced sleep a separate inner arc, and a glass lens reveals the selected event. Display the timezone and use the existing event receipt.

This is conditional. If it cannot answer that timing question better than existing detail, defer it. Start with activity timestamps; add sleep only from real records. Never infer recovery, HRV, readiness or unrecorded sleep. Production needs cross-midnight and daylight-saving handling.

**First slice:** one day's real events in a secondary detail. **Evaluate:** whether it adds understanding and has a discoverable entry point without consuming the main Home hierarchy.

## 5. PR Timeline — a history of becoming faster

**Placement:** Athlete's benchmark area, expanding into its detail. **Object:** dated personal records. **Interaction:** choose a distance, then inspect a milestone and its source.

Expand Benchmark Lab from two markers into a timeline: current PR, total improvement since the first comparable result, and each record-breaking performance. A step progression shows that the standing record stays unchanged between improvements. Earlier, slower and non-record results remain evidence and can live in an “All results” view.

Selecting a milestone changes the receipt in place while the current-PR headline stays distinct. Show date, event and source for verified results. Keep estimates explicitly labeled and out of the verified PR series. Empty and single-record states must work without invented trajectories.

Event, sport, distance, elapsed-time rules and provenance determine comparability. Estimated benchmarks, weekly effort, Elo and verified PRs remain separate measures. Broader workout PRs could follow with sport-specific definitions; summary totals cannot imply them.

**First slice:** one distance, sourced history and dated receipts. The sketch has four fictional PR improvements per distance. **Evaluate:** find the current record, amount of improvement and evidence behind a past record. Define the canonical source/history model before claiming current benchmark estimates already support this.

## 6. Crew Relay — one goal, visible contributions

**Placement:** the existing cooperative Crew goal module. **Object:** shared progress toward the configured target. **Interaction:** inspect a member's counted contribution.

Apply the tape to the crew's actual goal rather than imposing a personal one. Each member contributes a proportional segment; selecting it opens their sessions in a local inspector. Label total, unit and remaining amount. A short baton handoff marks a new confirmed contribution, representing asynchronous logging rather than a live race or assigned turn.

Keep crew identity, invitations, roster and competition views. Stable member order and explicit names prevent segment position from implying rank. Show all contributing members in the production model, with expansion when there are too many segments for a phone.

Use like units and sports. Cooperative distance goals use distance; personal-session-target crew formats need a sessions-based treatment. If a goal is exceeded, show the true total and amount beyond target rather than hiding it behind 100%.

**First slice:** one cooperative crew's current distance goal and canonical contributions. **Evaluate:** explain your part, the crew total and what's left without interpreting order as placing.

## 7. Finish-Line Moment — part of the return flow

**Placement:** the current Compete after a newly counted workout. **Object:** the existing lane field. **Interaction:** acknowledge the update, optionally replay it, then continue normally.

Extend the existing [arrival prototype](adaptive-home-prototype.md#return-reveal). An inline “Since your last visit” banner names the counted contribution, the athlete's lane briefly advances on one scale, and the result appears in the normal inspector. Dismiss the banner while the Compete remains usable. No dedicated recap page, tab or required walkthrough is introduced.

A 1.5–2.5-second automatic reveal is a possible refinement of the existing return flow, subject to trigger and interruption validation. Explicit replay is optional. Marker, total and standing derive from one interpolated state. Reduced motion shows the result directly. Do not introduce an additional automatic route change beyond existing return behavior.

The revised sketch is an Compete with a small return banner. Its fictional +2.2 km takes the week from 17.0 to 19.2 km and passes a 17.8 km rival. No personal weekly target or completion threshold is needed.

Only a comparable newly counted gain should trigger it. Rival movement, first visits, changed periods, excluded sessions and failed loads cannot manufacture a gain reveal. Retain current acknowledgement/snapshot scope. If rank is unchanged, show the real contribution. Awards appear after settlement.

**First slice:** banner and finite lane animation within the existing arrival flow. **Evaluate:** understand the change, skip/dismiss immediately and continue in the normal Compete.

## Integration and next slices

| Existing destination | Proposed work | Independent decision/dependency |
| --- | --- | --- |
| Compete | Glass Track; settled result objects; Finish-Line Moment | Rendering and return-trigger behavior |
| Athlete → benchmarks | PR Timeline | Comparable sourced result history |
| Athlete → Progress | Weekly Training; conditional Daily timing | Correct aggregation and timing/sleep provenance |
| Crew → cooperative goal | Crew Relay | Canonical goal format and member contributions |
| Home | Optional history preview or personal target plate | Targets are a separate opt-in feature decision |

Recommended sequence: **Glass Track + settled Forged Week**, **Crew Relay**, **PR Timeline**, **Weekly Training**, then the small return-flow refinement. Body Clock stays conditional. No selected competition concept depends on adding personal targets.

These are candidates for later implementation PRs. This design PR does not ship schema, scoring, routes or product behavior. The next brainstorming round can explore other areas and new features with the same principle: a fitness-specific form should clarify the feature and make interaction satisfying.

## References

- [Apple — Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): floating controls/navigation and responsive material.
- [Oura — App design](https://ouraring.com/blog/new-oura-app-experience/): separate daily context from long-term history.
- [WHOOP — Trend Views](https://www.whoop.com/mc/en/thelocker/track-progress-with-new-trend-views/): observe changes over different windows.
- [Eight Sleep — Insights](https://www.eightsleep.com/blog/get-sleep-fit-with-insights/): help interpret personal metrics.
- [Strava — Relative Effort](https://support.strava.com/en-us/articles/15401794-relative-effort): activity contributions and weekly accumulation; Overtaek retains its own scoring.
- [Duolingo — Animation timing](https://blog.duolingo.com/streak-milestone-design-animation/): finite, legible celebration.
- Goalmaxxing private reference: `jerryliu3/goalmaxxing`, `docs/ux/goal-card-material-study.md`, `docs/ux/goal-card-reward-study.md`, `src/features/goals/card-material/tempo-card-material.ts`. Inspected locally; its source was not modified or bundled here.

## Validation

See [review notes](design-studies/material-motion/README.md) for checks on this revision. The original eight-concept study was inspected at 390px and 320px; that does not substitute for verifying these refinements.
