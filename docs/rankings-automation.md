# Race discovery and refresh operations

## Discovery inbox

`pnpm rankings:discover --since UNIX_SECONDS` starts the first scan. Subsequent invocations of `pnpm rankings:discover` resume with a 24-hour overlap. `--until UNIX_SECONDS` can bound a historical scan. `--state PATH` and `--report PATH` override the default ignored `.local/rankings/` files.

Set the server-only `RANKINGS_RUNSIGNUP_CALLER_ID` and `RANKINGS_RUNSIGNUP_CALLER_SECRET` in the worker environment. Credentials are passed using the provider's caller ID and secret-header scheme, never written to checkpoint files or reports. Access is not presumed: absent credentials and 401/403 responses fail explicitly. No credentials have been configured or live scans run by this implementation.

The inbox stores event/result-set identifiers, names and modification timestamps only. It does not fetch participant rows, infer distance/date, grant source display approval or write the rankings database. A result-set candidate needs mapping to the exact race edition, distance and public source before import.

One fixed modification window is fully paged before replacing the checkpoint atomically. Repeated pages, malformed metadata, out-of-window timestamps, oversized responses and page limits leave the prior checkpoint intact. Retries/timeouts are bounded. Overlapping windows deduplicate by race + event + result-set IDs, keeping the newest metadata. The provider does not promise snapshot pagination; overlap reduces drift risk but periodic wider reconciliation is still needed. Very large backfills must be split into bounded windows.

Concurrent workers use an exclusive checkpoint lock. After an abrupt process termination, inspect the lock PID and ensure no worker remains before removing a stale lock; no automatic lock stealing occurs. A failed attempt writes a metadata-only report. The checkpoint must be retained between scheduled invocations; an ephemeral filesystem alone is not a durable scheduler.

Provider contract: [updated public result sets](https://runsignup.com/API/v2/results/updated-result-sets.json/GET), [event result-set metadata](https://runsignup.com/API/race/:race_id/results/get-result-sets/GET). Endpoint access/limits and source reuse remain subject to the provider; discovery is not permission to republish.

## Delivery status

Discovery tooling is implemented but not activated. Refresh preparation and opt-in scheduling are the next layer. No local tests, typechecks, builds, live provider requests or production writes were run for this phase.

## Refresh preparation

`pnpm rankings:refresh --plan` lists due jobs from the discovery checkpoint and reviewed catalog, without fetching participant data. `pnpm rankings:refresh` prepares up to five mapped jobs locally; `--limit 1` through `--limit 20` controls that bound. `--catalog`, `--discovery`, `--state` and `--report` select explicit paths.

The committed `packages/rankings/config/runsignup-events.json` starts empty. A mapping must contain numeric-string `raceId`, `eventId`, `resultSetId`, an exact supported `distance`, official `name`, `editionYear`, ISO event `date`, `attribution`, `reuseNotes` and `reviewedAt`. The date must agree with the edition year. No names or distances are guessed from update-feed labels. Add mappings only after checking source access and reuse; a mapping does not override an existing database display suppression or certify a complete field.

Before preparation, the worker requires the selected result set to be explicitly public and final, with an available provider finisher count. It checks that each result page still belongs to the public/final set, rejects duplicate/missing raw result IDs, and reconciles raw input rows with the count after fetching. A count mismatch or changed status holds the import for reconciliation; provider definitions may require manual investigation. Stable counts do not establish snapshot consistency if clocks changed during pagination. The normalized files and subsequent coverage review remain necessary.

The worker launches the existing importer with `--provider-auth --prepare-only`, explicitly clears `RANKINGS_DATABASE_URL`, and supplies a private local output directory and report path. Preparation cannot apply SQL even if the parent shell has database credentials. Successful metadata checkpoints store the provider timestamp, catalog fingerprint and output paths; failed jobs do not advance, and missing local artifacts make a job due again. Mapping changes also make a job due. Each provider version/catalog hash has separate output files under ignored `.local/rankings/prepared/`; normalized RunSignup snapshot hashes describe the emitted JSONL. Under-18 exclusions remain in the parser, and no raw participant response is archived by this worker.

Inspect the prepared import report, source/count definitions and normalized output before any separate database apply. Import publication, disappeared-result reconciliation, coverage certification and cache/count refresh are not automated by this phase. Prepared jobs are not published jobs.

## Opt-in scheduled discovery

The `Rankings discovery` workflow is disabled unless repository variable `RANKINGS_DISCOVERY_ENABLED` is `true`. Configure the two caller secrets and a bounded initial Unix timestamp in variable `RANKINGS_DISCOVERY_SINCE` before enabling. It runs every six hours or by manual dispatch, with concurrency serialization and no dependency installation, test suite, build, or database secret.

Scheduled runs only discover and plan. They never fetch participant rows or execute imports. Only metadata/checkpoints/reports are archived, for 30 days. A successful discovery checkpoint is cached even if planning fails. GitHub cache retention/eviction is best effort: on cache loss the explicit bootstrap window is replayed, or an operator can restore the archived checkpoint. This is not a database-backed queue or a durable production publisher. Large bootstrap ranges may hit the bounded page limit and must be split deliberately; do not advance a checkpoint manually just to hide that failure.

Local preparation needs a persistent filesystem; copying only its metadata checkpoint without its output artifacts intentionally makes jobs due again. No workflow variables/secrets were configured, no schedule activated, and no provider scan, participant fetch or database write was performed by this implementation.

Worker environment template: `packages/rankings/.env.example`. The commands read their process environment; they do not automatically load the web app's env files. With Node 22.18+, a local ignored env file can be loaded explicitly, for example `node --env-file=packages/rankings/.env packages/rankings/scripts/discover.mjs --since UNIX_SECONDS`. Keep the checkpoint and prepared artifacts on the same persistent filesystem when using local refresh preparation.
