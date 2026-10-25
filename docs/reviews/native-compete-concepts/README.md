# Compete — nine native compositions

This extends the structural exploration in [Home #328](https://github.com/jerryliu3/fitness-battle/pull/328).
Unlike that responsive web study, these are React Native components, native SVG
visuals and native full-screen Modals. Production tabs, account data and scoring
are untouched. Every athlete, session, rating and result is fictional.

## Review

From the repository root:

```sh
OVERTAEK_STUDY_PREVIEW=1 pnpm --filter @fitness-battle/mobile exec expo start --web --localhost --port 8083
```

Open `/study-compete` on the Expo server. On an installed development build, use
`overtaek:///study-compete`. `?concept=chase` focuses a concept; `?compare=1` lays out
all nine. Compare, concept selection and a session-local shortlist live outside
the proposed app screen. The illustrative bottom tab bar is orientation chrome;
it does not navigate into production. Inside each frame, scroll for deeper
sections. No new packages, authentication bypass or API writes are introduced.

## Scope and alternatives

Compete must answer: Which event? Where am I? Who is ahead? What counted? What
happened last time? The board is the core object, with event and historical
context around it. This study deliberately avoids live racing claims, a new
reward economy, social feeds and speculative competition formats.

| Concept | Structural choice | Nested emphasis | Main cost |
| --- | --- | --- | --- |
| 01 The Standings | Large personal place, full-width athlete rows | Athlete → sessions → receipt | Least distinctive atmosphere |
| 02 The Chase | Rival hero, gap comparison, proportional ladder | Rival comparison → athlete | Proximity can dominate the whole field |
| 03 The Podium | Spatial top three, lower places below | Podium athlete → counted sessions | Uses more height for the leaders |
| 04 Meet Cards | Three event tickets, each with a miniature board | Meet → full roster → athlete | Extra tap to complete event standings |
| 05 Sport Switchboard | Sport rail beside a compact leaderboard | Switch sport in place → athlete | Narrower names and values |
| 06 Season Ribbon | Current and settled weeks at the same level | Week selection → athlete; archive → receipt | History competes with the active round |
| 07 Race Room | Dark instrument panel, aligned compact table | Rival and rules from dense board | Higher reading density |
| 08 Field + List | Illustrative trail over exact ranked rows | Athlete row → detail | Visual and list duplicate information |
| 09 The Trophy Room | Last result as hero, current round as a door | Final board → athlete; archive → week | Best for return visits, weaker midweek |

These are nine authored compositions, not nine palettes of the same dashboard.
Shared primitives keep type, target sizes and fixture behavior consistent. Navy,
yellow, white and teal use the Everyday Club foundation; Race Room intentionally
tests an inverse surface. No production token change is proposed.

## Interaction coverage

- Running/Cycling/Strength switch real fixture context. Strength has Open only.
- Open and GPS change both volume and effort fixtures. Volume and effort rating
  have separate labels. GPS does not claim a connected tracker.
- Athlete → counted sessions → receipt supports explicit Back and Done.
- Parent screens stay mounted behind the Modal; nested detail pages retain
  their scroll containers. Android Modal Back pops one level via onRequestClose.
- Rival charts support drag, point buttons and accessibility increment/decrement.
- Past results → settled week → standings → athlete; result receipt explains
  Eastern Monday–Monday half-open periods. Past-self is not ranked.
- New athlete and unavailable states are selectable and recover to populated
  sample data; unavailable standings are never represented as zero.
- The prototype does not join events, send kudos, persist settings or modify
  scoring. Public per-session visibility is a production privacy decision.

## Reference decisions

The supplied screenshot boards suggest legible athlete rows, prominent totals,
and separate personal and shared views. They are inspiration, not instructions.

- [Strava club leaderboards](https://support.strava.com/en-us/articles/15402172-clubs-on-strava):
  borrow the direct ranked-list hierarchy; retain our own period/track semantics
  and deeper archived results. Do not add its feed.
- [Peloton Teams](https://www.onepeloton.com/teams): borrow the relationship
  between shared goals and weekly rankings, not its community feed or challenges.
- [Goalmaxxing #1278](https://github.com/jerryliu3/goalmaxxing/pull/1278) and
  [#1284](https://github.com/jerryliu3/goalmaxxing/pull/1284): borrow summary →
  detail → item depth and explicit gesture alternatives. Do not import its
  productivity features, brand or persistent Now bar.

Recommended first review: Standings for clarity, Chase for motivation, Season
Ribbon for history. Meet Cards is strongest when several sports are active.
The decision remains open; no production layout has been selected.

## Verification

Phone captures `01-phone.jpg` through `09-phone.jpg` show all nine at 390×844.
`rival-detail.jpg` shows point inspection inside a nested page. Browser checks
cover athlete → session → Back, all nine roots and comparison chart selection.
The interaction test renders all nine, switches GPS/Strength, traverses nested
sessions and results, and checks fixture rank ordering. See the PR description
for final typecheck, test and iOS export results. Expo web review is not device
validation of VoiceOver, Android Back, text scaling or edge gestures.
