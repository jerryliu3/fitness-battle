# Five chart concepts grounded in published app screens

October 29, 2026. Supersedes the initial three-concept recommendation. The owner
selected Open line for Home and Effort Score, Benchmark bars for training volume,
and deferred Training mix. See the [implementation](implementation.md).

## What was actually inspected

The owner explicitly requested public web research after rejecting the first
generic concepts. This pass used web search, official product/help pages and
direct visual inspection of the five reference images below in a browser. No
Mobbin results, private accounts or installed-app sessions were used.

Published examples span app versions. WHOOP's recovery image contains dates from
2022, for example; it is evidence of that published structure, not proof that
every current screen still looks identical. Written interaction documentation is
distinguished from behaviors observable in a screenshot. No video recording was
used to verify animation timing, release behavior, haptics or gesture conflicts.

### Robinhood: the line is the main surface

Inspected [official basic line screenshot](https://images.ctfassets.net/fomw95h5b4ty/4BA8SNUP7vSFntHv4SVI19/dcbf339c92d14d91c79547c0f2d24d37/TigerLine.png),
linked from [Using charts](https://robinhood.com/us/en/support/articles/using-charts/).

The line extends nearly to both screen edges. There is no enclosing plot card,
area wash, point at every sample, or ordinary numbered y-axis. The large price
and smaller change live above it; compact time spans sit below. One faint
horizontal rule supplies context without a grid dominating the chart.

[Advanced chart documentation](https://robinhood.com/us/en/support/articles/using-advanced-charts/)
explicitly describes long-press inspection, horizontal panning, pinch zoom and
y-axis scaling. This applies to **advanced** charts; it does not establish those
same gestures for the basic screenshot. The concept borrows the basic screen's
visual hierarchy and proposes long-press inspection for our simpler fitness
chart. It does not reproduce the trading interface or claim exact gesture parity.

### WHOOP: averages and a dense daily cadence

Inspected [published recovery trend screenshot](https://images.ctfassets.net/rbzqg6pelgqa/5fBGOtneMJ148j2GcwMcIa/cda185c4396e7aa86418db1881c66d16/Alex-Howes_May-2023_Recovery_Trends-768x1665.jpg),
found through WHOOP's [Trend Views article](https://www.whoop.com/us/en/thelocker/track-progress-with-new-trend-views/).

The visible structure is a metric selector, large average, range segments,
date-range arrows, narrow daily columns, and an average rule with an edge label.
The recovery categories have their own colors and a breakdown below the plot.
Those recovery colors convey WHOOP-specific states; the proposal does not apply
them to arbitrary training-volume thresholds.

[Viewing Trends](https://support.whoop.com/s/article/Viewing-Trends) documents
press-and-drag inspection and range/date navigation. The new pinned tooltip,
selection fading and our metric selector contents are proposed adaptations.

### Oura: individual readings plus aligned activity context

Inspected the [official HRV trend screenshot](https://support.ouraring.com/hc/article_attachments/38190313679123),
discoverable through [Using Trends](https://support.ouraring.com/hc/en-us/articles/360055983614-Using-Trends).

Its fine connecting line, small points and enlarged active point are visibly
different from Robinhood's uninterrupted trace. The large current reading and
smaller horizontal historical-average value have different roles. Events appear
under dates rather than floating over the metric itself.

[Using Tags](https://support.ouraring.com/hc/en-us/articles/360038676993-Using-Tags)
documents tapping a tag to highlight its occurrences. The concept uses existing
training sports as that context, instead of adding a new tagging backend or
claiming that the highlighted activity caused a metric change.

### WHOOP: stacked contributions inside each column

Inspected [official restorative-sleep image](https://images.ctfassets.net/rbzqg6pelgqa/1QX4NgXZ3y7cxc6N7K3ib1/fbfb42f5878ac076327fe0f86efd8258/Sleep-Cycles.png),
found in the [sleep cycles article](https://www.whoop.com/thelocker/stages-of-sleep-cycles/).

Two sleep-stage segments share each column; total column height still represents
duration. The proposal carries that composition principle to sport durations.
Its segment selection and legend isolation are our additions, not interactions
verified from the image.

### Oura: floating bars encode start and end times

Inspected [official sleep-regularity screenshot](https://ouraringhelp.zendesk.com/hc/article_attachments/24084519563795),
linked from [Using Trends](https://support.ouraring.com/hc/en-us/articles/360055983614-Using-Trends).

The lower chart uses clock time on the y-axis and days across the x-axis. Bars
float between start and end times; interrupted sleep creates visible gaps.
Oura's documentation describes horizontal scrolling through dates. The proposal
applies floating intervals to recorded training sessions, with a separate bar
for each session and its actual duration. The same-day inspection panel and
previous-week controls are our adaptations.

## Concepts and distinct decisions

The originating chat contains five interactive proposals. They use the same
fictional session ledger and product tokens so color changes do not drive the
comparison. Week and four-week ranges are fixture browsing controls, not a
change to production's period model. Home and Progress previews use the same
selected chart language; these are chart-region studies, not complete screen
redesigns.

| Concept | Structure | Primary interaction | Best application | Tradeoff |
| --- | --- | --- | --- | --- |
| Open line | Full-width cumulative line, oversized reading, almost no axis furniture; range controls below | Mouse hover previews; touch hold then drag inspects, release restores the summary; keyboard selection can persist | Home's accumulated weekly hours | The sparse plot relies on the reading above it. Accumulated hours legitimately rise or stay flat; market-style volatility would be invented. |
| Benchmark bars | Dense square-ended columns, visible daily average, labeled average rule, metric/range controls above | Tap or drag to inspect a day; floating date/value above the selected column; switch hours/sessions and browse periods | Progress training volume and regularity | Averages across zero days must be labeled. The average is descriptive, not a training target. |
| Context line | Fine daily line, small observations, large active point, event strip directly under dates | Tap a sport to highlight every matching date while retaining the full line; inspect a day to reveal its sessions | Progress and expanded Home health history | A context highlight is neither a data filter nor evidence of causation. The sample metric is daily training hours, not invented HRV. |
| Stacked mix | Sports stack within each day or week on a shared duration scale; categorical legend and breakdown | Tap a segment or legend to emphasize one sport and update the reading; inspect the selected bucket | Progress composition and multi-sport Home summaries | Faded stacks remain visible to preserve the total. Small segments need full-column selection and readable detail. |
| Session clock | Floating session bars on a clock-time axis, with separate sessions on the same day | Tap/scrub a day to inspect start/end times and duration; move between weeks | Training rhythm within Progress | This answers when training happened, not how much cumulative progress was made; it complements a total chart. |

## Implementation boundaries

- This pass changes no production chart, account state, score, eligibility rule,
  period boundary or backend schema. The original source audit remains in
  [README.md](README.md).
- Keep the selected chart anatomy consistent across web/native. Reuse the shared
  geometry and selection model; do not add a separate chart package per concept.
- Production Home stays hours-based. Current periods must stop at the actual
  current observation and compare the same elapsed boundary. The fixtures are
  completed historical sample weeks and do not demonstrate partial/future states.
- Do not invent within-session samples to make the line resemble a market chart.
  A session clock must use recorded timing, render every supported session, and
  expand its bounds rather than silently crop out earlier/later sessions.
- Tap targets, keyboard/native accessibility, cancellation, vertical scrolling,
  reduced motion, zero/missing distinctions and sparse histories remain required
  when the chosen direction is implemented.

## Verification

All five concepts were rendered and visually inspected in the browser. Native
range controls drove real selected-date state; a keyboard arrow advanced a
benchmark selection. Metric switching, activity-tag highlighting, sport
isolation, Home/Progress previews and period navigation were exercised. Zero-day
inspection displays no recorded activity. At a 320-pixel browser viewport, all five
concepts were exercised; their measured phone widths and scroll widths matched,
with no horizontal content overflow. The clock view revealed both sessions on a
selected day and their separate timing. Browser error/warning logs were empty.
This is not physical-device or installed-app gesture verification. No production
build is claimed for this isolated study.
