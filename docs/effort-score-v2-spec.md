# Effort Score v2: numerical specification and model

Status: proposed implementation specification, 2026-11-15. No production scoring changes. Numerical mechanics are specified below; volume anchors are explicit simulation seeds, not validated percentile estimates. This supersedes the recommendations in `capacity-rating-proposal.md`.

Subsequent discussion: initial zero and Champion at 10,000 replace the scale candidate below. See [promotion timing findings](scoring-model/promotion-findings.md) for the latest even/widening comparison and the clarified representative-volume interpretation. The 500-floor/old band numbers in this draft are not final policy; the promotion model converts a common rank-position calculation into the new display scales.

## Product contract

One public Effort Score and rank per sport/track. Primary sport supplies the default profile display. No composite or additional public currency. Recent training dominates; weekly competition matters; accumulated eligible volume supplies unbounded diminishing growth. No global clock-based inflation, credited-week counter, or dependency on the #1 athlete. Rank can promote or demote only at the weekly recap; initial placement is assigned during onboarding.

This is a blended participation/performance score, not a pure physiological capacity measure or a pure recent-volume percentile. At equal recent volume, a veteran can have a modest advantage. With equal continuing volume and equal competition influence, any fixed accumulated-volume head start shrinks in absolute score points. No finite volume-only weighting can simultaneously give unbounded lifetime growth and guarantee a permanently bounded veteran advantage against a completely inactive newcomer over an infinite horizon. Evaluate normal human training horizons, not an impossible universal guarantee.

## Exact formula

For sport/track s and Eastern calendar week t:

```
V[t] = eligible full-calendar-week volume
B[t] = B[t-1] + alpha[n] * (V[t] - B[t-1])
alpha[n] = 1 / min(7, n + 1)       # n = observed full weeks after declaration

Q[t] = cumulative eligible recorded volume through the weekly cutoff
U[t] = Q[t] / reference_volume[s]
A[t] = 20 * sqrt(U[t])

residual[t] = average(actual_pair_result - expected_pair_result)
C[t] = 0.5 * C[t-1] + 120 * residual[t]

raw_score[t] = F_s(B[t]) + A[t] + C[t]
display_score[t] = max(500, floor(raw_score[t] + 0.5))
delta[t] = display_score[t] - display_score[t-1]
```

F_s is the piecewise-linear curve below, with its last segment extended above 10,000. There is no score ceiling. Only round the final public score; retain component precision. C[0] = 0. No competition evidence means residual = 0 and previous C still halves. Full-precision raw score is not floored at 500: the display floor must not erase components or accumulated history.

Four material tuning controls beyond sport curves: mature alpha 1/7, accumulated-volume coefficient 20, competition multiplier 120, competition retention 0.5. Expected-result scale 2000 preserves the former Elo scale relationship when ordinary rank spacing expands from 200 to 1000. These are a concrete v1 engineering recommendation, not empirically optimized parameters.

## Canonical units and normalization

| Sport | Canonical volume | One reference-volume unit |
| --- | --- | --- |
| Running | metres | 20 miles = 32,186.88 metres |
| Cycling | metres | 100 miles = 160,934.4 metres |
| Walking | deduplicated steps | 56,000 steps |
| Strength | recorded workout seconds | 180 minutes = 10,800 seconds |

Normalization is a tuning convention, not a physiological equivalence or a recommended training dose. Each sport has its own score. Base XP uses the sport reference volumes. Eligible recorded workouts starting November 16, 2026 at Eastern midnight can also earn a Training XP intensity bonus. The HR bonus ramps from 0% at 110 bpm to 12% at 180 bpm. Running and cycling pace can earn up to 8% below 6.5 or 3 min/km respectively, with a minimum distance greater than 500 m and positive moving time. Use the larger available bonus. Missing signals, older workouts, and manual entries keep base XP. The bonus feeds activity XP and weekly Effort. Standings still use native event units. GPS/Open evidence remains independently scoped for running/cycling; walking/strength remain Open. Preserve quality/disposition controls and never count a workout twice on one track. Pauses are excluded from workout duration; ordinary recorded strength rest remains included. Unattended timers and implausible inputs need existing review/exclusion controls rather than a new hard workout-duration cutoff in this formula.

All eligible training contributes whether or not the user enters an event. History imported for calibration does not become eligible for a closed competition merely because it informs B or Q. Calibration evidence needs a distinct eligibility predicate from event-entry eligibility while continuing to exclude duplicates, invalid, pending, excluded and non-user fixture activities.

