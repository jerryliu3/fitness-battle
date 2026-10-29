# Selected chart implementation

October 29, 2026. Web and native source updated; no deployment or database change.

- Home uses Open line with 1W/4W controls beneath the plot, a dotted previous
  period, and one date/value reading. Hover previews; tap pins; horizontal drag
  inspects. Four weeks is 28 Eastern dates and the current trace stops today.
- Effort Score uses the same chart and reading with 1W/4W/1Y controls beneath it.
  Existing Open/GPS lenses, score history and settlement behavior remain. Dates
  include the year when the selected range crosses a year boundary.
- Training uses square-ended Benchmark bars, a dotted average and the same
  compact date/value inspection. Calendar Week/Month/Year ranges, sport selection,
  period navigation and the daily-activity disclosure remain. Future buckets
  are excluded from inspection and the average; recorded zero buckets count.
- No hovered session list, duplicate date, area wash, pulsing endpoint or new
  Training mix view was added. Shared geometry and eligibility keep web/native
  presentation aligned without a chart dependency.

Validation: workspace type checks, UI typography contract, shared presentation/
period tests and web build. The full shared suite passed with file parallelism
disabled after two unrelated mascot tests timed out under concurrent build load.
The native calendar test was updated to assert bucket count and inspectable dates
against the new SVG chart instead of the removed individual bar buttons.

The built web app was inspected at desktop and 390px phone widths: Home 4W and
dotted prior period, bar selection and previous-week navigation, Effort Score
ranges and keyboard first-point inspection. The chart fit its container and the
browser reported no errors. Native behavior was checked by component tests and
type checks; no physical-device build was installed.

The installed Next 15.5.27 package does not contain `dist/docs`. The official
Client Component directive guide was consulted for the React client components;
no route, server action or framework data API was changed.
