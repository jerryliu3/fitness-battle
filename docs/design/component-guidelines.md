# Everyday Club component decisions

| Component | Purpose and behavior | Avoid | States / access |
| --- | --- | --- | --- |
| Primary button | Execute the page's principal action, yellow with dark label | Navigation everywhere / recording | 44px minimum, focused, pressed, loading, disabled |
| Secondary button | Optional or reversible action, quiet border | Competing primaries | Same hit target and focus |
| Link / row | Navigate to detail, chevron and descriptive label | Fake action button semantics | Keyboard link behavior, focus return |
| Segments | Short mutually exclusive options in a rounded group; use underline tabs for top-level section navigation | Long lists of sports | Group + pressed buttons on web; native tabs |
| Choice / radio | Mutually exclusive settings | Independent selections | Name, selected and disabled state |
| Checkbox | Independent filters or selections | Immediate settings | Explicit checked state |
| Switch | Immediate binary preference | Submitting a form or choosing a sport | Named checked state; native Switch |
| Menu / picker | Compact commands or event selection | Hiding a few important choices | Keyboard selection; native sheet rows |
| Chips | Short filter state | Navigation pretending to filter | Selected state beyond color |
| Slider / stepper | Bounded exploration / exact increments | Entering unbounded numbers | Accessible value and increments |
| Surface | Group a meaningful task or summary | Every text fragment in a card | Quiet borders; 20px radius |
| Sheet / dialog | Contextual detail or confirmation | Full unrelated journeys | Focus heading, Escape/Back, return focus, scroll lock |
| Chart | Real units, dates and inspectable values | Invented historical interpolation | Accessible labels and text receipt |
| Milestone | Derived personal progress | Invented medals, unlocks or rewards | Threshold, source and earned/next text |

Use DM Sans, dark navy text, pale neutral canvas, white surfaces, yellow actions and teal chart/landscape accents. Never use yellow for small text on white. Minimum web controls and native touch regions are 44px; maintain contrast and visible keyboard focus. Selected states also have shape/text/weight. Pending and errors preserve input; successes describe the actual outcome. Native sheets retain the parent and support system Back; web sheets use Radix focus management. Respect reduced motion and do not trigger haptics from decorative animation. No recording destination or social feed is introduced.

October 23: use the shared icon-only Back control, compact picker, photo commands and step-motion primitives. Full-screen Members and Athlete destinations cover the shell header. Floating navigation reserves content clearance and retains reduced-motion support.

October 23 mobile consumer polish: use open full-width sections with quiet bottom dividers for continuous Home/Progress/settings content; reserve four-sided cards for meaningful groups, artwork and multi-column summaries. Native sport presentation uses system emoji consistently. Segments move one measured highlight (or underline) over 240ms, with an immediate reduced-motion state. Chart inspection follows actual rendered points with a crosshair, value/date receipt, bounded selection haptics and accessibility adjustment; embedded vertical scrolling must remain available. Selected bottom-tab icons/labels use Ember yellow on a dark tinted pill for contrast. See the [mobile audit](../reviews/mobile-consumer-ui-audit-2026-10-23.md) for scope and device verification limits.
