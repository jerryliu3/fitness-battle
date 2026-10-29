# Daily wave implementation review

See the [full code review](code-review.md) for the initial findings and corrections. The [Docker verification](local-verification.md) covers the implemented hard-deadline policy, server score authority, all 1,113 application tests and 22 SQL test files. The verification below records the earlier implementation stage.

The [Docker-backed demo screenshot](queued-web-docker.png) shows Dana's persisted Walking registration after the actual onboarding/cancellation walkthrough. The local production build and Supabase stack are available for review; no tracker connection is claimed.

The application now queues registrations, including onboarding, at the next 6 a.m. Eastern benchmark. Compete shows seven unnamed competitors and exact start/end times, then reveals the frozen database field at the start. Cancellation is available before the benchmark; running fields can stop renewal. Existing active rounds retain their bounds.

The [phone preview](queued-web.png) was captured from the production build at 390 × 844 using an offline sample account. Registration, timing labels, hidden identities and cancellation were exercised through the UI. Backend behavior was verified separately against the migrated database schema; the screenshot does not claim a live backend connection.

Validation:

- `pnpm test`: 1,098 tests passed; five existing environment-dependent persistence tests skipped.
- `pnpm typecheck`, `pnpm build:web`, and `pnpm lint:ui` passed.
- An embedded PostgreSQL instance applied 46 schema migrations (the production demo-auth seed was excluded; basic test categories were provided), including a pre-upgrade legacy registration fixture. The migration preserved an existing assigned field and gave an unassigned legacy athlete a separate frozen field.
- Ten SQL files passed in rollback transactions: daily waves, closed-field seating, weekly field social choices, versioned account save, admin scenarios, roster totals, replay, admin field actions, admin round transactions and Crew activity reads. Public RPC execution grants and fixed search paths were checked. These checks do not simulate multi-connection load.

No production migration or deployment was performed. Apply both daily-wave migrations in order before deploying the matching API/web/native clients. The [domain and rollout contract](../../daily-waves.md) records the schema, matcher, legacy behavior and Recovery scoring limitation.
