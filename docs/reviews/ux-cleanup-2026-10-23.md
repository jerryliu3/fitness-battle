# UX cleanup — October 23, 2026

This pass follows the owner's cleanup list and subsequent decisions: Running and Cycling use GPS Tracked; Walking and Strength use Open; the header meter measures progress toward the next whole effort-score point. Goalmaxxing's `src/components/navigation/tab-chrome.ts` and `segmented-tabs.tsx` provide the navigation reference. Existing ledgers and persisted track identifiers remain compatible.

## Implemented scope

| Section | Web and native changes |
| --- | --- |
| Home | Remove brand/greeting block; put the existing effort meter in the header; circular Sync/Add controls; explicit empty sport picker and labeled duration/distance/time entry; simplify rival card; show the latest eligible personal and per-member Crew activity from today/yesterday; move effort detail and weekly perspective to a dedicated chart destination. Share the chart's hour aggregation in `packages/shared/src/week-chart.ts` and reuse each platform's chart adapter on both destinations. Native chart dot pulses and session Ember loops with reduced motion. |
| Compete | Fixed sport track with a visible label; remove score/past-self selectors; retain past self as an unranked comparison; show event boundaries; complete both result stages before acknowledging; animate result steps; group Coming soon and Beyond this week into complementary cards. |
| Progress | Remove slogan/title stack; underline section navigation; rounded segments and sport chips; move historical weeks/awards to the end of Overview; use each sport's configured track for score/history. |
| Crew | Remove slogan stack and signed-in marketing; keep native Invite/settings affordances visible on signed-in previews as well as real crews; full-screen Members destination reuses the authorized roster's name/photo/rest status and weekly aggregate. |
| Athlete | Full-screen settings and icon Back navigation; compact Units/Primary sport/Freeze/Sports rows; independent primary selection; edit icon on profile card; Choose/Delete/Cancel photo commands; share web photo handling with onboarding; integration marks and one state-dependent connection command. |
| App | Reuse native icon button, picker, segments, sheet and step-motion primitives; iOS system material tab bar and floating fallback; web floating glass navigation; GPS Tracked terminology. |

The optional weekly flame streak is held: defining whether freezes and manual activity preserve a streak needs a product decision. No invented streak is displayed.

## Audit outcomes and held proposals

These findings are based on source inspection. They are not a measured claim of a tenfold improvement. Performance, native 3D diagnostics and the broader bento redesign remain proposals. The owner subsequently approved authenticated synthetic accounts and reusable Crew reads, and requested removal of production sample-sleep controls; those decisions are implemented below.

### 1. 2D field performance — propose two focused PRs

Evidence after reconciling merged PRs #275–280 and #283:

- The merged native lane code already disables ordinary idle decorative redraws and limits animation to explicit exploration. Preserve this improvement rather than implementing it twice.
- Active SVG scenery, capsule definitions and web wake updates still need profiling. Separate field mount, roster completion, model/geometry work and interactive frame cost; no measured tenfold claim has been established.
- The merged portrait renderer, field-header clearance, adaptive rulers and lane gestures are preserved. Account for native system tabs and the web/fallback tabs separately when measuring offscreen work.

Proposal A: instrument the current combined renderer using representative rosters/grounds/zoom on both platforms. If measurements support it, isolate static scenery and capsule heads from small animated wake layers, with stable keys.

Proposal B: after measuring A, cap/reuse repeated scenery geometry and consolidate duplicate reads where the trace shows avoidable work. Acceptance remains before/after device timings, no idle offscreen loops, and identical totals/selection/pan behavior. These performance changes remain on hold.

### 2. Native portrait field / Expo Go — revised diagnostic proposal

Merged #275 replaced the visible optional 3D field with platform-native SVG `PortraitField` adapters. The prior Three.js renderer and WebView bridge remain in code but are not the current product renderer. The earlier proposal to diagnose `/arena-scene` reachability does not apply to the newly merged portrait option.

