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

Evidence:

- Native `src/ui/lane-track.tsx` owns a 30fps wake clock; that state update renders the lane tree. Both adapters build capsule definitions, masks, wakes and heads in React. Web's `usePolishedWakeTime` also publishes React state at 30fps.
- Web `features/focus/arena-lanes.tsx` builds ground paint using `lanes` and `overtakeFrame` dependencies, while the stage can supply new arrays as motion progresses. `fieldCourseScene` creates repeated scenery per lane and distance sample. Native ground and capsule adapters similarly map scene nodes during rendering.
- Native tabs currently initialize screens eagerly; Crew and Compete each own crew loading. First paint, roster fetch time, scenic geometry, and steady-state motion need separate measurements.

Proposal A: instrument field mount, roster completion, model calculation, SVG commit, and frame work using the same roster/grounds/zoom on both platforms. Preserve the existing viewport and score contract. Make the static scenery and static capsule heads independently memoized, with small animated wake layers and stable keys.

Proposal B: after measuring A, cap/reuse repeated scenery geometry and move purely decorative wake updates outside whole-field React renders. Load real rosters independently of painting the initial field; consolidate duplicate crew reads. Acceptance: report before/after timings on representative devices, no idle offscreen loops, and identical totals/selection/pan behavior. A tenfold target is a hypothesis until profiled.

### 2. Native 3D / Expo Go — propose one diagnostic PR

The current code already exposes `3D field` in `features/competition-field.tsx`; it embeds `ui/arena-3d.tsx`, which needs a reachable `${EXPO_PUBLIC_API_URL}/arena-scene`, its ready handshake, and `react-native-webview`. It falls back after 12 seconds or a navigation/renderer error. The package already declares WebView. The source does not establish why the owner's particular installed Expo build omits the option.

Proposal: show an actionable renderer status and test the exact Expo Go/build version, device-reachable API origin and deployed `/arena-scene` route. Retain 2D fallback. Do not reinstall or change deployment configuration without evidence from the actual device.

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

The Crew shared-week visualization is intentionally unchanged for follow-up, as requested.

## Verification record

The owner requested no typecheck/build or expensive verification. Focused runs passed: 41 shared semantic tests, 42 web API/auth/sleep-copy/arena/avatar tests, and 14 native manual-entry/import/ownership/arena tests. Syntax/JSX parsing and whitespace checks also passed. The SQL authorization/cursor regression script is included but unexecuted because no local PostgreSQL service is available.

At a 390×844 browser viewport, Home rendered the new header/chart/controls and simplified competition card; saving a local-preview 30-minute Strength session updated the activity list, hours and count. Opening the chart reached the dedicated weekly detail screen with chart, effort meter and perspective. Progress showed underline navigation, range segments, chips and history under Overview. Athlete covered the shell header/navigation; Preferences showed compact Units/Primary/Freeze/Sports rows. This was an offline preview, not proof of a live backend write.

The Expo preview server starts, but the additional Expo browser action was rejected by automatic approval review because of an account usage limit. Native simulator visual verification is incomplete. No production deployment or migration was performed. Chart navigation uses route entrance motion and a larger reused chart, rather than a shared-element morph.

## Review stack

Review and merge in dependency order: [Foundations #286](https://github.com/jerryliu3/fitness-battle/pull/286), [Crew #287](https://github.com/jerryliu3/fitness-battle/pull/287), [Home #288](https://github.com/jerryliu3/fitness-battle/pull/288), [Compete #289](https://github.com/jerryliu3/fitness-battle/pull/289), [Progress #290](https://github.com/jerryliu3/fitness-battle/pull/290), then [Athlete #291](https://github.com/jerryliu3/fitness-battle/pull/291). Each section contains both native and web changes. These are drafts, not merged or deployed.
