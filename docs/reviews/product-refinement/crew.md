# Crew — product refinement

Retain the existing product's shared visual. Both new layouts use the actual native `CrewRelay` and shared `crewWeekRelay`/`crewRelayScene` rendering. Two optional presentation props let the parent suppress repeated target/readout text and open a member from the trail; production defaults are preserved. The current Alpine Trail image, avatar, section, typography and navigation components remain the visual foundation.

| Direction | Composition | Tradeoff |
| --- | --- | --- |
| Shared clubhouse | Merge the current crew photo/identity card and shared trail into one card. The first upcoming session is a full ticket below; member contributions and weekly comparison follow as open sections. | Strong crew identity and a clear next meetup. The combined card has more vertical weight. |
| Together first | Compact crew identity, centered shared mileage and the familiar open trail. Visible member contributions with proportional bars come next, then horizontally browsable session tickets. | More emphasis on collective effort and people; less photographic identity. |

No menu of hidden content underneath the hero. A user sees the next meetup's place, time, distance and attendees; every member's distance, session count and latest activity; and a real weekly comparison before opening a detail screen.

## Depth and interactions

Member → public member summary → weekly training plot → individual counted receipt. All contribution percentages and totals come from the same four-member/12-session fictional dataset. The configured 100-mile target is explicitly separate from last week's 68.2 miles.

Session ticket → date/time/location/plan → attendee member → Back → reversible RSVP. Updating RSVP updates the ticket and attendee count; plans never contribute mileage. Crew settings includes a local rest-week preview, with the product distinction from score freezes. Invite is a complete visual invitation preview without sending or joining a live crew.

Review `/refine-crew?concept=1|2`; `&compare=1` for independent phones and `&clean=1` for product-only composition. Native route: `overtaek:///refine-crew`.

Screenshots: [clubhouse](crew-1.png), [open trail](crew-2.png), [member](crew-member.png), [session](crew-session.png).

## Validation and limits

Mobile typecheck, iOS Hermes export, Expo web visual review and session → member → Back/RSVP interaction checks. Native installed-device VoiceOver, large text and gestures remain. Fixture values are isolated from live crew permissions, API reads/writes and account state. Existing production create/cancel/manage flows are not replaced by these composition studies.
