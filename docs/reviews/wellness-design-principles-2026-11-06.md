# Wellness references and current implementation — November 6, 2026

Scope: analysis of the owner's screen recording of Mobbin previews, emphasizing
Withings Health Mate, Strava, Ahead and Gentler Streak. The previews support
observations about composition and visible states, not measured usability or
retention. Current-app findings below come from production source in this checkout,
primarily native with the web Home composition checked. Existing review screenshots
are historical evidence, not verified renders of the current build. Prototype
refinement routes are not treated as production. No product UI changes accompany
this review.

## Shared principles in the references

- Screen purpose determines composition. Strava's live pace view, Ahead's journey
  and Gentler Streak's recommendation give different tasks different structures.
- Strong hierarchy makes a few elements prominent and leaves supporting material
  quiet. Cleanliness depends on low ambiguity, not simply low information density.
- Withings surrounds charts with useful context: metric, result, trend and time
  period. The quiet chart is part of an interpretable reading.
- Spacing and alignment communicate relationships without requiring a title for
  every group or a border around every fragment.
- Consistency lives in recurring visual and interaction rules; it does not require
  identical page templates.
- Expression has a role. Ahead's illustrated path carries progression; Strava's
  map carries the activity. Adjacent chrome remains comparatively restrained.
- Visible position, manageable actions and acknowledgment of outcomes can support
  engagement. The recording does not demonstrate causal effects on retention.
- Emotional tone fits the task: performance, learning and recovery call for
  different treatment.

## Comparison with this checkout

| Area | Existing strength | Gap relative to the references |
| --- | --- | --- |
| Home | Weekly chart leads; health details expand; recommendations open in a sheet. | Weekly effort, four health tiles, rival preview, latest activity and a conditional recommendation prompt all compete for space. The prompt adds an avoidable “Tap to view” line. Review priority at the whole-screen level. |
| Charts | Open line and Benchmark bars already provide shared geometry, ranges and inspection behavior. | Native weekly hours are headed “Your effort,” while “Effort score” is another concept. Broad labels can blur metric meaning. Analytics repeats readings and status in several visual locations. |
| Compete | The geographic field gives competition a distinctive visual form; replay makes movement visible. | A summary title, countdown, date range and registration action precede the event carousel and field. Some context is necessary, but its combined footprint deserves review. Empty state uses “Your next chapter starts here.” followed by another instruction and “Explore events.” |
| Progress | Training history, records and awards expose real personal progression. | Overview accumulates training, achievements, records, past weeks/awards and an Advanced Analytics matrix. Much is relevant, but the composition risks becoming a catalogue without a clear reading priority. |
| Analytics | Range controls, metric selection, baselines and chart inspection support deeper exploration. | Technical headings such as “Autonomic Baseline Corridors” and “Sleep & Recovery Architecture” increase interpretation work. Vitals repeats status in selector tiles, the selected chart header and an inspection callout. |
| Crew | Shared-week total and a visual relay connect individual activity to a group outcome. | The total, target/baseline label, relay and standings need a clear division of purpose so the same progress is not restated. The target/baseline distinction itself is essential and must survive simplification. |
| System | Shared palette, semantic typography and platform adapters establish a recognizable foundation. | Consistent components cannot decide content priority. A universally available subtitle, badge or card can encourage unnecessary additions. |

Source locations:

- [Native Home](../../apps/mobile/app/(tabs)/today.tsx),
  [web Home](../../apps/web/src/features/today/today-screen.tsx),
  [weekly chart](../../apps/mobile/src/features/week-chart.tsx),
  [daily health](../../apps/mobile/src/features/daily-health.tsx).
- [Compete](../../apps/mobile/app/(tabs)/arena.tsx) and
  [competition summary](../../apps/mobile/src/features/competition-summary.tsx).
- [Progress](../../apps/mobile/src/features/progress-screen.tsx),
  [training history](../../apps/mobile/src/features/training-history.tsx),
  [analytics matrix](../../apps/mobile/src/features/athlete-telemetry-matrix.tsx),
  [analytics details](../../apps/mobile/src/features/athlete-telemetry-details.tsx).
- [Crew](../../apps/mobile/src/features/crew.tsx) and
  [section primitives](../../apps/mobile/src/ui/section.tsx).

## Anti-patterns to stop introducing

1. **Introductions before content.** Do not stack a kicker, title, subtitle,
   section heading and card explanation before a metric or action.
2. **Instructions for obvious controls.** “Tap to view” spends a line explaining
   the interaction rather than helping the user decide whether to open it.
3. **Inspirational filler.** An empty state should make the available action
   understandable. A second motivational heading must earn its space.
4. **Repeated readings.** Repeating the selected metric/status across tiles,
   headers and callouts makes users reconcile information they already understood.
   Selection details may need a different date/value; preserve that distinction.
5. **Technical language as visual sophistication.** Use familiar metric names.
   Explain necessary specialized concepts on demand, with honest units and limits.
6. **Uniform prominence.** Equal-sized modules can make missing data or secondary
   features compete with the primary result. Content priority comes before cards.
7. **Copy used to repair composition.** If hierarchy or affordance is unclear,
   adding permanent explanation usually makes the screen longer without fixing it.

The owner explicitly identified excessive generated headers and supporting copy
as a recurring problem. Text restraint is now a composition requirement in the
[design guide](../design-guide.md), not an optional final copy-edit pass. Future
UI work should demonstrate the primary task and explain the need for added copy.
Necessary dates, units, provenance, error recovery, accessibility and consequences
remain part of the interface.
