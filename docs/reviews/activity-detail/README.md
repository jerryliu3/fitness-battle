# Activity details: session context in production

The activity detail now uses all three approved chart concepts on native and web, with calculations shared in `packages/shared/src/activity-context.ts`. It reads the selected activity and the account's activity history. The `/activity-lab` exploration remains available; `/activity-detail-preview` renders the actual native `SessionStage` with explicitly fictional, memory-only examples and a disposable removal callback.

## Screen changes

- Full-screen activity details have a fixed return control, sport/date, a primary distance or duration, and a grid of session measurements. GPS routes keep their existing overview and 2D/3D exploration. A route is never invented for a non-GPS session.
- The history sections stay together in a scrollable detail: session scatterplot, trajectory, and logged-volume contribution. For non-GPS activities, the time trajectory leads, followed by duration/HR when recorded. A scatterplot requires the current measurements and at least three earlier matching observations; its history line requires five earlier observations.
- Trajectory offers pace, time, recorded HR and, where available, **Speed / HR**. The latter is the default when it qualifies. Missing measurements remove the unavailable controls and scatterplot. Sparse history retains session dots and explicitly explains the moving-average threshold.
- Median comparisons remain underneath as compact reference stats. Multi-session days use a session chooser and keep the context specific to the selected activity. Removal confirmation and the existing weekly Effort Score detail remain available; a weekly award is not presented as a per-session award.

## Speed / HR over time

For each qualifying GPS session, calculate `speed in metres/minute ÷ recorded average HR`. Divide that ratio by the median ratio of earlier comparable sessions in the preceding 90 days and multiply by 100. Require at least three earlier valid observations and distances within 20% of the selected session. The baseline excludes the selected session and remains fixed when the user toggles it out of the moving average. This makes the index independent of the user's distance units.

The dashed 100 line is the previous-session median. Dots are individual sessions; the solid line is their five-session mean. The UI displays the selected session's percentage difference and the before/after average change. A rolling-window change includes both this session entering and its oldest observation leaving. The recorded ratio describes speed relative to average HR; it does not establish aerobic efficiency, fitness improvement, recovery, or a matched route/effort comparison. Conditions, terrain and workout intent may differ.

## Calculation boundaries

- Counted, positive-duration, same-sport activities only, with valid dates. Exclude sample/demo, history, pending, excluded and future activity. Deduplicate IDs, include the selected row once and exclude activities starting at or after it.
- Pace requires 500 m and distances within 20%. Scatter uses at most 60 observations from 90 days. Recorded HR must be finite and 20–260 bpm. The regression uses earlier observations only and never extrapolates beyond their HR range.
- Trajectory calculates five-observation means before clipping the display to the last 16 sessions. Pace is the mean of individual session paces. Ratio means use the fixed baseline above. A five-session before/after change requires five earlier observations plus the current session.
- Contribution shows 28 Eastern calendar days. Every seven-day daily average includes zero for unlogged days and stops at the selected session. The counterfactual removes only that session. Daily totals are accumulated once by Eastern day; the selected 44-minute fixture contributes exactly `44/7` minutes/day before display rounding.
- Chart domains stay fixed across include/exclude states. Tap to inspect, with accessibility increment/decrement on native and arrow/Home/End keys on web. A vertical drag scrolls the page.

## Local review

Reviewed the actual native detail component on the iPhone 17 Pro simulator with isolated fictional history. Verified scatter selection/refocus and line toggle; Speed / HR point selection and with/without state; daily-volume selection and with/without state; strength layout; missing-HR fallback; sparse history; and removal confirmation with a preview-only callback. No account activity or scoring writes were used for review. The GPS fixture used the existing route outline fallback; live map service/flyover behavior was not revalidated.

The local web `/app/today` page compiled and returned HTTP 200. A web visual review was not performed. Typechecks, automated tests and the production build were not run, following the user's earlier instruction. Existing native UI assertions and mocks were updated for the revised detail structure but not executed.

- [GPS overview and route](ios-overview.png)
- [Session scatterplot](ios-scatter.png)
- [Speed / HR timeline](ios-speed-hr.png)
- [Speed / HR with this session excluded](ios-speed-hr-without.png)
- [Session volume contribution](ios-contribution.png)
- [Strength overview](ios-strength.png)
- [Strength time trajectory](ios-strength-trajectory.png)

Open `overtaek://activity-detail-preview?sample=run&review=1` for the compact review. Other `sample` values are `strength`, `no-hr`, and `sparse`. Omit `review=1` to show example controls. The preview label remains visible; the production detail contains no fixture controls or fabricated data.
