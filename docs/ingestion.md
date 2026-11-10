# Race results ingestion

New ingestion/discovery work follows [Public race results: ingestion and discovery scope](race-results-ingestion-scope.md). The owner requires weekly discovery of new editions, one-time publication, and report-driven corrections rather than routine refreshes. The first implementation slice hardens extraction and source decisions; publication freezing and scheduled discovery are not implemented yet. Do not schedule the current CLI: it still fetches/upserts existing editions.

The rankings ledger stores one row per finisher. Finish time is not part of the identity key. People under 18 are dropped before insert. A source is shown on `/rankings` only when `display_allowed` is true, which requires attribution and reuse notes.

New MikaTiming, CSV and RunSignup sources are stored with `display_allowed = false`. Review source-specific access/reuse and attribution before enabling display through an authorized operator database action. Reimports preserve the source's existing approval, suppression, access method, attribution, reuse notes and audit timestamp. The committed OpenTrack fixture retains its existing ODbL metadata. These examples describe results submission and organizer opt-out; they are not licenses:

- [Add an event from a public results link](https://athlinks.zendesk.com/hc/en-us/articles/217991618-I-can-t-find-my-event-listed-in-Athlinks-Can-I-add-the-event)
- [Organizer opt-out example](https://athlinks.zendesk.com/hc/en-us/articles/218007878-Why-can-t-I-find-results-for-a-well-known-popular-event)

## Methods

| Method | Command | What it reads |
| --- | --- | --- |
| OpenTrack JSON | `pnpm rankings:ingest` includes the committed 2025 Estonian 10 km fixture | Public competition JSON. Live OpenTrack hosts returned 403 from this network, so the fixture is the copy that imports. |
| Method | Command | What it reads |
| --- | --- | --- |
| OpenTrack JSON | `pnpm rankings:ingest` includes the committed 2025 Estonian 10 km fixture | Public competition JSON. Live OpenTrack hosts returned 403 from this network, so the fixture is the copy that imports. |
| MikaTiming list | `pnpm rankings:ingest` walks the major-event catalog | Public HTML list pages, sex by sex. Continues through short pages until an empty upstream page. Repeated rows, overlapping category requests, unparsed rows and page-cap exhaustion hold the import. Net finish time is stored as chip time. |
| CSV | `pnpm rankings:ingest --csv results.csv --distance 5k --name "Race" --year 2026` | A forwarded full file. Headers: `name` or `first`/`last`, `sex`, `chip_time` or `time`, optional `bib`, `age`, `division`. Empty/unparsed imports are held. |
| RunSignup | `pnpm rankings:ingest --runsignup RACE_ID --event EVENT_ID --result-set SET_ID --distance 5k --name "Race" --year 2026` | Enumerates result-set metadata, then fetches only the selected set. Requires explicit `public_results=T` and `preliminary_results=F` on metadata and every page. Uses upstream row counts, including excluded youth, for pagination. |

CSV and RunSignup require an explicit distance and edition year. Discover RunSignup set IDs using the documented [get-result-sets endpoint](https://runsignup.com/API/race/:race_id/results/get-result-sets/GET); choose the intended population rather than combining overlapping overall/division sets. API shape and paging follow [get-results](https://runsignup.com/API/race/:race_id/results/get-results/GET). Provider contract mismatches hold the import instead of treating an error response as an empty field. Live provider access and full-field totals still need validation before a source can be described as complete.

Each successful import writes `packages/rankings/imports/<slug>.jsonl` and `<slug>.import.sql`. Those files are gitignored because they are full fields. Apply them with `RANKINGS_DATABASE_URL='postgresql://...' pnpm rankings:ingest` after they exist, or `psql "$RANKINGS_DATABASE_URL" -f packages/rankings/imports/<slug>.import.sql`. The anon key cannot write this ledger.

Each extraction/application run writes a separate `packages/rankings/imports/run-<timestamp>.json` report, including failed provider requests and database application failures. The CLI exits nonzero on either failure. `docs/ingestion-trial.json` remains the historical October report, not a live status file. `--output-dir PATH` isolates artifacts/reports for local review. MikaTiming/RunSignup snapshot hashes now describe the exact emitted normalized JSONL; raw HTTP snapshot storage is still pending. A normalized artifact does not prove source completeness.

The legacy database unique index scopes external result IDs to an entire source. Generated imports reject collisions with other editions instead of moving an existing result. Widening that namespace requires a later additive migration. Both SQL emitters now use the same generator. Already-emitted SQL files must be regenerated to receive these protections.

## Local verification

Working directory: `/Users/jerryliu/Documents/fitness-battle/fitness-battle`.

After implementation is ready, run `pnpm --filter @fitness-battle/rankings test` and `pnpm --filter @fitness-battle/rankings typecheck` for the focused checks. Parser/CLI regression tests use local payloads and temporary output directories; the CLI tests explicitly disable database application.

Extraction-safety verification: all 32 rankings tests and the package typecheck passed. Script syntax checks and SQL-test generation passed. PostgreSQL execution was not available locally (`psql` absent and Docker socket inaccessible), so the SQL integration assertions have not been executed. No live result fetch or hosted database write was performed.

For SQL integration, first start/migrate a local rankings database with the existing `pnpm rankings:db:start` / `pnpm rankings:db:reset` setup. With `psql` available, run the rollback-only test against that local database (port 54422):

```sh
node packages/rankings/scripts/import-safety-sql.mjs > /tmp/rankings-import-safety.sql
psql 'postgresql://postgres:postgres@127.0.0.1:54422/postgres' -X -v ON_ERROR_STOP=1 -f /tmp/rankings-import-safety.sql
```

The test executes the actual generated SQL to check source review/suppression preservation, approval preservation, replay idempotence, corrections, quoted text, and atomic rejection of cross-edition ID collisions. Run it only locally; rollback does not undo sequence increments. Database integration execution requires a functioning local PostgreSQL/Supabase environment.

Current product preview is unchanged: `pnpm dev:web` then `http://localhost:3000/rankings`. For iOS, `pnpm dev:mobile`, press `i` with the existing development client, then Compete → Beyond this week.

## Major events in the catalog

Readable public lists, copied in the latest run: Boston Marathon 2025 (28,404), London Marathon 2025 mass (55,226), Berlin Marathon 2025 runners (48,345), Chicago Marathon 2025 (54,109), Generali Berlin 5K 2025 (9,168), plus the OpenTrack 10 km fixture (44). Chicago's public page listed 54,315. The extra sex filter repeated people already stored, so that pass stopped.

Not ingested in the October trial: New York City Marathon (script shell, no list in the HTML), Tokyo Marathon (timing host not found), Sydney Marathon (host name did not resolve). No half marathon list was on those pages. Historical extraction counts are in [ingestion-trial.json](ingestion-trial.json); these sources have not been retried as part of the extraction-safety change.