## Numerical score bands and candidate volume anchors

The nine existing rank names remain. These score thresholds apply to the whole blended score. Target percentile bands are product intentions, not certified empirical distributions. Fixed researched anchors can approximate them at launch; actual population percentiles require a documented sport cohort and measured data.

| Rank | Score minimum | Intended percentile band | Running mi/week | Cycling mi/week | Steps/week | Strength min/week |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Beginner | 500 | Bottom 25% | 0 | 0 | 0 | 0 |
| Rookie | 1500 | 25th–50th | 3 | 15 | 14,000 | 60 |
| Active | 2500 | 50th–60th | 8 | 40 | 28,000 | 120 |
| Challenger | 3500 | 60th–70th | 15 | 75 | 42,000 | 180 |
| Athlete | 4500 | 70th–80th | 25 | 125 | 56,000 | 240 |
| Elite | 5500 | 80th–90th | 35 | 175 | 70,000 | 300 |
| Master | 6500 | 90th–99th | 50 | 250 | 84,000 | 360 |
| Olympian | 7500 | 99th–99.9th | 65 | 325 | 98,000 | 420 |
| Champion | 8500 | Top 0.1% | 80 | 400 | 112,000 | 480 |
| Upper interpolation anchor, no extra rank | 10000 | Unassigned | 100 | 500 | 140,000 | 600 |

