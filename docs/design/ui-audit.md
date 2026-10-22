# Everyday Club implementation audit — October 22, 2026

The owner selected the supplied Everyday Club reference and explicitly authorized implementation on web and native, retaining yellow/Ember, no recording entry point, no social feed, and 2D as the default field. This supersedes the attachment's earlier three-direction approval workflow. Existing design explorations remain archived.

## Inventory

Web uses the persistent PhoneShell, Focus CSS, Radix sheets/tabs, activity actions, SessionStage, FieldStage, TrainingAtlas, effort charts, SeasonHistory, CrewPanel and settings forms. Native uses AppHeader/PhoneTabBar, FocusButton/Segments/Sheet/Disclosure, SVG lanes, native training/record charts, Crew screens and stack settings. Existing controls include native switches, radio-like sport choices, checkboxes, filters, selects, zoom sliders, editable profile inputs, destructive confirmations, loading/error messages and undo. Several surfaces have independent legacy colors, borders and typography. Live data, demo disclosures, OAuth, registration and RPC paths remain authoritative.

## Highest-impact findings

| Priority | Location / evidence | Classification | Change / reason |
| --- | --- | --- | --- |
| 1 | Home starts at chart without greeting or next action | Product decision | Welcoming overview, then current competition |
| 2 | Compete registration buttons stretch into tall rows at desktop | Consistency | One explicit selector and swipeable event page |
| 3 | Home has no next-rival context despite available standings | Product decision | Show actual next higher-place row and gap |
| 4 | Progress starts with lifetime totals and a large rating chart | Product decision | Lead with selectable training timeframe |
| 5 | Week results only accessible through a small link | Product decision | Preview the latest settled week with honest totals |
| 6 | Yellow, green and charcoal literals duplicated across layers | Consistency | Shared semantic tokens with compatible aliases |
| 7 | Header and score rail use much of mobile first viewport | Validation hypothesis | Compact header and move score rail into overview |
| 8 | Heavy bottom borders on almost every card | Consistency | Quiet surfaces, reserve depth for achievements/results |
| 9 | Secondary copy is often 9–11px | Established principle | Increase supporting text where practical |
| 10 | Several separate primary actions compete in settings | Established principle | Yellow action, outlined secondary, quiet navigation |
| 11 | No basic milestone shelf outside closed-week medals | Product decision | Derived sessions/effort milestones, no entitlements |
| 12 | Activity detail hides distance/source in expanded rows | Product decision | Clear summary metrics and counted status |
| 13 | Crew identity has no landscape/art anchor | Validation hypothesis | Illustrated shared destination, existing actions |
| 14 | 3D world uses unrelated pale green environment | Consistency | Alpine teal/gold world retaining viewport math |
| 15 | Web/native have independent spacing and headings | Consistency | Shared type/radius/spacing contracts and adapters |

## Inspection and limits

Inspected repository production routes and running web Home/Compete; native source inspection is distinct from device testing. Responsive and interaction verification will be recorded with final screenshots. No device behavior is claimed from Expo web. The locked Next 15.5 installation does not include `dist/docs`; consulted official version-15 CSS and server/client component guides instead. Existing score, period, enrollment, authentication and storage logic is preserved.
