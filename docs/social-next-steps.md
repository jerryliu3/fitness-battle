# Week close, repeat rivals, and shared starts

October 16, 2026 · Second design round · Refined after user review

This proposal saves the second five-concept exploration and narrows its active scope. The main direction is a weekly close experience with congratulations and mutual repeat-pairing preferences. Start Line is a near-term candidate with timing still undecided. The remaining concepts are parked.

The [standalone review](design-studies/social-next-steps/review.html) contains two refined sketches. [Preview notes](design-studies/social-next-steps/README.md) explain how to open it. The [original five-concept source](design-studies/social-next-steps/archive/round-two.fragment.html) is preserved as an archive, not as an implementation backlog. This PR contains design artifacts only.

The earlier [material and motion study, PR #121](https://github.com/jerryliu3/fitness-battle/pull/121), is separate. These refinements can later use its Glass Track and dimensional weekly result treatment without depending on that PR being merged first.

## Decisions from the review

| Original idea | Current status | Scope saved here |
| --- | --- | --- |
| Rival Circuit | Refine and prioritize as a candidate | End-of-week result, congratulate others, privately indicate “Race again”; try to pair again only when mutual. |
| Training Kit | Out of scope | No planning system, training calendar or plan-following format. Preserve the original exploration only. |
| Start Line | Interested; now/soon candidate, possibly early | A small structured Crew workout invitation with an RSVP. Timing and implementation remain undecided. |
| Fresh Start | Too early | Revisit after there are users and an observed return-after-absence problem. |
| Sideline | Appealing, integration unclear | Park the standalone experience. Simple congratulations fit the weekly close flow; broader conversation/pennant UI is not selected for implementation. |

There is no formal friends concept in this scope. A repeat preference does not create a friend, follow, contact, direct-message channel, fixed season, or guaranteed rematch.

## 1. Weekly close: the smallest useful rivalry loop

### Entry and hierarchy

Use the existing Compete result context once the period is settled:

1. **Your result:** final place, field size, sport, score track, total and exact period bounds. A result plaque or existing award can carry the material treatment; an award is shown only when actually earned.
2. **The people you competed with:** inspect the other real athletes from that same settled field.
3. **Two independent actions:** “Congrats” and “Race again.”
4. **Continue:** the user can leave the result normally. Neither action is required to finish the flow or enter another competition.

This is part of weekly results, not a new social tab or a mandatory multi-screen recap. It complements the earlier workout-return animation: that explains a newly counted workout, while this explains a settled weekly result.

### Congratulations

“Congrats” is a lightweight, bounded reaction attached to the recipient's result for this period. Reuse the existing encouragement pattern where appropriate rather than introducing a general messaging product. The sketch confirms the reaction on that athlete's card.

Congratulating someone does not opt into repeat pairing. Selecting “Race again” does not send a congratulation. Reactions do not alter score, Elo, eligibility or settlement. Production actions need real authenticated participants and settled result identities; generated peers and the unranked past-self ghost are not recipients.

### Race again

Each participant can independently indicate that they would like to compete with another athlete from the completed field again. This is a preference for future field composition, not a live 1v1 or a friend request. Multiple preferences can be represented; the eventual matching implementation can decide how to resolve compatible groups.

Recommended interaction:

- Off: **Race again**.
- On: **Race again ✓**, with an explicit removable selection.
- Confirmation: **Preference saved. If you both choose this, we'll try to pair you again.**

Proposed default: keep one-sided choices private. Mutual interest can be acknowledged once both sides have chosen. The user did not select a public request inbox, an acceptance workflow, or social notifications as part of this exploration.

### Mutual interest is an input, not an assignment

Try to place mutually interested athletes in the same future compatible field, subject to normal participation, sport/score-track compatibility, capacity and seating rules. A preference does not register the other person or require either athlete to join the next period. It does not rewrite scoring, periods or existing enrollment bounds.

| Situation | User-facing state | Meaning |
| --- | --- | --- |
| No selection | Race again | No repeat-pairing preference from this user. |
| Selected; no mutual choice yet | Preference saved | Wait for an independently expressed choice from the other athlete. |
| Both selected; assignment not made | You both want another round | The matcher can try; no seat or next opponent is promised. |
| Mutual, but pairing cannot be made | Couldn't pair you this time | Acknowledge the outcome without suggesting anyone rejected the other. |
| Actual assignment exists | Pairing confirmed, with the actual field | Show this only from real assignment data, never merely from mutual preference. |

The sketch demonstrates the first four states using clearly separate sample controls outside the app. It intentionally does not synthesize a “pairing confirmed” result.

### Preference lifetime and implementation decisions

Prefer an intention scoped to the completed period and the next compatible pairing attempt, rather than a permanent relationship. Allow withdrawal before the relevant seating decision. Exact expiry, seating cutoff and conflict resolution are implementation decisions still to settle; do not silently make a choice recur forever.

A future implementation needs canonical result/participant identifiers, actor/recipient direction, period and sport/track context, the independently recorded choices, and a pairing outcome. It must retain the normal authority boundary for settlement and seating. This PR creates no schema, RPC, API or matching algorithm.

### Visual and interaction direction

Lead with a compact sporting result plaque, then an athlete inspector with name, place and total. Glass can lift the selected athlete's actions above the result context. Explicit labels carry the meaning; color alone cannot distinguish congratulation, selected preference, mutual interest or assignment.

The review exposes every other participant through a selector so the example does not privilege only the podium or close rivals. Production may adapt the existing field presentation instead. Save action state independently per athlete; changing selection must not erase another athlete's reaction or repeat preference.

### First implementation candidate and evaluation

Start with the settled result, per-person congratulations and repeat-interest capture. Pairing integration can be a later slice only if the preference copy remains honest while it is unavailable. Do not ship an actionable “we'll try” promise against a system that never consumes the preference.

Evaluate whether users understand the distinction between congratulating, indicating interest and actually being paired. Test changing selection, withdrawing a preference, multiple mutual choices, no eligible future participation, and a real unsuccessful pairing attempt. Useful signals include voluntary repeat-interest selections, mutual choices, feasible pairings and repeat participation. They are hypotheses to measure after users exist, not retention claims.

## 2. Start Line: preserve a small near-term option

**Status:** promising, with timing undecided. This is not approval to build a planning system now.

A Crew member proposes a simple workout window: “Easy run, Saturday at 08:00, thirty minutes, wherever you are.” Others can RSVP inline. A start ticket shows the time, timezone, session description and participants; the user's starting light joins when they opt in. Leaving is straightforward.

The smallest candidate is one structured Crew invitation/card with a future time and RSVP list. It can serve people exercising independently during the same window. There is no recurring calendar, program generation, personal weekly plan, workout prescription, friends graph or live location requirement in this slice.

An RSVP is an intention, not recorded exercise or competition credit. Counted activities continue through the existing activity and scoring paths. The early version need not include attendance verification, automatic matching of workouts, shared live sessions or post-workout conversation.

Before implementation, decide who can create a Crew invitation, the required fields, cancellation/time-change behavior and how people discover it. Notifications and reminders need an explicit product decision; the sketch does not send any. Start Line should earn its place through actual Crew use rather than expanding the launch scope by default.

## 3. What stays parked

**Training Kit:** keep only the original visual/interaction reference. No planner, scheduled personal routines, rest-day calendar, target assignment or adherence-based scoring is included in the active proposal.

**Fresh Start:** keep the welcoming return concept for later. There is no user base yet, so a comeback journey is not a launch priority and no inactivity-detection flow is introduced here.

**Sideline:** preserve the idea of people noticing a first 10K, return or milestone. Its standalone moment feed, threaded encouragement and pennant scene lack a clear integration point. Weekly congratulations are a narrower integration, not approval of the full Sideline feature.

## Boundaries and next decisions

- Retain Focus tokens and Home / Compete / Crew / Athlete navigation. `/arena` remains the Compete route.
- Use actual settled results and the canonical period/enrollment model. No compulsory personal target or competition completion percentage is introduced.
- No friends/follow system, fixed four-week season, live duel, new scoring format, planning system or comeback mode.
- Week-close congratulations and repeat preferences are candidates for implementation; Start Line remains a timing decision.
- This saved design can be reviewed independently of PR #121. Production delivery, backend integration and user messaging require later implementation work; no real congratulation or invitation is sent by these artifacts.

## Review artifacts

- [Interactive refined review](design-studies/social-next-steps/review.html): Week Close and Start Line, using fictional people and results.
- [Editable refined source](design-studies/social-next-steps/concepts.fragment.html).
- [Original five-concept source, archived](design-studies/social-next-steps/archive/round-two.fragment.html): retains the initial exploration; the decisions above supersede its product scope.
- [Preview and validation notes](design-studies/social-next-steps/README.md).