The volume columns are carried forward as model seeds. They do NOT demonstrate the percentile bands in the same rows. This distinction blocks presenting the percentile labels as measured facts. In particular [Garmin's 2025 report](https://www.garmin.com/en-US/blog/general/2025-garmin-connect-data-report/) reports over half of its users averaged at least 8,000 daily steps, 28% at least 10,000, and 0.4% at least 20,000. That cohort does not validate a median of 4,000 steps/day, or directly define Overtaek's population. Running/cycling/strength also need reference distributions or the owner's underlying benchmark research. Activity averages cannot establish user weekly-volume quantiles.

Production readiness requires replacing/confirming these seeds against the intended sport-participant population. Until then, show numerical rank names without unsupported global-percentile labels. Do not automatically change cutoffs as the app clock advances. A future population update should use the distribution of complete blended scores, not only recent volume, if rank is to represent blended-score percentiles. Version and announce benchmark changes; global recalibration is not a weekly engagement reward.

## Square root versus logarithm

The model compares square root with a logarithm matched to the same +144.22 contribution at 52 reference-volume units. Neither has a finite ceiling; the logarithm has a more severe late slowdown. Whole-number presentation makes both produce occasional zero-delta maintenance weeks despite positive underlying growth.

| Reference-volume training | Square-root contribution | Matched logarithm | Next reference-volume week, square root |
| --- | ---: | ---: | ---: |
| 3 months / 13 units | 72.11 | 95.86 | 2.72 |
| 1 year / 52 | 144.22 | 144.22 | 1.38 |
| 2 years / 104 | 203.96 | 169.06 | 0.98 |
| 5 years / 260 | 322.49 | 202.13 | 0.62 |
| 10 years / 520 | 456.07 | 227.24 | 0.44 |
| 20 years / 1040 | 644.98 | 252.39 | 0.31 |

At 20 running miles/week, reference units equal training weeks. At different volumes, use actual cumulative normalized volume, not elapsed account age. Coefficient 20 yields substantially less than one 1000-point rank band after twenty years at reference volume. At five times reference volume it yields about 1442 points after twenty years: the advantage is not universally capped. The underlying recent-training score still dominates in ordinary modeled ranges.

The two-year versus three-month accumulated-volume advantage is 131.85 points initially, 88.55 after both continue for another year, and 51.12 after another five years. It shrinks more slowly than a logarithmic advantage. Real newcomers with imported training history may have no deficit at all.

Coefficient sensitivity makes the tradeoff explicit: k = 10 gives about +228 after ten reference-volume years; k = 20 gives +456; k = 40 gives +912, nearly a full rank band. Recommend 20 as a modest middle option, not because it is a statistically fitted optimum.

## Why percentage bias is not the substitute

For a fixed target T and alpha a, additive bias e in `S_next = (1-a)S + aT + e` settles at `T + e/a` rather than growing indefinitely. Upward integer rounding behaves as a bounded perturbation around the target, not a reliable growth schedule.

For percentage inflation p applied after calibration:

```
S_next = (1+p) * ((1-a)*S + a*T)
```

If `(1+p)(1-a) < 1`, it also approaches a finite equilibrium. If that multiplier equals 1 with positive T, growth is linear. Above 1 it is unstable exponential growth. For a = 1/7, the boundary is p = 1/6. These results describe this particular recurrence; percentage bonuses on only wins or only positive deltas behave differently and depend on activity/outcome paths.

For example, applying a 1% bonus after every weekly recalibration toward T = 4000 eventually settles around 4298. The increase sounds persistent but still has a fixed point. This scenario is checked numerically by the model.

"Less predictable" means accidental sensitivity to update frequency, rounding, score size, result distribution, and operation order. Examples: rounding ten partial awards can differ from rounding one total; 1% rewards at 8000 are eight times those at 1000; repeated imports must not repeat a percentage increase. Percentage rules can be specified deterministically, but they do not automatically deliver diminishing growth and newcomer catch-up. Keep explicit full-precision components instead.

## Competition evidence and adjustment

Compare exact event totals within the same sport, track and start/end window. Running/cycling use distance, walking steps, strength duration. For each actual eligible opponent:

```
actual = 1 for greater total, 0.5 for an exact tie, 0 for lower total
expected = 1 / (1 + 10 ** ((opponent_entry_score - own_entry_score) / 2000))
residual = average(actual - expected)
```

Use locked finalized entry scores, including accumulated volume and prior competition influence. Recalculate neither expectations nor fields mid-event. Only real eligible competitors provide rating evidence; generated participants and past-self do not. Official event places keep their own existing field semantics. At most one designated primary weekly field per sport/track supplies competition evidence, avoiding duplicate rewards from overlapping contexts.

Against equally rated opponents, first place contributes +60 and last contributes -60; ties against everyone contribute zero. Previous C halves first. Repeated equal-opponent wins approach +120; repeated losses approach -120. General residuals in [-1,1] and the recurrence naturally bound C within +/-240 from a zero start; no separate clipping parameter is needed.

A bye, missing valid roster, zero eligible personal volume, or frozen event supplies no new competition residual. Old C still halves at calendar close. A failed roster fetch must be retried, not finalized as a bye. No extra fixed inactivity penalty. Competition adjustment can be negative while accumulated-volume contribution is always nonnegative; exact same volume with different results can have different total scores.

## Calibration and imports

- Reliable history: process available complete covered calendar weeks chronologically to establish B; initialize the oldest observed week's B directly from its volume, then apply the calibration schedule to subsequent weeks. At six subsequent observations use mature alpha. Use all available eligible canonical history for Q, including history older than the recent calibration window when imported. No arbitrary score cap for imported evidence.
- Self-declaration: start B from declared typical weekly volume, capped at the sport's Master baseline (50 running mi, 250 cycling mi, 84,000 steps, or 360 strength minutes in these seed curves). This implements the former 1800/Master cap as 6500 on the new scale. Q = 0, C = 0. Declaration is one pseudo-week. A declaration cannot create lifetime volume or bypass the initial cap. Clamp its scoring baseline as well as the visible score; otherwise an extreme declaration could produce an undeserved promotion even after a zero week.
- No declaration/history: score 500, no fictitious prior zero volume. First complete observed week initializes B directly; later weeks follow the same diminishing calibration schedule.
- First four observed weeks after declaration are provisional in presentation and matchmaking. Calendar count is derived from dated observations, not a credited-week currency. Higher-quality evidence does not excuse duplicate or implausible records.
- Partial signup week: recorded activity may enter Q at the first recap, but do not use a partial observed week as full-week V. Keep B/C placement until complete evidence or a valid event is available; do not extrapolate one workout to seven days. Imported full-week coverage may make that week usable.
- Re-imports, provider merges, edits and exclusions recompute eligible canonical volume; they are not new awards. Invalidated volume can reduce Q. Hold input revisions and formula versions for audit/replay. Closed event outcomes preserve their existing acceptance deadlines even when late history updates current training estimates.

## Inactivity, missing coverage, rank protection

Sufficiently observed zero weeks lower B via ordinary smoothing, add no Q, and halve C. Opting out of competition does not freeze the training estimate. A competition freeze does not protect the training component from actual lower volume.

Unknown coverage is not zero. Do not apply B's observation update or advance its observation count for an unknown week. C still ages once per calendar week. Valid recorded activities can add Q without pretending missing coverage is complete. Mark the estimate stale after four consecutive unknown calendar weeks; exclude stale entries from active rank-percentile cohorts and require updated evidence before ordinary field seating. This staleness threshold is a concrete proposed policy requiring source-coverage integration; the arithmetic model does not simulate provider failures.

Scores change only at recap (plus explicit onboarding or audited data corrections), not on every sync. Promote immediately to the supported band at recap. Demote after two consecutive observed complete weeks below the current badge threshold, allowing multi-band demotion. An unknown week neither advances nor resets that counter. Recovery above the current threshold resets it. No extra point buffer. Demotion protection affects the badge, not score or seating.

Using seed running anchors, a 35 mi/week established runner with two years of recorded history starts around 5770. After stopping: week one 5270 (badge protected), week four 4159, week thirteen 2113. This is deliberately a substantial recent-training correction, not a capped -12. A prior declaration of 50 with actual 3 mi/week produces 4658 after week one, 3144 after week four, 1984 after week thirteen. Large provisional changes are expected and should be explained.

## Application behavior and storage

- Profile/Progress: one integer Effort Score, one rank badge, sport/track label, and existing score history. No second lifetime total, new wallet, or separate progression level.
- Compete: exact in-window sport volume drives event placement. Current-week progress uses distance/steps/time, not irrevocable +1 score milestone awards. Keep the finalized Effort Score steady until recap. Do not promise a promotion before close.
- Recap: show prior score, new score and signed delta. An optional collapsed explanation has Training, Competition and Consistency contribution changes; these are an explanation of one score, not separately collectible balances. Rounded explanation rows must sum to the displayed delta using deterministic remainder allocation.
- Rank progress: use blended score against current numerical thresholds. When badge demotion is protected, show that state instead of a negative progress bar. Provisional and stale are confidence states, not additional ranks.
- Matchmaking: prefer nearby finalized scores, then validate expected recent volume compatibility. As an initial safety rule, do not match two established Active-or-higher baseline users if larger B exceeds twice smaller B. This is a safety filter, not a second hidden rating; raw B exists for calibration anyway. Low-confidence placements need the same check using observed evidence. Actual field capacity may require leaving a smaller field rather than knowingly seating an extreme mismatch. No mid-field swaps.
- Data: canonical activity/step evidence is the source of Q. Aggregate it server-side, with a cached total only if needed; do not create a credited-week table. Keep a weekly sport/track observation containing window, coverage, V, B, C, raw/final score, rank/protection, and formula version. Existing period results and score-history concepts may supply parts of this record, but event windows and calendar observations must not be conflated. Derive observation count and demotion streak from those records; no separate currency counters.
- Do not recover authoritative Q by squaring a rounded displayed score. It is mathematically possible to recover the accumulated contribution from unrounded components, but an aggregate of canonical facts is simpler to correct and audit.
- Server applies one idempotent calendar update per user/sport/track/week, using finalized competition evidence when available. Event settlement and calendar scoring may happen at the same recap, but retain different volume windows. Failed required evidence postpones finalization; unknown source coverage is an explicit state. Never generate a second score change when a second event or delayed page load is processed.

## Migration and verification plan

Before runtime changes, confirm/replace the benchmark seed table and approve the one-score tradeoff above. Preserve current authoritative docs until policy approval. Keep old score/event history under its formula version; do not silently convert an old Elo number into measured volume. Recompute new initial components from actual history or use capped declaration. Communicate the one-time recalibration, preserve old event places, then disable both old +1 milestone writes and old placement Elo writes together.

Implement domain calculation once in platform-agnostic shared code, then the authoritative server path, then shared web/native presentation. Database changes must be additive and access checks preserved. Sleep remains separate. No frontend/Next code or production migration is part of this modeling change.

The included standard-library Python model checks anchor interpolation, uncapped extension, symmetric competition evidence, expected-result symmetry, fading competition influence, positive diminishing square-root gains, shrinking head-start gaps, maintenance, inactivity, and two-recap demotion. It produces ten explicit scenario families including volume increases/decreases, false declarations, alternating 0/40 weeks and repeated competition outcomes. These are deterministic arithmetic checks, not product tests, anti-abuse validation, population calibration, or field-size simulations.

Reproduce from `/Users/jerryliu/.codex/worktrees/f1b2/fitness-battle`:

```
python3 scripts/model-effort-score.py
```

Outputs: [growth](scoring-model/growth.csv), [coefficient sensitivity](scoring-model/sensitivity.csv), [weekly scenarios](scoring-model/scenarios.csv), [selected snapshots](scoring-model/snapshots.csv), and [full summary](scoring-model/summary.json).
