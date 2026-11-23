import { CHECKPOINT_PROFILES } from "./checkpoint-profiles";
import type { CatalogEvent } from "./catalog";
import type { ParsedMikaSplits } from "./mikatiming-splits";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export type SplitImportRow = {
  externalResultId: string;
  splits: ParsedMikaSplits;
  sourceUrl: string;
};

export type SplitEditionTarget = {
  sourceSlug: string;
  externalEventId: string;
  editionYear: number;
  distance: string;
  splitProfileId: string;
};

export function splitImportSqlForEdition(edition: SplitEditionTarget, rows: SplitImportRow[]): string {
  const profile = CHECKPOINT_PROFILES[edition.splitProfileId];
  if (!profile) throw new Error(`Unknown split profile ${edition.splitProfileId}`);

  const distanceArray = `array[${profile.distancesM.join(", ")}]::numeric[]`;
  const valueRows = rows
    .map((row) => {
      const elapsed = `array[${row.splits.elapsedMs.map((ms) => (ms == null ? "null" : String(ms))).join(", ")}]::integer[]`;
      return `(${quote(row.externalResultId)}, ${elapsed}, ${quote(row.sourceUrl)})`;
    })
    .join(",\n    ");

  return `
do $$
declare
  target_edition_id bigint;
  cps_id bigint;
begin
  select ed.id into target_edition_id
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(edition.sourceSlug)}
    and e.external_event_id = ${quote(edition.externalEventId)}
    and ed.edition_year = ${edition.editionYear}
  limit 1;

  if target_edition_id is null then
    raise exception ${quote(`Edition not found for ${edition.sourceSlug} ${edition.editionYear}`)};
  end if;

  select id into cps_id
  from public.race_checkpoint_sets
  where event_edition_id = target_edition_id and distance_slug = ${quote(edition.distance)}
  limit 1;

  if cps_id is null then
    insert into public.race_checkpoint_sets (event_edition_id, distance_slug, distances_m)
    values (target_edition_id, ${quote(edition.distance)}, ${distanceArray})
    returning id into cps_id;
  end if;

  insert into public.performance_split_times (
    performance_id,
    checkpoint_set_id,
    clock,
    elapsed_ms,
    source_url,
    start_at,
    performance_updated_at
  )
  select
    p.id,
    cps_id,
    'chip',
    v.elapsed_ms,
    v.source_url,
  null,
    p.updated_at
  from (values
    ${valueRows}
  ) as v(external_result_id, elapsed_ms, source_url)
  join public.source_records sr on sr.external_result_id = v.external_result_id
    and sr.event_edition_id = target_edition_id
  join public.performances p on p.source_record_id = sr.id and p.event_edition_id = target_edition_id
  where p.distance_slug = ${quote(edition.distance)}
    and p.chip_time_ms is not null
  on conflict (performance_id) do update set
    checkpoint_set_id = excluded.checkpoint_set_id,
    clock = excluded.clock,
    elapsed_ms = excluded.elapsed_ms,
    source_url = excluded.source_url,
    performance_updated_at = excluded.performance_updated_at;
end;
$$;
`.trim();
}

export function splitImportSql(event: CatalogEvent, rows: SplitImportRow[]): string {
  if (!event.splitProfileId || !event.listUrl) {
    throw new Error("Catalog event does not support checkpoint splits.");
  }
  return splitImportSqlForEdition(
    {
      sourceSlug: event.sourceSlug,
      externalEventId: event.externalEventId,
      editionYear: event.editionYear,
      distance: event.distance,
      splitProfileId: event.splitProfileId,
    },
    rows,
  );
}