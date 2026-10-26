# Progress — product refinement

Two focused mutations of the current Progress screen, retaining the product shell, AppText, chart inspection, segments, section boundaries, palette and native detail behavior. This PR stacks on the new Compete foundation, not on #341 or the earlier `tab-studies` library.

| Direction | Composition | What to evaluate |
| --- | --- | --- |
| Training portfolio | Open active-time summary and inspectable chart. Week is a daily line against the dashed previous week; Month is clipped weekly bars; Year is monthly bars. Visual comparison cards and an effort sparkline follow. | Clear chart-first baseline; real data and visual deltas replace a menu of settings-like destinations. |
| The training mix | Dark summary card with a proportional sport composition and actual hours by sport, followed by the daily rhythm chart. The same drilldowns and supporting records remain below. | Stronger overview of mixed training, at the cost of moving the detailed plot lower. |

Both use one sport picker, date navigation and a range segment. Training volume uses the existing shared `trainingBuckets`, `trainingComparison`, `trainingAtlas` and calendar helpers. No domain implementation is duplicated. Current totals, period lists, session receipts and delta bars derive from the same fictional activities. Open effort history and GPS effort history are separate illustrative rating fixtures.

## Drilldowns

- Inspect chart → selected day/week/month → matching training journey → session receipt. Rest periods show honest empty content. Back restores chart scope.
- Year atlas is available below the primary content, not promoted to the main screen. Tap a month to open its sessions; future days are muted.
- Effort score opens independent Open/GPS history.
- 5K PB opens attempt history, previous record comparison and the source session.
- Past weeks opens monthly chapters and training within the chapter.

The time comparison explicitly compares a partial current period to the full prior period, matching the product rule. Pair bars label the difference in sessions and active days; teal is current, muted blue is previous. Missing heart-rate/route information is shown as unavailable in receipts.

Review `/refine-progress?concept=1` or `2`; `&compare=1` for side-by-side and `&clean=1` for product-only composition. Native: `overtaek:///refine-progress`.

Screenshots: [portfolio](progress-1.png), [training mix](progress-2.png), [month bars](progress-month.png), [journey](progress-journey.png).

## Validation and limits

Mobile TypeScript, iOS Hermes export and Expo web interaction/visual review. The snapshots are fictional; no account, tracker or scoring writes. Device-only gestures, VoiceOver and Dynamic Type still need installation QA. Public profile/privacy work is deliberately handled in the separate Profile PR.
