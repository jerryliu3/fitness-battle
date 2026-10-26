# Compete — product refinement

This follows the review of #340 but starts from `origin/main`, with no imports or code copied from `tab-studies`. The actual native app provides AppText's five recipes, FocusSegments, FocusSheet, PhoneTabBar, UserAvatar, PolishedRacer, chart inspection, gutters and palette. Fixtures and navigation live separately from production state.

## Three directions

| Direction | Product mutation | Tradeoff |
| --- | --- | --- |
| The weekly board | Replace field-first chrome with a full leaderboard. One event picker establishes scope; Open/GPS is grouped directly below it. Accumulated volume and your place sit above the list. | Best leaderboard visibility; other sports require the picker. |
| Your meets | Turn the current event carousel into actual horizontally snapping cards with next-card peeking and accessible page controls. The selected meet drives the score lens and leaderboard below. | Strongest multi-sport identity; summaries take more vertical space. |
| Sport rooms | Make the three registered sports persistent top-level tabs. The selected sport's meet card encloses its summary and source lens; its leaderboard is an open section beneath. | Fastest event switching; best when registered sports fit the tab rail. More sports would need a picker. |

Chase is a compact contextual card below standings. Podium belongs to closed-week results. No primary in-week podium, arbitrary sport/source button cluster, recording action or social feed. Strength shows Open only; moving from GPS to Strength resets the lens. The source explanation spells out manual versus verified activity without claiming connectivity.

## Review

Run `OVERTAEK_STUDY_PREVIEW=1 pnpm --filter @fitness-battle/mobile exec expo start --web --localhost --port 8083`.

- `/refine` — review hub.
- `/refine-compete?concept=1` (or 2/3) — concept chooser and full interactive screen.
- `&compare=1` — independent 390×844 screens side by side.
- `&clean=1` — remove review toolbar for actual product composition.
- Native route: `overtaek:///refine-compete`.

Try event selection → GPS → Strength; leaderboard athlete → counted sessions → receipt → Back; next rival → accumulated comparison; history → final podium → historical session dates. Back preserves the screen and the previous detail. Done closes the detail stack.

Screenshots: [board](compete-1.png), [meets](compete-2.png), [sport rooms](compete-3.png), [receipt](compete-session.png).

## Scope and validation

Static fictional Thursday, October 22 snapshot; six athletes and three registered sports. This is a visual implementation candidate, not backend integration. No registration, tracker, period, rating, storage, entitlement or account writes. The map is an illustrative secondary capsule preview; production field gestures/grounds remain in the existing product.

Mobile TypeScript and iOS Hermes export pass. Expo web reviewed at 390px; actual device gestures, VoiceOver and large-text review remain device checks. Native bottom tabs use the product PhoneTabBar here for predictable cross-platform review; installed iOS uses NativeTabs in production.
