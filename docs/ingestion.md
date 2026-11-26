# Race results ingestion

New ingestion/discovery work follows [Public race results: ingestion and discovery scope](race-results-ingestion-scope.md) and [Platform architecture](race-results-architecture.md). The platform enforces one-time publication and report-driven corrections rather than routine refreshes.

## Reviewed acquisition (operator)

Provider-independent acquisition uses the rankings database tables `acquisition_candidates`, `acquisition_source_decisions`, `acquisition_edition_mappings`, and `acquisition_runs`. Discovery feeds candidates; it does not grant source approval.

| Step | Command |
| --- | --- |
| Bootstrap NYC 2026 candidate (blocked by default) | `RANKINGS_DATABASE_URL=... pnpm rankings:candidate -- --nyc-2026` |
| Record source permission after review | `pnpm rankings:candidate -- --source-review --slug nyrr_nyc_marathon --decision permitted --storage-allowed --evidence-url URL --reuse-notes "..." --reviewer you` |
| Approve edition mapping | `pnpm rankings:candidate -- --nyc-2026-map --approve --reviewer you` |
| Fetch, validate, stage import | `pnpm rankings:acquire -- --population-key nyrr:M2026:finishers --apply` |
| Replace an existing staged field | add `--replace-staged` (reconciles the staged population) |
| Publish staged edition | `pnpm rankings:acquire -- --publish-staged --population-key nyrr:M2026:finishers` |
| Queue approved mappings | `pnpm rankings:schedule -- --queue-approved` |

Acquisition runs write immutable artifacts under `packages/rankings/imports/runs/<run-id>/` (`normalized.jsonl`, `provider-responses.json`, `preview.json`, `import.sql`). Blocked or unreviewed sources cannot fetch. `assertPreviewAllowsApply` must pass before `--apply`. Imports always stage (`publication_state = staged`); `publish-staged` calls `publish_event_edition` after re-checking mapping approval.

Unattended scheduling and extra provider adapters remain deferred; these PRs deliver the operator-run flow only.

The rankings ledger stores one row per finisher. Finish time is not part of the identity key. People under 18 are dropped before insert. A source is shown on `/rankings` only when `display_allowed` is true, which requires attribution and reuse notes.

New MikaTiming, CSV and RunSignup sources are stored with `display_allowed = false`. Review source-specific access/reuse and attribution before enabling display through an authorized operator database action. Reimports preserve the source's existing approval, suppression, access method, attribution, reuse notes and audit timestamp. The committed OpenTrack fixture retains its existing ODbL metadata. These examples describe results submission and organizer opt-out; they are not licenses:

