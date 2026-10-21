# Activity growth, progress, Crew and weekly close

Implemented October 21, 2026 as an ordered stack. Each PR targets its predecessor; merge from the bottom upward, then retarget the next PR to main if GitHub does not do so automatically.

| Order | PR | Scope |
| --- | --- | --- |
| 1 | [#238](https://github.com/jerryliu3/fitness-battle/pull/238) | Rank-priced immediate activity score growth, durable receipts, nonnegative weekly bonuses |
| 2 | [#239](https://github.com/jerryliu3/fitness-battle/pull/239) | Weekly training chart and durable running/cycling record timelines |
| 3 | [#240](https://github.com/jerryliu3/fitness-battle/pull/240) | Soft completed-distance gradients on the shared web/native course |
| 4 | [#241](https://github.com/jerryliu3/fitness-battle/pull/241) | Inspectable member contributions and over-goal relay geometry |
| 5 | [#242](https://github.com/jerryliu3/fitness-battle/pull/242) | Scheduled Crew Start Line tickets, cancellation and RSVP persistence |
| 6 | [#243](https://github.com/jerryliu3/fitness-battle/pull/243) | Dimensional weekly result cards and settled receipts |
| 7 | [#244](https://github.com/jerryliu3/fitness-battle/pull/244) | Independent congratulations and mutual repeat-field seating |
| 8 | Final integration PR | Additive compatibility hardening, scoring copy, account isolation, API tests and validation evidence |

## Product decisions

- The existing entry-rank bands price activity milestones: 1/1.5/2/2.5/3/4/5 times a base of one mile running/walking, five miles cycling or thirty minutes strength. Prices stay fixed for a round. Only active sports earn; Open and GPS receipts are separate. Sample, pending, excluded and future sessions do not earn. A weekly placement can add a nonnegative bonus; inactivity holds the score. A freeze holds the weekly bonus while activity still earns.
- Record history uses whole-session moving time at the supported distance, with up to 2% GPS overrun. It never scales a longer session into an invented best split. Supported distances are running 5K/10K/half/marathon and cycling 50K/100K/150K/180K. Records carry their source and are corrected or removed when the activity changes. One record shows a receipt; multiple improvements show the staircase.
- Crew relay uses existing authorized counted totals. Session-target and strength crews use session counts. All active members remain inspectable, including zero contributors. Over-goal distance retains the true finish marker.
- Any active Crew member can schedule a one-off session. The organizer joins automatically and can cancel; time changes require a new ticket. RSVP is never an activity or scoring input. Times are explicit Eastern wall times resolved to UTC; nonexistent DST times are rejected and repeated times choose the earlier occurrence. No automatic reminders are sent.
- Weekly social actions target actual settled participants of an archived field. One-sided repeat choices are private. Mutual choices influence one compatible new solo seating attempt within 21 days, with active-sport, sport/track, capacity and ≤400 score-gap constraints. Existing seats and Crew fields remain unchanged. Assignment is reported only from actual stored field membership. Progress can reopen the latest week so later-settling peers become available.
- Weekly medals and the body clock remain deferred as requested. No planner, friends graph or live duel is introduced.

## Rollout

Apply these additive migrations, in order, before deploying the combined web/native clients:

1. `20261021140806_activity_effort_milestones.sql`
2. `20261021141130_personal_record_history.sql`
3. `20261021141812_crew_scheduled_sessions.sql`
4. `20261021142307_weekly_field_social.sql`
5. `20261021143913_feature_stack_hardening.sql`

The final migration preserves the earlier published migration files. It rejects a stale client that omits an earned receipt for a round it is saving, keeps active sessions ahead of cancelled tickets, rejects null RSVP intentions and adds accurate social availability/counts. Old receipt/history rows remain in relational storage; clients load recent milestone receipts first and paginate record history independently of the 2,000-activity window.

No production migration, activity, session, congratulation, preference or settlement was executed. A separate local validation database was created from schema only; fixtures ran in rollback transactions. The existing local application database was not modified.

## Validation

Validation began only after all requested features were implemented.

- `pnpm typecheck`: all five workspaces passed.
- `pnpm test`: 642 passed, 5 existing skips (rankings 16, shared 284, pursuit 2, native 96, web 244).
- `pnpm build`: production Next build passed. Network access was needed for existing Google Fonts imports.
- All 14 repository SQL suites passed in the isolated database, including the 18 pgTAP seating assertions. The older sharing-based fixture was updated to the already-selected counted-account-activity rule and extended with exclusion/sport/window samples.
- Catalog review confirmed RLS on all five new tables, empty search paths on the eight public RPCs and denied anonymous execution. New SQL coverage includes receipt replay/reset, immutable score floors, corrected/excluded records, session authorization/idempotency/cancellation and private mutual seating.
- Browser review exercised week selection, record-distance selection, result/receipt switching, the next-round step and crew contribution presentation in the production app. Shared finite-scene tests cover all course grounds and units.
- Native typechecking and its existing 96-test suite passed; no physical-device or simulator run was performed.

The locked Next 15.5.27 package does not contain `dist/docs`; official Next route/client-component references were used after confirming that absence. The implementation retains the repository's existing App Router and request-scoped Supabase patterns.
