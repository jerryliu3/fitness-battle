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
