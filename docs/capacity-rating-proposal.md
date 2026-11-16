# Weekly capacity rating proposal

Status: superseded discussion draft, 2026-11-15. See [the revised single-score specification](effort-score-v2-spec.md), which incorporates competition influence, capped declaration, square-root accumulated volume, and weekly rank protection. This earlier draft is retained for research context; its recommendations are not the current proposal. Existing coding principles remain authoritative until a replacement is approved and implemented.

## Objective

A sport rating describes recent sustained recorded weekly volume, with roughly a three-month memory. It does not measure physiological capacity, athletic skill, or clinical fitness. Equal steady volume converges to equal rating regardless of opponents, wins, enrollment, or account age. Different recent trajectories may have different ratings despite the same arithmetic 13-week average.

Replace permanent milestone rating awards and placement Elo with a direct volume estimate. Retain event places, victories, history, and activity progress as separate rewards. Never multiply activity volume by rank. No points are transferred between competitors.

## Research and applicability

- [Glicko-2, original specification](https://glicko.net/glicko/glicko2.pdf): rating, uncertainty, and volatility are distinct. Borrow the principle that uncertain initial estimates should adjust faster. Its outcome model is not appropriate for an absolute volume ladder. Inactivity uncertainty is not itself proof of zero training.
- [Microsoft TrueSkill](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/): estimates mean skill and uncertainty, making larger early corrections. TrueSkill 2 uses individual performance information as well. We directly observe the quantity we want to rate, so do not infer it from who won.
- [ITF World Tennis Number](https://worldtennisnumber.com/eng/faq): confidence changes how much ratings move; singles and doubles have separate ratings. Useful precedent for confidence and separate sport contexts.
- [UTR FAQ](https://www.utrsports.net/blogs/news/understanding-utr-frequently-asked-questions?_pos=1&_sid=fdd35cc04&_ss=r): recent match performance, rolling weighting, and sufficient evidence matter more than an accumulating trophy total. Its match/opponent formula is not a volume formula.
- [Riot MMR and rank](https://support.riotgames.com/en-us/league-of-legends/gameplay/mmr-rank-and-lp): displayed rank and matchmaking estimate are separate. Borrow fast placement, but avoid an unexplained visible-rank/matchmaking disconnect.
- [Riot placement and decay](https://support.riotgames.com/en-us/league-of-legends/gameplay/placements-promotions-series-demotions-and-decay): placement and inactivity policies are product choices distinct from the underlying estimate.
- Anecdotal community examples: [League discussion of hidden MMR](https://www.reddit.com/r/leagueoflegends/comments/160totf), [tennis comparison of WTN and UTR](https://www.reddit.com/r/10s/comments/1c1sq83). These illustrate concerns about explainability and accuracy, not representative evidence that any system is universally fairest. Do not treat allegations about engagement manipulation as established facts.

## Weekly measurement

Use Eastern calendar Monday-to-Monday half-open weeks, separately from competition enrollment windows. Full calendar weeks provide comparable observations even when someone joins a Wednesday or does not enter a competition.

| Sport | Canonical weekly volume |
| --- | --- |
| Running | Eligible distance, stored in metres |
| Cycling | Eligible distance, stored in metres |
| Walking | Deduplicated daily step totals |
| Strength | Non-overlapping eligible recorded workout duration, stored in seconds |

No pace, HR, readiness, rank, or placement multipliers. Strength duration includes ordinary within-session rest, but not an unattended running timer; exact eligibility and abuse rules require review before implementation. A duration ladder is training participation, not lifting strength. Missing HR must not reduce credit.

Use every eligible recorded activity, whether or not entered in an event. Continue provenance, deduplication, exclusion, and source-quality controls. A calendar week receives one observation per sport/track, never one update per event. Keep source scopes comparable for matchmaking; current Open/GPS differences require an explicit migration decision rather than silently merging evidence.

## Smoothing and recalibration

Let V[t] be eligible volume for a complete, sufficiently observed week, B[t] the smoothed weekly volume, and n the number of observed full weeks since initialization.

```
alpha[n] = 1 / min(7, n + 1)       # n starts at 1
B[t] = B[t-1] + alpha[n] * (V[t] - B[t-1])
rating[t] = round(sport_curve(B[t]))
delta[t] = rating[t] - rating[t-1]
```

Self-declaration has one pseudo-week of weight. The first four real weeks replace 80% of its influence. At maturity alpha is 1/7: effective sample size is 13 under independent equal-variance observations, about 86.5% of weight lies in the most recent 13 observed weekly updates, and a sustained change has a 4.5-week half-life. This is not an exact trailing 13-calendar-week average. Missing weeks break the calendar-memory interpretation and make the estimate stale.

Smooth volume before converting to score. Keep full precision internally and round only the displayed score. No separate weekly -12 penalty, permanent +1 award, win bonus, or score-change cap. Those would distort the capacity meaning or recreate slow convergence. The formula is symmetric up/down; calendar-week closure prevents rest-day penalties. Large early corrections are allowed and explained as provisional calibration.

For exact three-month arithmetic equality instead, use an ordinary trailing 13-week mean. It gives stronger literal equality but responds slowly and changes when an old outlier falls out. Proposed preference: exponential smoothing.

Do not add a second derivative or an acceleration bonus to rank. If useful, show momentum separately, e.g. latest four-week average minus previous four-week average. A trend is descriptive, not extra volume.

## Initialization

Ask typical recent weekly volume for each selected sport, in familiar units. Ask actual recent volume, not desired future targets. Convert a selected range to a documented midpoint, with an explicit value for an open-ended top range. Reliable complete historical weeks take precedence over declaration, using the same weekly measurement rules; do not infer a zero before tracking coverage began or simply mark imported history as competition-counted.

Self-declaration initializes B, not a permanent award. Allow the full plausible range as a provisional estimate; an arbitrary 1500 cap would deliberately misplace high-volume newcomers. Do not allow repeatedly resetting the declaration after results exist.

If the user skips both history and declaration, proposed fallback is 500 / Beginner with low confidence. This avoids a compulsory initial decline, but does not guarantee accurate initial matching. A later first complete week should initialize B directly in this no-information case, rather than treating a fictitious zero as evidence.

1000 should describe a defined volume, not a universal signup gift. No claim that 99% of users will increase is supportable without representative observed onboarding data. Anyone starting above their actual sustained volume must be allowed to fall. Put guaranteed positive feedback in completed workouts, progress, streaks, and achievements.

## Candidate sport curves

These are proposed product anchors, not population percentiles, scientifically equivalent workloads, or prescribed training targets. Interpolate linearly between anchors; clamp display to 500–2400 while retaining uncapped volume internally. Units below are presentation units; distance conversion uses exact metres.

| Score / band | Running mi/week | Cycling mi/week | Walking steps/week | Strength min/week |
| --- | ---: | ---: | ---: | ---: |
| 500 Beginner | 0 | 0 | 0 | 0 |
| 800 Rookie | 3 | 15 | 14,000 | 60 |
| 1000 Active | 8 | 40 | 28,000 | 120 |
| 1200 Challenger | 15 | 75 | 42,000 | 180 |
| 1400 Athlete | 25 | 125 | 56,000 | 240 |
| 1600 Elite | 35 | 175 | 70,000 | 300 |
| 1800 Master | 50 | 250 | 84,000 | 360 |
| 2000 Olympian | 65 | 325 | 98,000 | 420 |
| 2200 Champion | 80 | 400 | 112,000 | 480 |
| 2400 ceiling | 100 | 500 | 140,000 | 600 |

Existing rank names imply ability in places; reconsider Elite/Olympian if this remains purely a volume ladder. Curves need scenario evaluation and real-user distributions before freezing. A 1000 walking score means 4,000 daily steps on average; a 1000 running score means 8 miles/week. Those are product choices, not a prediction of what 99% of users do.

## Numerical scenarios

Using the running curve above and mature alpha = 1/7, a runner established at 35 mi/week (1600) with genuinely observed zero weeks follows:

| Zero weeks | Smoothed mi/week | Score |
| --- | ---: | ---: |
| 1 | 30.00 | 1500 |
| 4 | 18.89 | 1278 |
| 8 | 10.20 | 1063 |
| 13 | 4.72 | 869 |

A new user declaring 3 mi/week but recording 35 every complete week reaches 19 after week one and 28.6 after week four (scores 1280 and 1472). A user declaring 35 but recording 3 reaches 19 then 9.4 (1280 and 1040). These are arithmetic scenarios, not empirical performance results.

## Evidence completeness, inactivity, and corrections

Known inactivity is zero volume and naturally lowers B. No enrollment does not stop recalibration. A freeze can protect an event result but cannot preserve an absolute volume estimate indefinitely.

Missing permissions, a provider outage, or unavailable coverage is not a known zero. Mark affected weeks unknown, reduce confidence, and avoid presenting the old estimate as fresh. Stale users should leave active leaderboards and require refreshed evidence/provisional placement before normal matchmaking. Historical zeros should never be fabricated merely because a sync returned no rows. Need explicit per-provider coverage semantics and a chosen staleness threshold before implementation; four unobserved weeks is a candidate, not a finalized rule.

Historical rating observations can be corrected and recomputed from immutable source revisions, with visible explanation. Closed event placements retain their own existing exclusive acceptance deadlines and remain immutable. A late import may improve the capacity estimate without rewriting a past competition. Version rating curves and settlement logic; retain before/after audit records and idempotent weekly updates. Limit declaration-only entry into prize-bearing or restricted events if those are later introduced.

## Matchmaking

Use the sport, evidence track, exact event bounds, recent volume estimate, and confidence. Match in volume space as well as score space: equal score gaps can represent different absolute or proportional volume gaps. Initial policy should be simple and evaluated against available field sizes.

For provisional users, use observed complete weeks to override a contradicted declaration when seating the next event. At maturity a recent four-week volume average can flag a changed training regime. If used in matchmaking, expose it as recent form rather than a secret unrelated rank. Never forecast a whole week by multiplying one Monday workout by seven. Do not change an already-started field. For short waves, compare the same window and acknowledge that a seven-day estimate alone cannot predict an individual's workout schedule.

## Per-sport and overall ratings

Recommend independent sport ratings and primary-sport rating on the profile, with an explicit sport label. A multisport athlete has lower running volume than a dedicated runner doing more miles; that is accurate for a running-volume competition. Changing primary sport only changes the default display.

| Overall approach | Benefit | Limitation |
| --- | --- | --- |
| Maximum sport rating | Simple strongest-sport identity | Does not reward combined training |
| Mean sport ratings | Easy to compute | Adding a new sport can reduce the score; wrong incentive |
| Sum normalized sport volumes, then apply one curve | Rewards total recorded volume | Conversion factors are subjective; step/workout overlap can inflate totals |
| Deduplicated total workout minutes | Explainable overall participation | Does not express equal physiological workload; passive steps do not translate cleanly |

Prefer per-sport launch; if overall is desired, separately label it Overall Training and start with deduplicated workout minutes. Do not average or add score numbers. An advanced formula cannot establish equivalence absent agreed measurement semantics. Do not use overall for single-sport seating. Swimming is not currently a supported sport and requires its own measurement/curve before inclusion. Passive walking steps can include running; resolve overlap before combining them with recorded exercise.

## Implementation sequence after agreement

1. Approve measurement, smoothing, initialization, evidence-completeness policy, and candidate curve direction. Simulate plausible 26-week histories including rest, injury, volume shifts, false declarations, missing sync, cycling extremes, step totals, and strength duration abuse. Compare lag and matchmaking error; do not claim a best system from anecdotes.
2. Add a shared deterministic capacity engine and semantic tests for convergence, symmetric correction, zeros versus unknowns, calendar/DST bounds, deduplication, partial registration, and idempotency. Add versioned observations and additive migrations; avoid reinterpreting old Elo as measured volume.
3. Derive new ratings from actual covered history or provisional input. Preserve old competition archives and audit the transition. Replace milestone rating writes and placement Elo together so they cannot contaminate the new estimate. Update living principles and product copy when the policy is approved.
4. Present separate event performance, completed-week rating delta, confidence, and positive workout feedback consistently on web/mobile. Keep sleep's separate domain model out of this migration unless explicitly included.

No runtime scoring changes have been made by this proposal.
