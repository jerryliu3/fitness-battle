# Promotion timing: representative next-rank volume

Discussion clarification: "next-rank average" means a representative volume inside that rank, not its minimum entry volume. Numerical scale candidates now begin at zero with Champion at 10,000; the earlier v2 scale table is superseded for this comparison. No runtime change is made.

## Assumptions

- Running volume anchors remain simulation seeds, not validated percentile estimates.
- Representative volume is the arithmetic midpoint of the next rank's lower/upper volume anchors. It is not a measured population mean. Champion uses the 80–100 mi/week modeling interval, without implying a ceiling.
- A new user declares zero, supplying one initial pseudo-week. No imported history, no missing weeks, and no net competition influence.
- Weekly smoothing follows alpha = 1/min(7,n+1), then 1/7 at maturity.
- Accumulated volume contributes 0.02 * sqrt(Q/reference_volume) rank intervals. Score is converted from rank position to a public numerical scale only at the end.
- Following each promotion, the sequential simulation switches to the representative volume of the next rank. Baseline, historical volume and observation age carry forward; nothing resets.
- This is arithmetic progression modeling, not a recommendation for increasing exercise load.

## Results

| Promotion | Representative running mi/week | Sequential newcomer, weeks for this promotion | Isolated established estimator, weeks, no history bonus |
| --- | ---: | ---: | ---: |
| Beginner to Rookie | 5.5 | 2 | 6 |
| Rookie to Active | 11.5 | 4 | 6 |
| Active to Challenger | 20 | 6 | 6 |
| Challenger to Athlete | 30 | 6 | 8 |
| Athlete to Elite | 42.5 | 5 | 6 |
| Elite to Master | 57.5 | 6 | 8 |
| Master to Olympian | 72.5 | 6 | 8 |
| Olympian to Champion | 90 | 5 | 6 |

The isolated comparison starts B at the current rank's lower volume anchor with mature smoothing, then supplies the next rank's representative volume. It excludes history and competition contributions to isolate calibration timing. It is not a forecast for every established user, whose starting position within the band and recorded history differ.

Sequential newcomer results for other sports, in the same promotion order: cycling 2/4/6/6/5/6/6/5 weeks; walking 2/6/7/7/6/7/6/4; strength 2/6/7/6/7/6/6/4. These use the seed sport curves and reference normalizations. All are within 2–7 weeks in this modeled scenario, with first promotions accelerated by provisional calibration. Competition results, coverage gaps, initial conditions and the eventual researched curves change outcomes; this is not a universal 13-week guarantee.

## Point spacing

Even anchors: 0/1250/2500/3750/5000/6250/7500/8750/10000.

Widening anchors: 0/750/1750/2750/4000/5250/6750/8250/10000.

Both yielded identical weekly promotion times in the modeled sequential scenarios across all four sports. Domain calculations use rank intervals before display conversion, so the two scales describe the same progression. Final integer rounding could affect an exceptionally close boundary, but did not affect any of these results. A fixed numerical history/competition bonus across different scales would be a substantive balance change, not a pure presentation comparison.

Recommendation: retain the proposed EMA and square-root growth, use the simpler even 0–10,000 scale, and validate volume benchmarks next. A finite trailing-window alternative is included in the model for sensitivity analysis but is not necessary to meet the clarified representative-volume goal. Preserve quick provisional calibration rather than deliberately delaying correct newcomer placement to meet a minimum waiting period.

## Follow-up: target schedule 2/2/4/4/6/6/8/8

The user's desired schedule can be reproduced in the same sequential, zero-start, neutral-competition scenario without changing alpha, accumulated-volume weight, or point spacing. One constructed example uses entry volume anchors of 0/2/5/10/18/28/42/60/80 miles per week, with 100 as an upper interpolation anchor. The representative volumes below are separately selected interior values, not arithmetic midpoints or measured population means.

| Promotion | Representative mi/week | Illustrative hours/week at 10 min/mile | Weeks |
| --- | ---: | ---: | ---: |
| Beginner to Rookie | 3.5 | 0.58 | 2 |
| Rookie to Active | 9.5 | 1.58 | 2 |
| Active to Challenger | 16 | 2.67 | 4 |
| Challenger to Athlete | 27 | 4.50 | 4 |
| Athlete to Elite | 34 | 5.67 | 6 |
| Elite to Master | 50 | 8.33 | 6 |
| Master to Olympian | 65 | 10.83 | 8 |
| Olympian to Champion | 85 | 14.17 | 8 |

Hours are scenario conversions, not personal pace assumptions in the scoring engine. At another pace hours differ; switching running scoring from distance to recorded time is a separate domain decision. This numerical example is constructed to hit the schedule and is NOT evidence these representatives match population percentiles. In particular 9.5 is near the top of the candidate Active interval [5,10), rather than its center. Do not call it a statistical mean without evidence. Actual athlete ramp-up safety is outside this arithmetic model.

The target schedule is a calibration acceptance scenario, not a promotion timer or a guaranteed user path. Imported history, starting position, actual event performance, stable-volume maintenance, or a different sequence of targets changes timing. Intentionally delaying an accurately placed imported-history athlete for eight weeks would contradict fast calibration. Tune against a diverse scenario set rather than optimizing only this path.

Changing benchmark/representative values is a configuration edit plus a model rerun. Represented rank volume and interpolation anchors jointly determine timing: lowering the target volume alone while leaving the entry cutoff fixed generally slows promotion. A uniform rescaling of all distance anchors can preserve much of the progression geometry; normalize accumulated volume consistently if exact invariance is intended. Changing the desired weeks is easy to model but not an independent free control in the current formula. If empirically validated benchmarks do not yield desired timings, change the calibration policy explicitly and review the fast-placement/three-month-memory tradeoff rather than distorting benchmarks to match the schedule.

The model checks this exact schedule for both even and widening score scales. It writes the constructed results to `target-promotion-example.csv` and records its anchors/representatives in `promotion-times.json`. No new rank-specific rate parameters were added to the proposed runtime formula.

## Reproduce

```
cd /Users/jerryliu/.codex/worktrees/f1b2/fitness-battle
python3 scripts/model-rank-promotion.py
```

The model checks score-anchor conversion and equality of promotion timings between scales. It writes `promotion-times.csv` and `promotion-times.json` here. Other modeled assumptions and the trailing-window sensitivity case are recorded in the JSON. No application tests, production builds, or runtime scoring changes are part of this work.
