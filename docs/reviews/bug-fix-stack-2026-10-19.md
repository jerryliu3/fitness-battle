# October 19 bug-fix stack

Merge in order; each PR targets the branch immediately below it. All nine PRs are ready for review. Deploy all additive SQL migrations in the final stack before the new Crew/admin APIs.

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
| [#215](https://github.com/jerryliu3/fitness-battle/pull/215) | Gold effort badges, stack review corrections, atomic admin settlement, mobile regression coverage and cleanup |

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
- Native typecheck/tests pass, including Home form validation, decimal keyboard input, failed-hydration gating and unsupported-device tracker handling. iOS and Android bundle exports are checked separately; no simulator or physical-device runtime check was performed.
- No production migration or settlement was executed. Admin commits now use a service-only SQL transaction; rollback, stale-preview rejection and client-role denial were tested locally. Ordinary stale saves are now rejected by the versioned account transaction; see `docs/setup-plan.md`.

## October 20 review pass

- **P1 — production settlement:** the service client previously reached athlete-scoped seating RPCs, which require an authenticated athlete. Added an explicit read-only service roster loader, per-sport settlement fields and refusal on roster-read failure. The old multi-write account writer could partially persist admin actions; a new additive RPC commits only settlement tables and its successful audit snapshot atomically, rechecking the preview version under lock.
- **P2 — mobile manual entry:** blank mileage silently became zero and validation feedback appeared behind the sheet. Web/native now share explicit input validation, support decimal commas and show form errors in place. Native writes and acknowledgements wait for successful hydration; sync filters unsupported device trackers.
- **P2 — results:** next-round copy previously assumed auto-renewal. Both platforms now share reveal grouping/acknowledgement logic and report the actual enrollment status for every displayed sport. Native results include score deltas and freeze status.
- **P2 — admin UI:** late requests can no longer restore another account’s preview after an account switch; production inputs are locked during requests.
- **Cleanup:** removed unreachable 3D rendering branches while retaining the requested coming-soon controls, obsolete Crew sharing code and stale native season counts. Crew queries surface partial failures and read independent summaries concurrently. Native lane selection exposes accessibility state and relative gaps. The splash timeout now remembers completion across remounts.

Remaining limits: device interaction/animation QA still needs a simulator or physical device. The later versioned-save layer closes the previously noted stale-client overwrite risk.

## Follow-up scoring corrections

Admin field reads now preserve Verified GPS volume and ratings separately from Open totals. Shared settlement selects the appropriate track without making manual volume verified. Ordinary web/native rollover retains the closing field pin until settlement completes, then clears it. Regression coverage exercises the ordinary two-argument rollover path and mixed manual/GPS opponent totals. Mobile device animation QA remains a manual follow-up; web interaction walkthroughs were completed earlier.

Regular roster follow-up: `week_field_roster` and its shared web/mobile API mapper now return separate Verified volume and ratings. Private Crew fields read counted activities directly, replacing the retired manual-share ledger. Apply `20261020132114_field_roster_verified_totals.sql` before deployment. Loader-to-rollover regression coverage and rolled-back SQL checks verify separate tracks, private/open parity, sample/future exclusion and membership authorization. A further light review found no additional concrete issues in this change.

Admin boundary follow-up: `rollClock(state, now)` retains its ordinary two-argument interface. It delegates to the shared `settleCompetition` operation, which can accept already-loaded field rosters. Admin invokes that operation directly; service reads, permissions, persistence and simulation UI remain isolated. No separate admin scoring rules or duplicate settlement loop were introduced.

## Versioned account saves

Normal web/native saves now send the base server revision and use an atomic `save_compete_account` RPC. The transaction and admin settlement lock the same account row and reject stale versions before writing. Clients serialize saves, keep the old base while merging background refreshes into dirty drafts, stop retries after a conflict and offer explicit reload while preserving a local recovery copy. The previous multi-request account writer was removed. Old builds without a revision are rejected rather than allowed to overwrite current state.