- [Add an event from a public results link](https://athlinks.zendesk.com/hc/en-us/articles/217991618-I-can-t-find-my-event-listed-in-Athlinks-Can-I-add-the-event)
- [Organizer opt-out example](https://athlinks.zendesk.com/hc/en-us/articles/218007878-Why-can-t-I-find-results-for-a-well-known-popular-event)

## Publication Gates and Pre-Fetch Skipping

Every edition in the database tracks publication state (`draft`, `staged`, `published`, `frozen`), `revision` (integer >= 1), `published_at`, and `frozen_at`:

1. **Pre-fetch skipping**: When `RANKINGS_DATABASE_URL` is set, the CLI inspects the edition state before scraping the provider. If the edition is already frozen or published (without `--allow-correction`), scraping is skipped entirely.
2. **Transaction row-lock**: Generated SQL row-locks `public.event_editions` (`for update`). Ordinary acquisition cannot mutate a published edition without `--allow-correction`.
3. **Frozen editions**: Frozen editions cannot be mutated by ordinary imports or corrections.
4. **Authorized corrections**: Pass `--allow-correction` (and optional `--expected-revision <N>`) to increment revision and apply reviewed updates.
5. **Provider namespace**: The external result ID unique index is scoped to `(source_id, event_edition_id, external_result_id)`, safely allowing ID reuse across multiple editions of the same source.

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

Optional CLI controls:
- `--allow-correction`: Authorize updating an already published edition (increments edition revision).
- `--freeze`: Transition edition to frozen state after import.
- `--expected-revision <N>`: Verify the database edition matches revision `N` before applying a correction.

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

2026 World Marathon Majors status and operator commands: [majors-2026-acquisition.md](majors-2026-acquisition.md). MikaTiming catalog slugs `*-marathon-2026` include split profiles; checkpoint import is `pnpm rankings:splits -- --slug <slug>` after finisher SQL is applied. When bulk split SQL stops on one bad row, apply remaining lines from `<slug>.splits.jsonl` with `pnpm rankings:splits-apply-pending -- --slug <slug>` (per-athlete import; aligns finish split to chip time).

ChronoTrack Live (AZP) events use catalog slugs with `chronotrackEventId` / `chronotrackRaceId` (e.g. `sf-marathon-2026`, full course race `242840` on event `91608`). Finishers come from `reignite-api.athlinks.com` with an anonymous `ctlive-api` session token (`Origin: https://live.chronotrack.com`). Splits use the entry/result JSON when available; when the AZP API returns 403, the CLI falls back to SSR on `live.chronotrack.com/event/<id>/results/entry/<entryId>`. Only athletes with every checkpoint in the profile are stored (same rule as MikaTiming).

Race Day Timing / Startline HTML lists use `racedayTimingPath` on the catalog row (e.g. `banff-half-2026` on `racedaytiming.ca`). Pages paginate as `/page/N`; only chip finish times are available (no public splits).

Replay course tracks for the observatory/replay renderer live in `public.rankings_replay_courses`. Import with:

```sh
pnpm rankings:course -- --slug banff-half-2026 --display-allowed
pnpm rankings:course -- --slug sf-marathon-2026 --display-allowed
pnpm rankings:course -- --slug tokyo-marathon-2025 --display-allowed
```

Tokyo uses the committed `fixtures/courses/tokyo-marathon-2025.gpx` trace (official course map), scaled to `42.195 km`. Finishers (chip times only, no splits) use MarathonGuide's JSON API via `pnpm rankings:ingest-marathonguide -- --slug tokyo-marathon-2025` after source review; Cloudflare may block unattended cloud fetches.

Banff uses the organizer-linked MapMyRun route (`5544185092`). SF uses the committed `fixtures/courses/sf-marathon-2026-full.gpx` trace aligned to the published 2026 course map, scaled to exactly `42.195 km` / `21.0975 km` so `private.valid_replay_course` passes.

Readable public lists, copied in the latest run: Boston Marathon 2025 (28,404), London Marathon 2025 mass (55,226), Berlin Marathon 2025 runners (48,345), Chicago Marathon 2025 (54,109), Generali Berlin 5K 2025 (9,168), plus the OpenTrack 10 km fixture (44). Chicago's public page listed 54,315. The extra sex filter repeated people already stored, so that pass stopped.

Not ingested in the October trial: New York City Marathon (script shell, no list in the HTML), Tokyo Marathon (timing host not found), Sydney Marathon (host name did not resolve). No half marathon list was on those pages. Historical extraction counts are in [ingestion-trial.json](ingestion-trial.json); these sources have not been retried as part of the extraction-safety change.

## Discover RunSignup editions for review

Use a known event name and a bounded historical date window. The command queries
the [RunSignup race catalog](https://runsignup.com/API/races/GET) for races with
results, then emits pending candidate JSON. Candidate identity uses the provider
race ID and event-day date. A listing with results can still have an incomplete
or preliminary field, or results for a different edition.

```sh
pnpm --silent rankings:candidate -- --discover-runsignup --name "Race name" --from 2026-01-01 --through 2026-10-31 > /tmp/race-candidates.json
pnpm rankings:candidate -- --import /tmp/race-candidates.json
```

The first command only reads catalog metadata. The second writes to the
configured rankings review inbox. Verify the edition, distance, final result
set and source permissions before acquisition. RunSignup's existing ingest
adapter still needs to be wired into the reviewed stage/publish workflow before
it can serve as an unattended acquisition worker. Discovery is operator-run.
