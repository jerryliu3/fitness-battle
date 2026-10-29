# Docker-backed wave verification

The requested hard deadline and server score authority are implemented in the additive `20261029001132_competition_score_authority.sql` migration and the authenticated account API. The two architecture concerns from the earlier review are addressed for ordinary account writes: accepted input versions freeze competition facts at close, and the server derives score documents rather than accepting client-supplied awards/results. Audited owner/admin tools retain their explicit override privileges.

The original `sport_score_only_grows` trigger also blocked legitimate inactivity losses even when the shared engine calculated them. With client score writes revoked, it is removed; server-derived Elo gains and losses can persist, while milestone receipts retain their high-water protection.

Local setup uses the existing Docker Supabase project `fitness-battle`, API port 54621, database port 54622 and Studio port 54623. The web test instance runs at `http://localhost:3019`. Ignored `apps/web/.env.local` contains only this stack's local configuration. No production connection or migration is used.

## Repeatable checks

Run `node scripts/test-daily-waves-local.mjs` from the repository root after starting the local stack and web server. It rejects remote database URLs, creates disposable authenticated athletes and removes their accounts/fields afterward. It exercises:

- A real authenticated registration with forged client ratings, results, dates and capacity: the server retains baseline scores, chooses the next Eastern 06:00 benchmark and uses capacity eight.
- Denied direct score-table updates and denied authenticated execution of both score commit RPCs.
- Queue cancellation with no competition result.
- A short custom test round accepted through privileged local fixtures: an on-time recorded 5 km workout counts; a backdated 10 km upload after close does not. Changing/excluding the original workout after close leaves the original competition score intact. Both athletes settle from the same accepted facts; replay agrees; training still contains the late upload. The stored inactive athlete rating matches the server result, including its legitimate loss.
- A separate accepted transaction is held open across its cutoff. A closing reader waits, then sees its committed 6 km rather than freezing a stale database snapshot.
- Sixteen simultaneous authenticated roster resolutions: exactly two fields of eight, every athlete assigned once, consistent member identities across readers.
- Two simultaneous full-account saves from one revision: one succeeds, one returns a conflict.

`supabase/tests/competition-finality.sql` uses a real short server-clock cutoff in a rollback transaction. It verifies immutable scores after a late insert/edit and the public write-permission boundary. Historical fixtures in other tests explicitly mark their receipts as on-time; application code never changes acceptance timestamps.

## Results

- Clean Docker reset: all 49 migrations and demo-account seeds applied.
- 1,113 application tests passed with `SEED_DB_TESTS=1`; no tests skipped.
- All 22 SQL test files passed in rollback transactions, including all 18 pgTAP field assertions.
- Typecheck, production web build and UI contract check passed.
- Local security advisors reported no issues.
- The production-build integration runner passed every scenario, including sixteen concurrent roster requests and the two-writer version conflict.

## Verification scope

The complete migration chain, including demo-auth seeds, is replayed with `supabase db reset --local`. SQL tests run on real PostgreSQL in rollback transactions, including the pgTAP field suite. The five seeded-account tests are enabled with `SEED_DB_TESTS=1` against a fresh reset, before interactive changes to the demo profiles. Seed assertions exclude future workouts rather than assuming the whole week's fixture volume is already complete.

This is local functional and concurrency verification, not a production-scale load test or provider/device attestation. The app still accepts legitimate manual workouts and the existing device ingestion flow; users cannot directly choose their resulting ratings or competition outcomes. Existing historical results are retained during migration rather than recalculated from incomplete historical receipt data.

The browser check also caught Home using the queued competition window for its training chart. Home now retains the full Eastern calendar week, including pre-registration workouts; a shared regression test covers that separation. The local demo walkthrough exercises onboarding, queue registration and cancellation against the production build and actual database.
