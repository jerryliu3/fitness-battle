# Follow-up: the field and the moments around it

[PR #379](https://github.com/jerryliu3/fitness-battle/pull/379): one additional direction across the tabs, stacked on Profile #355. These are isolated native study routes with fictional data. No production screen, scoring, account or backend behavior is selected or replaced.

## Compete: three rebuilt directions

The main `/refine-compete` route now contains three field-first directions. The user's existing concept links retain their meaning:

1. **The open field** (`?concept=1`): compact event chooser, then a larger field. This is the additional direction; it replaces the leaderboard-first weekly board in this collection.
2. **Your meets** (`?concept=2`): a shorter snapping carousel with next-card peek, then the field. Cards establish event context without duplicating the whole map in every card or moving it offscreen.
3. **Sport rooms** (`?concept=3`): sport tabs, named course and source lens, then the field.

All three default to the actual product `LaneTrack` 2D scene. All support the actual `Arena3D` renderer, expansion, centering, zoom/pan, athlete selection and a selected-athlete preview leading to detail. The map and leaderboard derive from the same `board` fixtures. Running/cycling use distance; strength uses effort points on the field and labels its separate accumulated minutes in standings. GPS is unavailable for strength and resets when choosing it. No imitation map replaces the product scene.

Source changes remount the field intentionally so a sport's viewport cannot leak into another sport. Expanding remounts the renderer while retaining parent center/span/selected athlete and 2D horizontal anchor. This is not a shared-element transition. Native 3D uses the existing credential-free WebView bridge and requires its configured web renderer; an unavailable renderer returns to 2D with an explanation.

The review-only scenario control switches Midweek / Closing / Final. The field remains primary in every scenario. Midweek and Closing have an expandable position card; Final adds a podium after the map and preserves the full table. These are alternate presentation moments of the same fictional field, not simulated live settlement or a countdown clock. Dates and totals stay fixed for comparison. Existing past results and athlete/source drilldowns remain available.

The preceding leaderboard-first Compete prototypes remain at `/refine-compete-previous` for reference; the previous PR branches preserve their original implementation as well.

## Progress: the living portfolio

`/refine-next?tab=progress` uses the existing calendar buckets and range navigation. Week is a daily line, Month/Year accumulated bars. Selecting a chart bucket updates the large total, sport distribution, active days and visible session rows together. Show all clears the selection. Sport filters and previous/next navigation reset it. A selected quiet day shows a deliberate empty state, without invented effort. Rows lead to the existing session detail; atlas and the full matching journey remain deeper destinations.

## Crew: every mile has a face

`/refine-next?tab=crew` integrates identity and the actual shared trail into one card. Trail member selection opens an inline person preview; the detail uses the same scenario totals. Plans and member contributions remain visible beneath the visual.

The review-only Quiet / In motion / 100 miles control supplies three fictional snapshots. Quiet has no activity entries and does not imply that members are absent. In motion uses the existing 76.8-mile fixtures. The milestone snapshot proportionally scales those fixtures to 100 miles, clearly as a separate visual scenario. The trail, summaries, contribution shares and member details agree within each scenario. No new reward entitlement or activity is created. Session RSVP still uses the existing reversible local preview.

## Profile: the earned passport

`/refine-next?tab=profile` uses the existing editable Profile and owner/public behavior. The new card has a deep teal ground, a restrained club stripe, three integrated PB medallions and a consistency signature. A dated milestone path below the card connects achievements to their existing record details and source activities. This explores personal history and a shareable identity without defining paid tiers or unlock rules. Existing settings, editing, pinning, public visibility and units continue to work through the same prototype components.

## Review links

The current follow-up server uses port 8084:

- Hub: http://localhost:8084/refine
- Compete / Open field: http://localhost:8084/refine-compete?concept=1
- Compete / Your meets: http://localhost:8084/refine-compete?concept=2
- Compete / Sport rooms: http://localhost:8084/refine-compete?concept=3
- Progress: http://localhost:8084/refine-next?tab=progress
- Crew: http://localhost:8084/refine-next?tab=crew
- Profile: http://localhost:8084/refine-next?tab=profile

Use `compare=1` to compare Compete directions and `clean=1` to remove review controls. Compete supports `moment=closing` or `moment=final` on entry. The existing four-tab bar stays inside this follow-up collection; its avatar opens the earned Profile. Home opens the actual Home screen. Earlier Progress/Crew/Profile alternatives remain at their original `/refine-*` URLs.

No additional QA, automated tests, type checks or exports were run for this follow-up, as requested. The preceding stack's recorded validation does not cover these changes. Installed-device behavior and visual refinement remain to review before adopting any design into production.
