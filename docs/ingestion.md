# Race results ingestion

The rankings ledger stores one row per finisher. Finish time is not part of the identity key. People under 18 are dropped before insert. A source is shown on `/rankings` only when `display_allowed` is true, which requires attribution and reuse notes.

Working practice, until a lawyer reviews it: copy a full public official results list from a link someone sends, attribute the source, and set that source's `display_allowed` to false if the organizer says not to display it. These help pages are the pattern that practice follows. They are not a license.

- [Add an event from a public results link](https://athlinks.zendesk.com/hc/en-us/articles/217991618-I-can-t-find-my-event-listed-in-Athlinks-Can-I-add-the-event)
- [Organizer opt-out example](https://athlinks.zendesk.com/hc/en-us/articles/218007878-Why-can-t-I-find-results-for-a-well-known-popular-event)

## Methods

| Method | Command | What it reads |
| --- | --- | --- |
| OpenTrack JSON | `pnpm rankings:ingest` includes the committed 2025 Estonian 10 km fixture | Public competition JSON. Live OpenTrack hosts returned 403 from this network, so the fixture is the copy that imports. |
| MikaTiming list | `pnpm rankings:ingest` walks the major-event catalog | Public HTML list pages, sex by sex, 100 rows at a time. Net finish time is stored as chip time. |
| CSV | `pnpm rankings:ingest --csv results.csv --distance 5k --name "Race" --year 2026` | A forwarded full file. Headers: `name` or `first`/`last`, `sex`, `chip_time` or `time`, optional `bib`, `age`, `division`. |
| RunSignup | `pnpm rankings:ingest --runsignup RACE_ID --event EVENT_ID --distance 5k --name "Race" --year 2026` | Public `get-results` JSON. Sets with `public_results=F` are skipped. |

Each successful import writes `packages/rankings/imports/<slug>.jsonl` and `<slug>.import.sql`. Those files are gitignored because they are full fields. Apply them with `RANKINGS_DATABASE_URL='postgresql://...' pnpm rankings:ingest` after they exist, or `psql "$RANKINGS_DATABASE_URL" -f packages/rankings/imports/<slug>.import.sql`. The anon key cannot write this ledger.

## Major events in the catalog

Readable public lists, copied in the latest run: Boston Marathon 2025 (28,404), London Marathon 2025 mass (55,226), Berlin Marathon 2025 runners (48,345), Chicago Marathon 2025 (54,109), Generali Berlin 5K 2025 (9,168), plus the OpenTrack 10 km fixture (44). Chicago's public page listed 54,315. The extra sex filter repeated people already stored, so that pass stopped.

Not ingested: New York City Marathon (script shell, no list in the HTML), Tokyo Marathon (timing host not found), Sydney Marathon (host name did not resolve). No half marathon list was on those pages. The latest counts are in [ingestion-trial.json](ingestion-trial.json).
