# Chart system review and interaction exploration

October 29, 2026. Initial exploration, before production implementation.

**Follow-up:** the owner rejected this first exploration as insufficiently grounded
in the requested apps. The [reference-based five-concept study](reference-study.md)
supersedes its design recommendation. The source inventory below remains useful;
the original three concepts are retained as review history.

## Scope and decision

Review chart structure and interaction across web and native, starting with Home
and Progress. Keep the existing Everyday Club tokens, hours-based training,
Eastern period boundaries, counted-activity eligibility, record qualification,
and effort scoring. No account, scoring, database, or production UI changes are
part of this exploration.

The owner requested beautiful, consistent, interactive charts, naming WHOOP,
Oura, Robinhood and other data-heavy apps as inspiration, and welcomed three to
five concepts. Mobbin reference retrieval was attempted but refused because the
connected plan requires an upgrade. No reference screens were retrieved or
inspected. These are original design proposals based on this code review, not
claims about how those products currently work.

**Recommendation:** use Focus's headline inspection on Home, Rhythm's daily bars
and linked session reading on Progress, and introduce Compare's interval selection
in expanded analysis. Consistency should mean the same inspection behavior and
chart anatomy, while each metric retains the encoding that fits its meaning.

The three interactive concepts are shown in the originating chat. Each has Home
and Progress views, week/four-week sample ranges, comparison visibility and
keyboard controls. Data is fictional and explicitly marked. They do not connect
to the application. The four-week range is an exploration control, not a change
to production's week/month/year domain.

## What the implementation already gets right

- Shared, platform-independent geometry, period logic and nearest-point helpers
  exist in `packages/shared`. Extend these instead of introducing another chart
  library or replacing metric calculations.
- `ChartText` maintains caption size when SVG geometry scales. Retain this.
- Native `ChartScrubber` supports taps, horizontal scrubbing, accessibility
  increment/decrement actions and selection haptics; vertical gestures yield to
  the page. Web already supports horizontal scrubbing and arrow-key inspection.
- Home compares cumulative training hours with the same weekday of the previous
  week. Do not replace this with a full-week comparison during an incomplete week.
- Record geometry is a staircase carrying the standing record between dated
  improvements. Preserve this; an ordinary smoothed line would imply invented
  performances between actual attempts.

## Inventory and concrete gaps

| Surface | Source | Current structure / interaction | Proposed change |
| --- | --- | --- | --- |
| Home weekly hours, web/native | `features/today/week-chart.tsx` on web; `features/week-chart.tsx` on native | Cumulative current line, dashed prior line, area fill. Inspection is a separate caption; headline stays at week total. Previous series lacks a visible legend. | Let the date, main value and delta enter an explicit inspection state together. Label both series; preserve the whole-period summary when cleared. |
| Shared web scrubber | `apps/web/src/ui/chart-scrubber.tsx` | Selection starts after horizontal movement; pointer-up does not inspect a stationary tap/click. No passive mouse inspection. Uses `role="application"`. | Support tap/click and pointer hover as well as drag; keyboard and screen-reader inspection without application mode. Keep direction locking and `touch-action: pan-y`. |
| Progress training, web | `apps/web/src/features/progress/training-atlas.tsx` | Individual bar buttons, selected value below plot, separate calendar disclosure. Year chart scrolls horizontally at a minimum width of 528. | Share the same selection surface as native; move selection reading into a stable position above plot and link it to the selected bucket's sessions. Decide year aggregation and navigation explicitly. |
| Progress training, native | `apps/mobile/src/features/training-atlas.tsx` | Bars wrapped in `ChartScrubber`; selection summary above plot. Bars and scrubber use separate rendering/interaction layers. | Reuse this existing direction for web. Make selected bucket controlled by the parent so range changes, calendar selection and scrubbing stay synchronized. |
| Effort history, web | `apps/web/src/features/focus/athlete-overview.tsx` | SVG with range/track controls, endpoint and pulse; no point-inspection wrapper. Accessible name hardcodes “30-day” despite a range control. | Add the shared inspection behavior and derive accessible range text from actual bounds. Use contextual score axes, not an hours scale. |
| Effort history, native | `apps/mobile/src/features/effort-trend.tsx` | Scrubber already exists; selected score appears separately from main score. Accessible name also hardcodes “30-day”. | Match the selected date/value anatomy and range label with web; preserve Open/GPS lens and score units. |
| Standard metric lines | `apps/{web,mobile}/src/ui/standard-line-chart.tsx` | Dots at every observation; transparent click/tap columns. Web rects only have `onClick`, without native button/keyboard semantics. Returns null for fewer than two values. | One shared inspectable surface, quieter default marks, selected point emphasized. Specify empty/single-value treatments before replacing consumers. |
| Personal records | `apps/web/src/features/progress/record-chart.tsx`; `apps/mobile/src/features/record-chart.tsx` | Web has focusable attempt groups and Enter/Space activation; native wraps the staircase in a scrubber. Web colors include raw literals. | Keep the staircase and dated attempt selection. Adopt common focus/inspection treatment and semantic tokens. Synchronize chart marker with receipt selection. |
| Home health signals | `apps/{web,mobile}/src/features/daily-health.tsx` | Tappable radial readings open detail. Scale is historical maximum, explicitly not a goal. | Apply the same date/value/detail grammar when exposing history; do not turn historical maxima into progress goals. A ring can remain a compact reading. |
| Telemetry / activity analysis | Web `features/progress/telemetry-page.tsx`, native health analytics and activity detail consumers | Standard lines/corridors plus specialized session scatterplots and trajectory charts. | Migrate standard lines after Home/Progress; retain specialized scatter, corridor and relative-index semantics. Do not replace every visualization with a generic line. |