If the installed app still lacks the option, first identify its bundle/build and compare it with current source. Only then investigate a renderer-specific issue. Do not reinstall, rebuild or change deployment configuration without a reproduced need. The current reconciliation preserves the merged portrait controls and does not introduce another renderer.

### 3. Authenticated synthetic accounts — approved and implemented

Configured Supabase environments now use validated sessions for every account, including synthetic-data accounts. Data origin is separate from authorization. Existing seeded production demo auth identities and memberships are reused; no new identity system or relaxed membership policy is introduced. Offline preview identities remain available only when a backend is unconfigured.

Before switching from legacy local identities, known local auth/activity caches are copied into an account-specific backup, read back, and exposed through Account export. Cache removal happens only after saving the backup. A failed backup prevents hydration/sign-in from silently replacing local data. Local drafts are not automatically uploaded. This does not apply database migrations or alter existing production accounts.

### 4. Sample sleep — simplify production UI

Removed Add sample sleep night controls from product Data Sync and Sleep panels on both platforms. Existing real sleep ingestion and sleep registration are unchanged. The sample reducer remains available for deterministic fixtures/tests; no new receipt, registration side effect, or production demo flow was added.

### 5. Recent Crew activity — approved and implemented

Home reads real sessions through the reusable authenticated `GET /api/crews/activities` endpoint. The new additive `crew_activity_reads` RPC checks active membership, deduplicates shared peers and returns bounded summaries without raw route/health payloads. Home requests the latest eligible session per member from today/yesterday in Eastern time. Personal and peer previews share recency/deduplication rules; the section hides when empty. Weekly aggregate timestamps are never used as activity timestamps.

The same endpoint supports a specific Crew and timestamp/ID cursor pagination for the future Crew feed. It excludes sample/demo, excluded, pending and future sessions. Peer previews are read-only. Errors do not fabricate fallback peer sessions. Migration `20261023043826_crew_activity_reads.sql` must be applied before this endpoint can serve live data; it has not been deployed in this pass.

### 6. Further bento / nested-screen opportunities — proposal only

Keep the weekly chart, race positions and primary actions visually consistent. Use varied cards for secondary content: a preview of earned records linking to record detail; compact latest settled-week summary linking to its existing reveal; Crew roster preview linking to Members; upcoming Crew session preview linking to full session/RSVP detail. Avoid a separate page for a single short status. The explicitly requested Home week destination, Members destination and Compete extras are implemented; a wider redesign awaits review.

The reconciliation retains the already-merged Crew finish, configured-goal semantics and integrated member markers. A further shared-week redesign remains on hold.

## Verification record

The original, pre-reconciliation pass requested no typecheck/build or expensive verification. Its focused runs passed: 41 shared semantic tests, 42 web API/auth/sleep-copy/arena/avatar tests, and 14 native manual-entry/import/ownership/arena tests. Syntax/JSX parsing and whitespace checks also passed. The SQL authorization/cursor regression script is included but unexecuted because no local PostgreSQL service is available.

At a 390×844 browser viewport, Home rendered the new header/chart/controls and simplified competition card; saving a local-preview 30-minute Strength session updated the activity list, hours and count. Opening the chart reached the dedicated weekly detail screen with chart, effort meter and perspective. Progress showed underline navigation, range segments, chips and history under Overview. Athlete covered the shell header/navigation; Preferences showed compact Units/Primary/Freeze/Sports rows. Compete showed its fixed GPS Tracked label and unranked past self; the two-stage weekly result flow exposed only the next-stage action before completion and returned to Compete after the final action. This was an offline preview, not proof of a live backend write.

The original Expo browser action was blocked by an account usage limit. The subsequent reconciliation verification below supersedes that limitation for the Expo web preview; native simulator visual verification remains incomplete. No production deployment or migration was performed. Chart navigation uses route entrance motion and a larger reused chart, rather than a shared-element morph.

## Reconciliation with merged PRs

