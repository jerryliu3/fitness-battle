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

October 23 mobile consumer polish: use open full-width sections with quiet bottom dividers for continuous Home/Progress/settings content; reserve four-sided cards for meaningful groups, artwork and multi-column summaries. Segments move one measured highlight (or underline) over 240ms, with an immediate reduced-motion state. Chart inspection follows actual rendered points with a crosshair, value/date receipt, bounded selection haptics and accessibility adjustment; embedded vertical scrolling must remain available. Selected bottom-tab icons/labels use Ember yellow on a dark tinted pill for contrast. See the [mobile audit](../reviews/mobile-consumer-ui-audit-2026-10-23.md).

The owner follow-up replaces the temporary sport emoji with **Tabler Icons** for native sports and utility chrome. Use the shared mobile `AppIcon` catalog at 1.8px stroke; the streak uses its filled flame. Provider marks and product illustrations retain their distinct roles. Group profile → effort score → streak on the left of the header, with Debug on the right and no additional enclosing card. Use a full-pixel `#d0dad7` section divider from `mobileSurfaces`, including Latest activity, achievements and Crew; device hairlines were too faint. Keep the hierarchy review light. Inline competition previews adapt to phone height; expansion retains the same distance window. See the [follow-up decisions and checks](../reviews/mobile-refinement-2026-10-23.md).

## Semantic typography and sections (October 24, 2026)

The shared contract is `SHELL_TYPOGRAPHY` and `SHELL_SECTION` in
`packages/shared/src/shell.ts`. Platform components live in each app's
`src/ui/section.tsx`; shared stays plain TypeScript. Keep HeroUI Native and web
Radix controls. DM Sans uses the actually loaded 400/500/700 weights.

| Role | Size / line height | Weight |
| --- | --- | --- |
| pageTitle | 30 / 36 | 700 |
| navigationTitle | 20 / 26 | 700 |
| sectionTitle | 22 / 28 | 700 |
| contentTitle | 18 / 24 | 700 |
| body | 16 / 24 | 400 |
| itemTitle | 14 / 20 | 500 |
| supporting | 14 / 20 | 400 |
| actionLabel | 14 / 20 | 700 |
| caption | 12 / 18 | 400 |
| badgeLabel | 12 / 16 | 700 |

Use AppText for text roles, PageHeader for a large page introduction and
SectionHeader for a content group. ScreenHeader remains the centered compact
Back layout. Section supplies a heading and 12-unit content gap without adding
a card. SectionStack alone owns peer boundaries: 28 units without dividers, or
16 before a full 1-unit #d0dad7 divider and 12 after. The same divider applies
on both platforms. Do not combine a stack boundary with feature outer padding.
A header subtitle is 4 units below its title. Mobile gutters are 20; desktop
columns remain adaptive. Surface uses the existing 20-unit card radius.

TextAction uses 14/20 bold type, a minimum 44-unit target and a specific
accessible name, such as “View all achievements.” Headers wrap their action to
a new row when space is insufficient. Native reserves more title space as
font scale increases, permits multiline text and leaves font scaling enabled.
Web uses rem units. StatusBadge expands with its label and supports neutral
and success tones plus an optional icon; achievement illustrations stay intact.
ListRow separates item titles and supporting copy from headings.

The contract is applied throughout production Home, Compete, Progress, Crew,
Athlete/settings, onboarding, notifications, authentication, history, awards,
sleep/recovery, rankings and supporting sheets on web and native. Achievements
remains on Progress. Shared page stacks own peer spacing; Sections own the
12-unit relationship between their header and content. Cards retain their own
inner padding and do not add another section boundary.

Native feature and route text consumes AppText or the UI-owned textStyle adapter.
Web uses AppHeading, AppParagraph and AppText, with shared CSS variables for
product control/row classes. Page titles, centered navigation, section titles,
card titles, explanatory copy, row titles, subtitles, captions and status labels
have distinct roles. Numeric metricValue/metricUnit and controlSymbol roles
prevent numbers and arrows from inheriting heading semantics; avatarInitials
is separate from content headings. Native body copy is 16/24 across production.

Legacy f typography aliases and web SectionHeading remain only for compatibility
with historical studies and UI internals. New production consumers must use the
semantic adapters. `pnpm lint:ui` checks all production feature and route files,
authentication/components and supporting product pages; it rejects raw text font
overrides, legacy f text aliases and raw HTML headings. Its checked-in exceptions
are deliberate score, time, distance, rank and chart scales. SVG labels and map
renderer overlays retain geometry-specific type; historical brand/mascot studies
and prototypes retain their exploratory typography. Do not use those exceptions
for ordinary content.

October 24 rollout validation: semantic UI lint and source syntax/import review
were completed. The owner explicitly requested skipping typecheck and tests for
the expanded rollout; no build or runtime/device verification was run for that
follow-up. Earlier pilot verification does not validate the expanded changes.

Review galleries: web `/design/components` under the existing design access
gate; native `/components` (development review deep link). Check 320/390/430
widths, desktop, 200% web zoom, large native text, long labels, empty/populated/
error content, focus and screen-reader names. The gallery's state examples are
illustrative; they do not replace validation on the live pilot routes. Native
keeps the light Everyday Club palette under either system appearance.
