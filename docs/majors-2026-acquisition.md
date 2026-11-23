# World Marathon Majors — 2026 acquisition status

Last checked: 23 November 2026. Finish lists use `pnpm rankings:ingest`, provider-specific CLIs below, or reviewed acquisition for NYRR. MikaTiming checkpoint splits use `pnpm rankings:splits` after the finisher import is applied.

## Hosted ledger (2026 editions, nevwdslqilysyeaccptz)

| Source | `publication_state` | Performances |
| --- | --- | ---: |
| `boston_marathon` | published | 29,037 |
| `nyrr_nyc_marathon` | published | 60,678 |
| `marathonguide_tokyo` | staged | 37,258 |
| `toronto_waterfront_marathon` | staged | 7,975 |
| `sf_marathon` | published | 7,103 |
| `banff_half_marathon` | published | 1,764 |

Boston Mika splits: ~11.8k rows scraped to artifacts; **not applied** (split SQL edition binding still needs a fix). Berlin, Chicago, and London 2026 are not in the ledger yet (Mika 403 risk when parallel). NYC field is ~373 short of NYRR’s advertised total; acceptable for now.

## Public finish times

| Major | Status | Access | Notes |
| --- | --- | --- | --- |
| Boston 2026 | In ledger (published) | [MikaTiming / BAA](https://results.baa.org/2026/) | Catalog slug `boston-marathon-2026`, event `R`. Boston mile+km checkpoint profile. |
| London 2026 | Not ingested | [MikaTiming](https://results.tcslondonmarathon.com/2026/) | `london-marathon-2026`, event `MAS`. Deprioritized; 403 during trial. |
| Berlin 2026 | Not ingested | [MikaTiming](https://berlin.r.mikatiming.com/2026/) | `berlin-marathon-2026`, event `BML_HCH3C0OH2F2`. Run sequentially with other Mika jobs. |
| Chicago 2026 | Not ingested | [MikaTiming](https://chicago-history.r.mikatiming.com/2026/) | `chicago-marathon-2026`, event `MAR_9TGG96381A5`. |
| New York 2026 | In ledger (published) | NYRR finishers JSON `M2026` | `pnpm rankings:acquire` (`nyrr:M2026:finishers`) after mapping approval. Splits: `pnpm rankings:nyrr-splits`. |
| Tokyo 2026 | In ledger (staged) | [MarathonGuide / Runzy](https://marathonguide.com/races/run/tokyo-marathon-copy/2026/results/) | `pnpm rankings:ingest-marathonguide -- --apply`. **No splits** on MarathonGuide. |
| Toronto Waterfront 2026 | In ledger (staged) | [Sportstats](https://sportstats.one/event/toronto-waterfront-marathon/leaderboard/146034) | `pnpm rankings:ingest-sportstats -- --apply` (`rid=146034`). Third-party; record reuse before display. |
| Sydney 2026 | Blocked | [MikaTiming stub](https://sydney.r.mikatiming.com/2026/) | Public page does not expose a full finisher list yet. |

Cape Town’s first AbbottWMM major is scheduled for 2027, not 2026.

## Split / checkpoint times

| Major | Splits | Method |
| --- | --- | --- |
| Boston, London, Berlin, Chicago | Available on MikaTiming athlete detail pages | `pnpm rankings:splits -- --slug <catalog-slug>` after `*.jsonl` import |
| New York 2026 | `POST …/runners/resultDetails` | `pnpm rankings:nyrr-splits -- --jsonl <acquire-normalized.jsonl>` after M2026 finishers are staged (no per-bib HTML scrape) |
| Tokyo 2026 (MarathonGuide) | Not on MarathonGuide | Official Tokyo timing / another source still needed for checkpoints |
| Sydney | Not available | Same blocker as finish lists |

MikaTiming detail pages expose cumulative chip times in the race-flow table (same source as the Chicago 2025 migration example).

## Operator commands

Working directory: `/Users/jerryliu/Documents/fitness-battle/fitness-battle`.

Link the rankings Supabase project for migrations (`cd rankings-db && supabase link --project-ref nevwdslqilysyeaccptz`). **Imports** need the **postgres pooler password** in the repo root `.env` (`RANKINGS_DB_PASSWORD` or `RANKINGS_DATABASE_URL`; see `.env.example`). The CLI login role and anon key are not sufficient to write the ledger.

```sh
# 1. Import 2026 MikaTiming marathons only (writes JSONL + SQL under packages/rankings/imports/)
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:ingest -- --edition-year 2026

# Or one race at a time:
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:ingest -- --from boston-marathon-2026

# 2. Checkpoint splits (one detail request per finisher; expect hours for full fields)
pnpm rankings:splits -- --slug chicago-marathon-2026
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:splits -- --slug chicago-marathon-2026

# 3. NYC finish times (after source review — see docs/ingestion.md)
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:candidate -- --nyc-2026
# … record --source-review permitted, --nyc-2026-map --approve …
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:acquire -- --population-key nyrr:M2026:finishers --apply
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:acquire -- --publish-staged --population-key nyrr:M2026:finishers

# 4. Tokyo (Runzy) and Toronto (Sportstats) — stage with display_allowed false until reuse review
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:ingest-marathonguide -- --apply
RANKINGS_DATABASE_URL='postgresql://…' pnpm rankings:ingest-sportstats -- --apply
```

Tune split acquisition with `--limit`, `--delay-ms` (default 120), and `--batch-size` (default 200 SQL rows per transaction block).

## Needs your input

1. **`RANKINGS_DATABASE_URL`** — required to load data into hosted Supabase (`nevwdslqilysyeaccptz`). Pooler URI from the Supabase dashboard → Project Settings → Database.
2. **NYRR display permission** — finishers JSON is readable, but bulk republication still needs a recorded `acquisition_source_decisions` row per `docs/ingestion.md`.
3. **Tokyo / Sydney** — send an official results link if you want those scraped manually or added when lists go live.