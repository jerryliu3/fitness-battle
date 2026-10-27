# Activity context: richer chart prototypes

The read-only mobile route `/activity-lab` explores three alternatives to the production median comparison. Open it with `overtaek://activity-lab` in a locally running app. Run + HR, Strength, No HR and Sparse are explicitly fictional examples. No account, activity, scoring or analytics writes occur.

Use **Focus chart** to hide the example controls and session metadata while reviewing a concept; **Show examples** restores them. Chart interactions remain available in either mode. Optional initial route parameters are `concept=scatter|trend|impact` and `sample=run|strength|no-hr|sparse`.

## Evaluation

| Concept | What the selected session reveals | Most useful for | Main limitation | Recommendation |
| --- | --- | --- | --- | --- |
| Session map | A highlighted point in a scatterplot of session pace versus average heart rate. Tap any point to inspect; toggle the prior-history regression line. | Running with HR and enough comparable distance sessions. | Route, elevation, weather, pauses and workout intent are not matched. Average HR also hides within-session intervals. | Strongest new GPS exploration. Treat the line as a description of recorded history, not a fitness prediction. |
| Trajectory | Individual session points and their five-session average on a date axis. Include/exclude the selected session to inspect its effect on that average. Switch pace, time and recorded HR. | Both GPS and non-GPS; especially useful without HR. | A rolling average can change because an old session leaves the window. Mixed workout intent changes the distribution. | Best general-purpose activity context; show the selected session prominently and explain what enters/leaves the window. |
| Ripple effect | Daily logged minutes, a seven-day rolling average, and the exact added minutes from the selected session. Toggle with/without it. | All supported sports, including manual strength. | Volume is not training strain. Sparse imports can make recorded volume incomplete. | Best companion for a concrete "what this added" interaction. Avoid injury, fatigue or recovery labels. |

My preference is Session map for sensor-rich runs, Trajectory as the universal option, and Ripple effect as an optional impact detail. Selecting a session should determine the available lenses; users should not have to choose between empty charts.

Strength also has a duration-versus-HR scatter variant for comparison. It is a weaker default: HR and elapsed training time do not describe strength output, sets, load or muscle groups. Prefer its time trajectory and logged-volume contribution until those measurements exist.

## Calculation details

- Calculations take an explicit selected activity and activity array. Earlier counted same-sport rows qualify; pending, excluded, sample/demo and later activities do not. Duplicate IDs are removed. Fixtures are isolated in `example()`.
- The scatterplot uses up to 60 observations from the preceding 90 days. Running pace requires at least 500 m; comparison distances must be within 20% of the selected distance. Heart rate must be recorded and within 20–260 bpm. A least-squares line uses only earlier observations, requires five, and spans only their observed HR range.
- Trajectory shows up to 16 sessions while calculating each five-session average from the full qualifying history. Pace is the arithmetic mean of session paces, not total duration divided by pooled distance. The before/after comparison includes the current session and drops the oldest observation from that rolling window.
- Ripple effect shows 28 Eastern calendar days. The seven-day average uses logged minutes on each calendar day, with zero for unlogged days; the current day's data stops at the selected session. The before/after calculation removes only that session. A 44-minute session adds exactly 44/7 minutes to the seven-day daily average.
- Charts share stable domains between before/after states. Current activity uses yellow; earlier history and average lines use teal. Tapping a plot selects its nearest observation; accessibility increment/decrement inspects adjacent observations. Charts yield vertical drags to the page.

## Native review

Reviewed the actual React Native screen on an iPhone 17 Pro simulator, including scatter-point selection, current-session refocus, trajectory inclusion/exclusion, and volume inclusion/exclusion. A missing-HR session directs to the trajectory rather than fabricating HR. Sparse history shows observations without inventing a moving average.

- [Session map](ios-scatter.png)
- [Trajectory and average-change explanation](ios-trajectory.png)
- [Ripple effect and contribution explanation](ios-impact.png)
- [Strength ripple effect](ios-strength-impact.png)

These remain exploration code and fictional previews, separate from the production activity sheet. No typecheck or automated tests were run in this prototype review.
