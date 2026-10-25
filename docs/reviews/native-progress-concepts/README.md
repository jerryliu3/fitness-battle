# Progress — nine native perspectives

Part 2 of the sequential native study, following Compete. Review on the Expo
server at `/study-progress` or `overtaek:///study-progress` in a development build.
Use `?concept=atlas` or `?compare=1`. Start the server with the command in the
[Compete review](../native-compete-concepts/README.md). These are React Native
components shared between native and Expo web, not HTML mockups.

## What this tab must organize

Progress is a personal archive, not another Home dashboard. It needs short and
long time ranges, sport context, inspectable buckets, source activities, rating
history, records, and optional health trends. A small summary should open a
readable detail, which then opens the source object. Health values, training
duration, competition volume and effort rating remain separate quantities.

| Concept | First object | Main nested route | What we are evaluating |
| --- | --- | --- | --- |
| Training Portfolio | Total hours + full-width chart | Range → bucket → session | Does one number provide enough orientation? |
| Calendar Lens | Selectable month calendar | Date → counted activities | Is recalling a date easier than choosing a chart range? |
| Signal Library | Four metric instruments | Metric → chart / source explanation | Can users find the right question quickly? |
| Training Journal | Chronological day/session rail | Day → session receipt | Do individual sessions make history more human? |
| Year Atlas | Ten elapsed-month tiles | Month → activity bucket | Is long-term rhythm useful before exact values? |
| Then & Now | Paired period totals | Comparison point → source bucket | Is the baseline understandable for incomplete periods? |
| Activity Clock | Five-of-seven active-day ring | Week explorer → day → activity | Can consistency lead without creating daily pressure? |
| Personal Bests | Large record hero + collection | Record → source effort / record chain | Is achievement a useful entry to ordinary training? |
| Monthly Chapters | Editorial monthly story cards | Month → weekly chart → week → sessions | Does a narrative make historical browsing inviting? |

Each concept has authored composition and hierarchy. Shared destinations give
all nine access to training history, effort history and qualifying records.
The dark record hero and inverse metric instrument remain within the navy,
yellow, white and teal Everyday Club foundation.

## Working interactions

Training explorer supports Week/Month/Year, individual sport shares, tap/drag
inspection, point-button alternatives and bucket → sample activity → receipt.
The chart's selection is owned inside the detail page; it remains interactive
after navigation. Open/GPS effort history changes the actual sample series.
Calendar dates beyond the study's Oct 25 cutoff are disabled; zero-activity days
open honest empty content. The calendar and month/week totals are consistent.

Personal records open their source session and an earlier qualifying effort.
Monthly chapters open weekly charts and activity buckets. Missing-health mode
replaces unavailable health values with an explicit absence, not zero or a flat
trend; the metric detail explains that state. No readiness score, diagnosis,
coach, subscription, live health connection or new scoring model is inferred.

All names, readings and histories are fictional. Local study state is discarded
on reload. The illustrative bottom tab bar is orientation only. Parent roots
remain mounted behind native Modals; Back pops one detail and Done closes the
detail stack. This is a design-navigation prototype, not production routing.

## Inspiration and design decisions

- [Oura Trends](https://support.ouraring.com/hc/en-us/articles/360055983614-Using-Trends):
  borrow multiple time ranges and distinct current/average values. Do not import
  Oura scores, sensor claims or medical interpretations.
- [Robinhood charts](https://robinhood.com/us/en/support/articles/using-charts/):
  borrow a strong primary readout and point inspection. Hours are not financial
  returns; the training chart describes volume without a growth guarantee.
- The supplied WHOOP, Apple Fitness, Google Fit and Gentler Streak boards:
  use them to question density, active-day visualization and depth. No screen is
  recreated, and no external health feature is treated as available in our app.
- [Home #328](https://github.com/jerryliu3/fitness-battle/pull/328): retain genuinely
  different structures and inspectable samples, adding deeper historical paths.

Recommended first review: Portfolio for lookup, Calendar for recall, Chapters
for reflection. Signal Library is the best candidate if several real health
sources become available; it currently remains a clearly fictional exploration.

## Evidence

`01-phone.jpg`–`09-phone.jpg`: nine 390×844 roots. `year-inspection.jpg` and
`session-detail.jpg`: historical chart and source navigation. Tests check all
nine roots, calendar/range consistency, sport shares, range → bucket → activity,
empty dates and missing readings. See PR description for final workspace
typecheck and iOS export results. Browser review does not validate device
VoiceOver, Android Back, large type or edge gestures.