These findings come from source inspection, not a fresh native-device audit or a
claim that every possible runtime state was reached.

## Three concepts

### Focus — the chart becomes the reading

One dominant plot and a stable date/value/delta area. Home uses cumulative lines;
Progress uses daily bars. Hover previews a point, tap pins it, horizontal drag
scrubs, and Clear selection restores the period summary. Inspection uses actual
observations rather than a decorative interpolated value. A selected day shows
its session reading below the plot.

Tradeoff: users must understand whether the large value is a period total or an
inspected value. The date and “through this day” label must change with the value.

### Rhythm — daily bars linked to sessions

Daily bars lead on both Home and Progress. Selecting one dims its peers and updates
the headline and session detail. A compact dated day strip supplies an explicit
tap target in the weekly view. Previous-period values appear as quiet dashed
horizontal marks. A zero day remains selectable and reads “No recorded activity”.

Tradeoff: daily volume shows activity distribution directly but does not show
accumulated week-to-date progress as clearly as Home's cumulative line.

### Compare — choose an interval

Two period readings remain visible. Drag across Home's cumulative chart to select
an interval; the headline shows **hours within the inclusive selected days**, not
the cumulative endpoint. Two labeled range controls make both interval boundaries
available to touch and keyboard users. Progress uses grouped daily bars. Both
series share a scale and the selected interval is shaded. Dragging in either
direction selects the same interval. Clearing selection restores whole-period
readings.

Tradeoff: two values, two boundaries and a second series require more space and
attention. Prefer this for expanded analysis rather than every Home chart.

## Shared production contract to apply after direction selection

1. **Anatomy:** title and date range; stable summary/inspection reading; local
   range and comparison controls; plot; compact labels; relevant selected detail.
   Selection must not cause layout jumps or add a floating tooltip under a finger.
2. **Selection:** parent-owned `selectedId`; pointer hover is transient, tap pins,
   horizontal drag inspects, vertical drag scrolls. Provide explicit clearing,
   Escape, first/last and previous/next keyboard commands and native accessibility
   adjustments. Selection haptics fire only when crossing a new real observation.
3. **Comparison:** visible current/prior labels; one aligned scale; current
   incomplete week compared through the same elapsed boundary. Prior unknown
   values are missing, not zero. Turning comparison off removes its marks and
   readings together.
4. **Encoding:** bars for bucket totals and zero baseline; cumulative line for
   accumulated hours; trend line/corridor for continuous metrics; staircase for
   standing records. Avoid smoothing that invents peaks or hides zero days.
5. **States:** specify loading, no eligible observations, one point, recorded zero,
   missing measurement, partial bucket, future dates and unavailable comparison.
   Do not call zero activity a rest day or imply no measurement means zero.
6. **Density:** about four date ticks at narrow widths; no dot on every observation
   by default; selected point and endpoint can remain visible. Provide large hit
   regions independent of thin visual marks. Preserve real dates and units in
   the accessible reading even when visible tick labels abbreviate.
7. **Motion:** short positional transitions between compatible ranges; direct
   manipulation responds immediately. Reduced Motion disables interpolation.
   Avoid looping endpoint pulses as the primary invitation to inspect.

## Small implementation sequence

1. Extend the existing shared datum/inspection contract and platform scrubber
   adapters. First fix web tap/click parity and controlled selection. Add focused
   interaction tests for tap, drag, vertical escape, cancellation, range changes,
   empty data and keyboard/native accessibility.
2. Apply the selected anatomy to Home and training atlas on both platforms using
   existing shared calculations. Keep production week/month/year controls and
   existing sport filters and period navigation.
3. Migrate effort, standard metric lines and records; then check health and
   specialized analysis consumers. Preserve all existing data qualifications and
   scoring; this should not require a database migration or a new dependency.
4. Update the living design guide when a direction is selected. Run
   `pnpm typecheck`, relevant interaction/shared tests and the web build for the
   implementation. Read the installed Next guides before any Next source edits.

## Exploration verification

The isolated concepts were checked in Chromium at 320, 390 and 736 pixels:
click, touch tap, forward scrubbing, keyboard inspection, Home/Progress switching,
week/four-week switching, comparison on/off, zero-activity day and horizontal
overflow checks. Compare additionally passed reverse interval dragging and both
boundary controls. Synthetic vertical pointer gestures preserved the period
summary. Light and dark captures were inspected; Reduced Motion was enabled for
the dark capture. There were no browser page errors.

This verifies the prototypes, not production charts, physical-device gestures,
screen-reader output or performance on native hardware. Production typecheck,
tests and build were not run because this pass adds only this review document;
all interactive exploration lives in the originating chat.
