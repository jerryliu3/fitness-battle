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
- `expo export --platform ios` produces the native Hermes bundle. No booted iOS simulator was available, so physical-device rendering, VoiceOver and device haptics remain a device QA pass; the bundle check is not a native binary build.
- The crew migration and SQL fixture assertions ran successfully inside a transaction rolled back afterward in the local Fitness Battle database. Coverage includes two members, wrong sport, exact week boundaries, demo/excluded/history/stub rows, former members, outsider and anonymous calls. Local security advisor reported no errors. No remote migration was applied.

## References consulted

- Local Goalmaxxing: `src/features/ux-destinations/progress-atlas.tsx`, `charts.tsx`, and `src/components/xp/xp-progress-card.tsx` (read only; no Goalmaxxing source modified).
- [Next 15 — Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components)
- [Next 15 — Route Handlers](https://nextjs.org/docs/15/app/api-reference/file-conventions/route)
- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions)
