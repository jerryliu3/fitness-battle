# Paired recap implementation review

Scope: recap presentation, navigation, measurement/lifecycle, training data,
result acknowledgment and existing replay/field-choice entry points. The review
covered both platform implementations and their shared helpers. No scoring,
registration, settlement, privacy or database write rules were changed.

## Result

Both platforms now use one opening page and two adjacent pages per displayed
sport. Product sport order is running, cycling, walking, strength. The existing
`roundReveal` still chooses the display track and returns the complete set of IDs
to acknowledge, including the other track. One page index drives content,
navigation and progress. Only Done or sport settings on the final page invokes
the existing completion callback. Back, receipt inspection and replay do not.

Natural-size readings are centered in the available space. A measured fit scales
only the reading when needed; headings and navigation stay outside that transform.
The existing native application is portrait-only. Web short landscape uses two
columns. Explicit larger-text settings use a scrollable reading, preserving the
requested larger type instead of scaling it back down. Replay and field choices
retain their focused viewers, with the recap position preserved underneath.

## Findings addressed

| Finding | Resolution | Evidence |
| --- | --- | --- |
| Each stage rendered every sport, producing long pages and fixed progress counts. | Shared ordered result/training pairs; dynamic progress count and one page index. | Shared page-order tests, native navigation tests and five-page browser walkthrough. |
| Web used lexical timestamp comparisons and fixed 24-hour chart buckets; native used different calendar logic. | One shared half-open, instant-based filter and Eastern calendar-date series. | Tests cover fall-back repeated hours, late Sunday, spring-forward, exclusive end, offset encodings, eligibility, GPS exclusion and non-GPS strength. |
| A reopened recap receives display copies with acknowledgments cleared; using those copies for celebration can treat an old result as new. | Check the original committed result when deciding earned haptics. | Native regression test reopens an already acknowledged result and confirms no earned celebration. |
| New page mounts could leave keyboard focus on removed controls. | Focus the new heading without scrolling; retain Radix focus handling for details. | Browser verifies heading focus on each page and return from replay. |
| Adding unit suffixes to narrow Y ticks clipped their values. | Numeric axis ticks with the unit in the axis label; inspection values retain units. | Browser measures every SVG text label at each tested size. |
| Tilted result cards could extend into the fitting frame's clipped edge. | Reserve a small inset around measured readings. | Captured result pages and receipt-toggle walkthrough. |
| Native full-screen replay has a light surface under the dark recap's light status bar. | Replay owns a status-bar style matching the selected light or dark appearance. | Existing native replay tests include the status-bar assertion. Physical-device appearance is not verified. |
| Dismissed UI state could persist across an account change or a new debug reveal. | Reset presentation dismissal for account/query/debug identity. | Source review of wrapper guards and callback ownership; browser verifies a completed recap reopens at the opening page. Account-switch device testing was not performed. |
| Generic fitting would cancel explicit larger-text settings. | Preserve unscaled type and local scrolling in larger-text mode. | Browser verifies the larger-text mode at 150%; native uses the system font-scale value. |

## Review against current main

Rebased onto `6859e320` and reviewed the combined diff. Preserved current
appearance hooks, replay timeline, result-card colors and safe-area handling.
Recap chart surfaces follow the selected appearance; yellow CTA labels use the
shared action-text token. Removed superseded three-stage screenshots from the PR.

## Simplification

- Removed the old all-sport loops, native four-stage switch, dead web stage branch
  and separately maintained chart aggregation. Neither platform carries its own
  date-bucketing implementation now.
- Kept route/acknowledgment wrappers separate from presentation. The presentation
  components receive a completion callback rather than writing account state.
- Kept measurement platform-specific and small. Web measures untransformed layout
  and disconnects its ResizeObserver; native uses layout events. No fitting timer,
  autoplay progression or background presentation clock was introduced.
- Reused result cards, replay modals, field choices, chart inspection, existing
  haptics and shared typography/colors. The earlier dark-surface option on social
  actions is unnecessary now that those actions open on their normal themed sheet.

## Validation

- `pnpm typecheck`, `pnpm test`, `pnpm lint:ui`, web production build and
  `git diff --check` passed.
- Full workspace test run: 1,417 passed. Five pre-existing web tests were skipped.
- Browser checked every page at 390 × 844, 320 × 568, 430 × 932 and 844 × 390:
  40 page/viewport/appearance checks (light and dark), without horizontal or vertical page overflow. The
  reading and yellow CTA remain within the viewport in each case.
- Standard portrait phones render the readings at natural size. The small-phone
  fit is modest. Short landscape reflows into two columns rather than heavily
  shrinking the reading. Source screenshots are linked from the gallery.

  | Viewport | Reading scale across all five pages |
  | --- | --- |
  | 390 × 844 | 100% |
  | 320 × 568 | 86.9–100% |
  | 430 × 932 | 100% |
  | 844 × 390 | 97–100% |

- Browser checks also cover receipt expansion, Back, replay return, final
  dismissal, reopening, chart-label clipping, heading focus, larger text and CTA
  colors. No browser runtime errors were reported.

No remaining actionable findings were identified in this scoped source review.
Native code was typechecked and exercised with component tests; native on-device
layout, physical haptics and screen-reader behavior were not device-tested.
Screenshots use local synthetic data and do not establish live tracker or map
configuration.