Replayed the six existing draft PRs onto main `0df58f6`, which includes #275–280 and #283. Preserve the merged portrait renderer, native header swipe ownership, `FocusSheet.onClosed` modal handoff, responsive chart/record geometry, Crew finish/member markers, sync-review gate/batching/device sample path, result accessibility summaries and modal safe-area provider. Apply the new controls and navigation around those implementations.

Use the existing `clubLifetimeTotals` helper on both platforms, excluding invalid/future activity and counting each completed primary-sport round once across historical tracks. The latest recap prefers the configured sport track within the newest settled period and falls back to the available historical track, so Open-only history remains visible. No duplicate summary helper remains.

The debug menu sits beside the effort meter. Native previews block refresh, reject an in-flight refresh result and reset on account changes. Debug target selection uses the displayed sport track; both stored track baselines remain compatible. A direct ledger import in `activity-age.ts` removes the barrel-import cycle exposed by the merged debug module.

### Combined verification

114 distinct focused tests passed across shared, web and native. Coverage includes historical recap fallback, lifetime totals, mixed today/history sync receipts, stale-account responses, device samples entering the receipt gate, debug preview/reset and in-flight refresh, field gestures/modal handoff, portrait controls, Crew relay goals, records and chart periods. No typecheck, production build or native rebuild was run.

At 390×844, the combined Next preview showed the effort meter and Debug menu together. Debug sync updated the weekly chart/activity and opened the journey; Reset restored the previous score, hours and session count. The preserved portrait renderer remained available with the fixed GPS Tracked event label.

The current Expo source rendered Home, the new header/control layout, a local debug overtake with GPS Tracked, portrait controls, and reset to the original guest state. A temporary Metro watch path was needed to reuse this checkout's external dependency installation; the config was restored afterward. The Expo web adapter logged SVG/native responder and Animated attribute warnings, so this is a rendering/navigation smoke check, not an assertion of warning-free web-native parity. The installed iOS simulator bundle still showed the older track toggle; it was not treated as verification of this source. A native iOS visual pass needs an updated bundle and remains unperformed.

The SQL authorization/cursor regression script remains unexecuted without a local PostgreSQL service. No migration, deployment or production account change was performed.

## CI follow-up on latest main

Rebased the same six-PR stack onto main `37708d8`, including #293's Expo SDK 58 / React 19.3 upgrade and #294's Garmin privacy disclosure. Preserve those changes; no CI workflow or test command was disabled.

Run the exact CI commands, `pnpm typecheck` and `pnpm test`, independently at every PR boundary with the frozen SDK 58 dependency lockfile:

| PR | Typecheck | Tests passed | Existing skips |
| --- | --- | ---: | ---: |
| #286 Foundations | Pass | 738 | 5 |
| #287 Crew | Pass | 742 | 5 |
| #288 Home | Pass | 743 | 5 |
| #289 Compete | Pass | 743 | 5 |
| #290 Progress | Pass | 743 | 5 |
| #291 Athlete | Pass | 742 | 5 |

Fixes are placed in the earliest affected PR: isolate the sheet test from unrelated SVG/native internals in #286; update the score-animation fixture to Running's configured GPS rating in #288; move web sleep-panel sample-prop removal into #289 alongside its caller; restore the still-used benchmark action-button import in #291. The final test count is one lower because the earlier Athlete cleanup removes the obsolete integration-row Sync action and its corresponding parameterized case; Home's sync ownership/batching checks remain in place.

These full CI checks supersede the earlier no-typecheck/focused-test validation record for this follow-up. Production builds, native rebuilds and database migration application remain outside this CI repair.

## Review stack

Review and merge in dependency order: [Foundations #286](https://github.com/jerryliu3/fitness-battle/pull/286), [Crew #287](https://github.com/jerryliu3/fitness-battle/pull/287), [Home #288](https://github.com/jerryliu3/fitness-battle/pull/288), [Compete #289](https://github.com/jerryliu3/fitness-battle/pull/289), [Progress #290](https://github.com/jerryliu3/fitness-battle/pull/290), then [Athlete #291](https://github.com/jerryliu3/fitness-battle/pull/291). Each section contains both native and web changes. These are drafts, not merged or deployed.
