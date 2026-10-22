# Earned progress — web and native rollout

Selected October 22, 2026, following the [six-part exploration](https://github.com/jerryliu3/fitness-battle/pull/253). This is production UI implementation, separate from the saved browser study.

## Delivered

- Hours-first Session stage on web/native, for suggestions and single/multiple recorded sessions. Existing Home stays mounted; detail closes on navigation. Individual sessions expand to source/eligibility/secondary metrics and confirm before removal. Impact is a disclosure, not another permanent dashboard.
- Photo/name pennants attached to self and the selected rival, stable place headers, a 1.2 km chase window, a 100 m distance capsule footprint and the existing course overview. Independent hit regions remain large. Standings uses its existing compact heads. The web 3D label and native bridge also carry bounded public portrait URLs.
- Monthly chapters for settled results, with signed score changes and the existing dimensional receipt. Distinct-week counts survive multi-sport/track filters.
- A selectable training atlas inspired by the local Goalmaxxing Atlas reference. The hours chart switches among daily week, clipped-week month and monthly year buckets. The month grid and selected-day sessions use real counted activity. Existing sourced PR history remains below it.
- A shared, portable SVG projection of an extruded crew ribbon, with material highlights, depth, finish gate, proportional contributions and selectable portrait cards. Current members' actual last-week total is the distance reference; zero/unavailable history stays honest. This is dimensional SVG presentation matching the original material direction, not a new Three.js runtime on native.
- One compact primary-sport Open Effort Score rail in the persistent web/native header. It shows existing rank/score and next-point activity progress, animates positive observed score changes once, resets on account/sport scope changes and respects reduced motion. No XP currency or scoring-rule change is introduced.

## Data and deployment

Apply `supabase/migrations/20261022035241_crew_week_comparison.sql` before expecting live last-week finish lines. The API uses the existing request-authenticated client. The new read-only function checks `auth.uid()`, active crew membership, an empty search path and restricted execute grants. Current totals remain readable when the comparison RPC is missing or fails.

The comparison is the previous calendar week for today's active members, even if membership was added afterward. It is not an archived historical roster or a user-configured target. Its sport/eligibility filters match the existing canonical current-week aggregate. No activity or score write path changes.

Peer portraits come from profile reads scoped to authorized roster IDs. Missing images use the shared person symbol. New portrait fields are optional for older clients. The WebView bridge only accepts bounded HTTP(S) URLs without embedded user/password credentials.

Milestone receipts remain aggregate high-water receipts. Session impact therefore reports the **week's** current earned points; it does not assign an award to an older session. Removing/re-adding an activity cannot earn it twice. The persistent rail's score is Open for the primary sport, explicitly labeled; GPS remains independent in Progress and Compete.

## Verification

- `pnpm typecheck` across shared, pursuit, rankings, web and native.
- `pnpm test`, including Eastern DST repeated-hour grouping; month/year clipping; future/sample/eligibility exclusion; fixed entry-rank milestone price; high-water removal behavior; 100 m metric/imperial geometry; stable crew identity; authorized API reads; and dimensional ribbon overflow/empty states.
- Native interaction tests cover hydration versus subsequent score growth, account changes, reduced motion, session hours and removal confirmation, chart ranges, and zero-contribution roster selection.
- Web production build. The installed locked Next 15.5 package has no `dist/docs` folder; matching official Next 15 client-component and Route Handler documentation was consulted instead. The existing font fetch requires network access for a cold build.
- Browser checks against the actual web app: two-session day, empty-day suggestion, removal cancel, impact disclosure, week/month/year, selected atlas day, chapter expansion, photo pennant propagation and rank headers. No page overflow at 320, 390 or 1024 px and no browser JavaScript errors in those flows. Archived-result and portrait review fixtures were injected only into an isolated demo browser; production code/data are not fixtures.
- `expo export --platform ios` produces the native Hermes bundle. Expo Go SDK 57 was installed on the running iPhone 17 Pro / iOS 26.5 simulator. Guest empty-session rendering and the seeded local Alice account were checked: persistent score rail, two-session 1.23 hr stage, expanded source/GPS/heart-rate details, removal confirmation and Keep, return to Home, atlas year switching, disabled future months and selected-day session rows. The calendar fit all seven columns. Device Hub then stopped responding to automation, so Compete/Crew simulator interaction and native chapter expansion remain unverified there; their automated/browser checks still pass. Full VoiceOver, device haptics, HealthKit and physical-device testing remain outstanding. Expo Go is not a native binary build or a HealthKit integration test.
- The crew migration and SQL fixture assertions ran successfully inside a transaction rolled back afterward in the local Fitness Battle database. Coverage includes two members, wrong sport, exact week boundaries, demo/excluded/history/stub rows, former members, outsider and anonymous calls. Local security advisor reported no errors. No remote migration was applied.

## References consulted

- Local Goalmaxxing: `src/features/ux-destinations/progress-atlas.tsx`, `charts.tsx`, and `src/components/xp/xp-progress-card.tsx` (read only; no Goalmaxxing source modified).
- [Next 15 — Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components)
- [Next 15 — Route Handlers](https://nextjs.org/docs/15/app/api-reference/file-conventions/route)
- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions)

## Review order

The prototype is independent of the implementation stack. Merge the UX PRs in the following order. After each merge, retarget its successor to `main`; if squashing, restack the descendants first so already merged commits are not reintroduced.

| Review | PR | Initial base |
| --- | --- | --- |
| Interactive prototypes | [#253](https://github.com/jerryliu3/fitness-battle/pull/253) | `main` |
| 1. Shared score rail and presentation selectors | [#254](https://github.com/jerryliu3/fitness-battle/pull/254) | `main` |
| 2. Home session stage | [#255](https://github.com/jerryliu3/fitness-battle/pull/255) | `codex/ux-effort-rail` |
| 3. Compete pennants and map scale | [#256](https://github.com/jerryliu3/fitness-battle/pull/256) | `codex/ux-session-stage` |
| 4. Progress chapters and atlas | [#257](https://github.com/jerryliu3/fitness-battle/pull/257) | `codex/ux-compete-pennants` |
| 5. Crew dimensional relay and comparison RPC | [#258](https://github.com/jerryliu3/fitness-battle/pull/258) | `codex/ux-progress-atlas` |

Each committed stack step separately passed monorepo typecheck and its applicable native interaction tests. The combined stack passes 677 tests, with 5 existing skipped tests, the web production build and iOS bundle export. It starts from `626cab8` and preserves the newer session Undo, sheet heading focus, Crew self-selection, Progress awards and personal-record charts. No PR has been merged and no remote migration has been applied.
