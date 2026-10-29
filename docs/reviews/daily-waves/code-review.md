# Daily-wave implementation review

Reviewed the complete daily-wave change, its existing persistence/settlement dependencies, and web/native consumers. This included Eastern/DST boundaries; registration and cancellation; migration/backfill; RLS and RPC permissions; delayed roster materialization; generated rivals; scoring; renewals and stale drafts; and admin actions. Corrections are additive in `20261028231429_daily_wave_review_fixes.sql`; the original migration is preserved.

## Findings corrected

| Priority | Trigger and consequence | Correction / evidence |
| --- | --- | --- |
| P1 | Nine or more members register for one Crew benchmark. The matcher creates a second bounded field, but the old unique Crew/start index aborts the entire batch. | Replace the unique index with an ordinary lookup index. A nine-member Crew now resolves into two fields containing all nine athletes. |
| P1 | A member leaves after start but before the first roster read. Lazy matching could change their Crew assignment; leaving a closed, assigned Crew could also fail its new field-reference trigger. | Serialize departure with account/wave writes and materialize affected started fields before membership changes. Preserve closed field context and pointers. Includes bounded missed renewals and the current renewal. |
| P1 | A Strength athlete has heart-rate-weighted effort. Peers previously received only duration, so the athlete's own score and their opponents' view disagreed. | Aggregate per-activity weighted effort in the authorized roster RPC and use it in shared standings. Admin settlement uses the shared effort function. No peer sensor readings are exposed. SQL and shared tests verify a 60-minute, 180-bpm session scores 8.96 for both perspectives. |
| P1 | A refresh settles a week while the device has an unsaved name or renewal change. The dirty merge could replace an enrollment but retain old ratings/results/receipts, losing settlement on the next write. | Adopt the server's rollover ratings, results and receipts together, preserve local profile/renewal intent, recompute current effort awards, and derive recap IDs. Recovery receives the same rollover treatment. |
| P1 | An old Recovery document removes last week's registration after its automatic Monday renewal has started. | Apply the same database renewal hold as volume sports. A stale save cannot cancel that started contest. |
| P1 | Admin settlement loads an account marked `awaitingField`, even though it supplies an authorized roster; unrelated registration metadata was also lost in its full enrollment rewrite. Admin field moves retained an invalid old field pointer. | Accept supplied matching settlement fields, resolve the explicitly closed field, preserve untouched registration timestamps/pointers, and update an audited move's pointer after destination membership. End-only admin renewal now starts Monday 06:00. |
| P1 | GET computes a rollover but its versioned save fails. Returning the computed state with the old revision made an uncommitted result look authoritative. | Return a retryable 503 instead of that snapshot. A route test covers a competing account write. |
| P2 | The first matching athlete has eight mutual repeat choices. Rematch preference could fill all eight seats without the athlete who initiated the group, leaving that athlete alone later. | Reserve the initiating athlete's seat before prioritizing mutual peers. A nine-person rematch fixture verifies this. |
| P2 | A queued or unresolved field is used for a projected rating calculation. | Keep the current rating until the benchmark has passed and the canonical field is available. |

Regression coverage is in `supabase/tests/daily-wave-review.sql`, the existing SQL scenarios, shared snapshot/field tests, and web route/admin tests. The original nine-member Crew reproduction failed with `week_fields_crew_wave_unique`; the original dirty-rollover reproduction lost the pending renewal preference.

## Outstanding architecture concerns

**Follow-up:** the hard-deadline policy and ordinary account score authority below have now been implemented and verified against local Docker Supabase. See [local verification](local-verification.md). This section records the findings as originally identified; large production-batch load testing remains separate.

1. **P1: closed-field result finality needs a policy.** Live totals share a field and benchmark, but each account still settles separately using activities available at its read time. For example, A settles just after Sunday close, then B imports a workout performed before close. B's later settlement can see different totals from A's archived result. This predates daily waves, but matters more with shared real opponents. Decide whether to allow a tracker-sync grace period, freeze one field result snapshot, or support revisions. No arbitrary cutoff/grace policy is introduced here.
2. **P1: the existing score-write trust boundary is unchanged.** The authenticated full-account RPC still accepts caller-supplied ratings and period results; the daily-wave wrapper validates registration windows and field membership, not every rating/result against the activity ledger. RLS restricts ownership, not the truth of those scores. Preventing forged ratings/results requires server-derived scoring writes and a separate review of direct owner writes. Do not describe this change as full anti-cheat or fully server-authoritative scoring.
3. **Concurrency and scale require deployment-environment verification.** Advisory-lock ordering and cutoff handling were inspected, but embedded PostgreSQL tests do not exercise multiple simultaneous sessions, production PostgREST behavior, or a large Monday registration batch. Run those checks on a disposable full Supabase/PostgreSQL environment before a broad rollout. No production database was used for this review.

## Recommended queue presentation

Use the normal field scene in every supported view, with the athlete visible and the other seven seats drawn as dotted/question-mark markers. Keep everyone at the start and suppress ranks, opponent interactions and simulated movement. These are anonymous seats, not provisional opponent identities.

Show a compact start/end overlay after registration, with Cancel registration available until start. It can collapse into a persistent start-time chip so the athlete can inspect the field and reopen details. At start, replace the placeholders with the canonical roster after a successful read. A failed read keeps the anonymous waiting presentation. Reuse the existing queue derivation; no presentation-specific schema is needed. This review pass retains the current queue card.

## Validation and rollout

Validation passed: 1,104 workspace tests, typecheck, production web build, UI contract check, and eleven SQL test files against 47 migrations in embedded PostgreSQL. The production demo-auth seed is excluded from that harness; test categories and auth scaffolding are supplied. Five pre-existing environment-dependent tests are skipped. pgTAP and simultaneous-session/load testing are not claimed.

The figures above record the initial review verification. The subsequent hard-deadline and score-authority implementation, clean Docker replay, full local tests and browser proof are documented in [local verification](local-verification.md). Apply all three migrations with the corresponding API/web/native release and server service-role configuration. No production deployment has been performed.
