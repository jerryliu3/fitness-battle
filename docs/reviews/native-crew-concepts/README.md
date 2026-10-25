# Crew — nine ways to make the shared effort visible

Part 3 of the sequential native study. Expo route `/study-crew`; development-build
deep link `overtaek:///study-crew`. Focus with `?concept=constellation`, or compare
with `?compare=1`. Server instructions are in the [Compete review](../native-compete-concepts/README.md).

The core question is not merely who belongs to a crew. It is how separate
efforts become something shared, and how a member can inspect the people and
activities behind that total. Production already has private membership,
aggregate progress, invitations and Start Line intentions. This study reorganizes
those concepts without a feed, new messaging system, rewards or backend writes.

| Concept | Shared visual | Information hierarchy | Main cost |
| --- | --- | --- | --- |
| Shared Journey | Winding distance route with exact proportional progress | Journey → contributions → member → sessions | Expressive geometry needs a numerical companion |
| Contribution Mosaic | Member tiles sized by contribution | Tile → member; combined total above | Tile area can imply unequal social value |
| The Relay | Continuous member-colored strip and connected roster | Total → individual contribution → activity | Must not imply a literal sequential race |
| Crew Constellation | Equal member orbits around combined miles | Person → contribution story | Best for small crews; large rosters need grouping |
| The Clubhouse | Crew crest, shared target, people row | Three doors: progress, members, sessions | Detail is one tap deeper |
| People First | Sortable faces and contribution bars | Directory → detailed member profile | Can feel competitive rather than cooperative |
| Shared Calendar | Inspectable daily combined-distance bars | Day → contributors → member | Must separate recorded effort from planned events |
| The Start Line | Upcoming-session ticket plus shared-progress card | Plan → local RSVP → attendee | Plans must never count as completed volume |
| Crew Chapters | Weekly receipts with member-colored breakdown | Recap → contributions → member → sessions | History can overshadow the present |

The Everyday Club navy/yellow/teal/white tokens anchor all nine. Member colors
identify parts of one whole; contribution is not a score of belonging. The
constellation intentionally gives everyone the same-sized node. The journey
marker is calculated along the same polyline as its progress stroke, so its
position reflects the displayed fraction rather than a decorative fixed point.

## Working depth

- Two crews with different member counts, configured targets and combined totals.
- Shared visual → contribution breakdown → member share/history → counted
  sessions → activity receipt. Member achievements have a separate destination.
- Historical recap scales the aggregate, member amounts and sample activity
  receipts together. These are fictional proportional examples, not backend data.
- Shared Calendar selects an actual daily sample bucket; the day shares sum to
  the weekly total. The zero-activity day has an honest empty explanation.
- Start Line detail supports local RSVP and undo. Open an attendee, return, and
  the local selection remains. No message, invitation or RSVP is sent.
- Invitation is a labeled visual preview. Preferences include an editable name
  and positive-distance validation with local save feedback; no crew is changed.
- First-crew and unavailable states have clear recovery to the populated sample.
- Native full-screen Modals preserve the mounted parent and support Back/Done.

The target is explicitly **configured shared distance**, while previous-week
distance is a separate comparison. Private member activity is not exposed by a
public profile. Production would retain membership authorization and the existing
aggregate read/write paths. None of these prototypes change scoring or RLS.

## Inspiration and review recommendation

The supplied Strava and club screenshot boards suggest prominent totals,
legible member rows and a clear crew identity. The shared-progress visual is the
new question to evaluate here, not a copied leaderboard or social feed.
[Peloton Teams](https://www.onepeloton.com/teams) helps frame the relationship
between shared goals, community and weekly rank; our prototype keeps the
cooperative total and drops the feed and new challenge system.
[Goalmaxxing #1278](https://github.com/jerryliu3/goalmaxxing/pull/1278) provides
light inspiration for glance → detail → source depth, without its goal/task model.

Review Journey for emotional shared progress, Constellation for equal belonging,
and Clubhouse for scalable organization. Mosaic and People First deliberately
test how strongly individual volume should shape the root. These remain open
alternatives, not a production selection.

## Verification

Nine 390×844 roots are captured in `01-phone.jpg`–`09-phone.jpg`. Member and RSVP
screens are captured separately. Tests render all nine, check additive totals
and journey endpoints, switch crews, traverse shared → member → session, retain
and undo RSVP, and reject a negative target draft. PR validation records the
workspace typecheck, iOS Hermes export and browser width checks. Device-only
accessibility, keyboard and system gesture behavior still need device QA.
