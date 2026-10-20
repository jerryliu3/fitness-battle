# October 19 bug-fix stack

Merge in order; each PR targets the branch immediately below it. All are drafts for review. Deploy all additive SQL migrations in the final stack before the new Crew/admin APIs.

| Layer | Scope |
| --- | --- |
| [#206](https://github.com/jerryliu3/fitness-battle/pull/206) | Web lane selection, relative gaps, arrow-only edges, first-place gold, view labels and expanded controls |
| [#207](https://github.com/jerryliu3/fitness-battle/pull/207) | One Home circle per day, access to every session on that day, splash mounting |
| [#208](https://github.com/jerryliu3/fitness-battle/pull/208) | Home sync/manual entry, immediate multi-sport registration on web/native |
| [#209](https://github.com/jerryliu3/fitness-battle/pull/209) | Automatic two-stage web round takeover, persisted round acknowledgements, sport-settings link, first-measure motion fix |
| [#210](https://github.com/jerryliu3/fitness-battle/pull/210) | Web/native Crew cleanup and membership-authorized live aggregate totals |
| [#211](https://github.com/jerryliu3/fitness-battle/pull/211) | Native lane, Home, round-results and splash parity |
| [#212](https://github.com/jerryliu3/fitness-battle/pull/212) | Isolated round lab, owner-only audited production settlement, browser-review corrections |
| [#213](https://github.com/jerryliu3/fitness-battle/pull/213) | Eastern/DST consistency, calendar offsets and corrected charter/docs |
| Final polish | Gold effort-score badge on web/native, final regression/SQL access checks and this review |

## Product decisions

- Web is the primary reported surface; corresponding native behavior is included. Native retains its explicit Explore pan mode, rather than introducing a new fullscreen lane architecture.
- Round results automatically open on Compete only after account data is ready. Animated results lead to next-round details and settings. Dismissal acknowledges all tracks in that round; the overtake animation remains in the live field without Replay.
- Manual entry is today-only, sport + GPS-sport mileage + duration, eligible for Open only. Multiple activities remain distinct and individually accessible from their shared day.
- Onboarding chooses at least one sport and registers each immediately.
- Crew keeps shared progress, standings, members and invites; no activity feed or manual share step.
- America/New_York (Eastern, EST/EDT) is the source of truth. UTC remains the interchange representation for timestamps, not the competition boundary.

## Primary-sport audit

Primary currently selects suggestions, displayed boards, demo-sync sport, and the default category used by older freeze/period helpers. It does not enroll or remove sports on preference change and does not combine score tracks. The round takeover now considers all sports in a settled round instead of filtering to primary. This stack adds no further primary-sport functionality; removing the legacy field or its existing helper dependencies is unnecessary for the requested UX scope.

## Verification

- Workspace typecheck and test suites pass; the web account-seed suite retains its existing five skipped tests.
- Production web build passes.
- Browser walkthrough: isolated sandbox close → animated results → next-round details → Athlete sport preferences; offscreen racer → centered capsule; heading computed at 28px; expanded Back/disabled 3D controls; Home activity form and one Today activity circle.
- Local PostgreSQL checks run inside rolled-back transactions: Crew totals include multiple manual activities and exclude samples/excluded rows; anonymous/nonmember access rejected; audit snapshots inaccessible to client roles; Eastern Sunday/Monday and spring/fall DST bounds verified.
- Native typecheck/tests pass; no simulator or physical-device runtime check was performed.
- No production migration or settlement was executed. Admin uses the existing multi-write relational account writer; audit snapshots do not make it transactional or prevent concurrent athlete saves. Operational limitations and setup are in `docs/setup-plan.md`.
