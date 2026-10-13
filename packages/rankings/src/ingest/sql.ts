import { createHash } from "node:crypto";
import type { IngestedEdition, IngestedFinish } from "./types";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function rowJson(row: IngestedFinish) {
  return {
    externalResultId: row.externalResultId,
    athleteName: row.athleteName,
    normalizedName: row.normalizedName,
    normalizedBib: row.normalizedBib,
    sex: row.sex,
    distance: row.distance,
    categoryKey: row.categoryKey,
    ageYears: row.ageYears,
    chipTimeMs: row.chipTimeMs,
    gunTimeMs: row.gunTimeMs,
    finishStatus: row.finishStatus,
    sourceUrl: row.sourceUrl,
  };
}

/**
 * One transaction that upserts a source, snapshot, edition, and every finisher.
 * Re-running the same file updates finish times without creating a second row.
 */
export function editionImportSql(
  edition: IngestedEdition,
  snapshot: { storagePath: string; contentSha256: string; byteSize: number },
): string {
  const payload = JSON.stringify(edition.results.map(rowJson));
  const tag = `imp_${snapshot.contentSha256.slice(0, 12)}`;
  const starts = edition.startsOn ? `${quote(edition.startsOn)}::date` : "null";
  return `do $body$
declare
  v_source bigint;
  v_snapshot bigint;
  v_run bigint;
  v_event bigint;
  v_edition bigint;
  v_record bigint;
  v_action text;
  v_row jsonb;
  v_inserts integer := 0;
  v_updates integer := 0;
begin
  insert into public.sources (
    slug, name, access_method, reuse_notes, attribution, display_allowed, audited_at
  ) values (
    ${quote(edition.sourceSlug)},
    ${quote(edition.sourceName)},
    ${quote(edition.accessMethod)},
    ${quote(edition.reuseNotes)},
    ${quote(edition.attribution)},
    ${edition.displayAllowed ? "true" : "false"},
    ${edition.displayAllowed ? "now()" : "null"}
  )
  on conflict (slug) do update set
    name = excluded.name,
    access_method = excluded.access_method,
    reuse_notes = excluded.reuse_notes,
    attribution = excluded.attribution,
    display_allowed = excluded.display_allowed,
    audited_at = case when excluded.display_allowed then now() else public.sources.audited_at end
  returning id into v_source;

  insert into public.source_snapshots (source_id, storage_path, content_sha256, byte_size)
  values (
    v_source,
    ${quote(snapshot.storagePath)},
    ${quote(snapshot.contentSha256)},
    ${snapshot.byteSize}
  )
  returning id into v_snapshot;

  insert into public.ingestion_runs (
    source_id, snapshot_id, status, input_count, skip_count
  ) values (
    v_source,
    v_snapshot,
    'running',
    ${edition.results.length + edition.skippedYouth + edition.skippedUnparsed},
    ${edition.skippedYouth + edition.skippedUnparsed}
  )
  returning id into v_run;

  insert into public.events (source_id, external_event_id, name)
  values (v_source, ${quote(edition.externalEventId)}, ${quote(edition.eventName)})
  on conflict (source_id, external_event_id) where external_event_id is not null
  do update set name = excluded.name
  returning id into v_event;

  insert into public.event_editions (event_id, edition_year, name, starts_on)
  values (v_event, ${edition.editionYear}, ${quote(edition.eventName)}, ${starts})
  on conflict (event_id, edition_year)
  do update set name = excluded.name, starts_on = excluded.starts_on
  returning id into v_edition;

  for v_row in select value from jsonb_array_elements($${tag}$${payload}$${tag}$)
  loop
    v_action := private.upsert_source_record(
      v_source,
      v_edition,
      nullif(v_row->>'externalResultId', ''),
      v_row->>'normalizedName',
      nullif(v_row->>'normalizedBib', ''),
      v_row->>'categoryKey',
      v_run,
      v_snapshot
    );
    if v_action = 'inserted' then
      v_inserts := v_inserts + 1;
    else
      v_updates := v_updates + 1;
    end if;
    select id into v_record
    from public.source_records
    where source_id = v_source
      and (
        (external_result_id is not null and external_result_id = v_row->>'externalResultId')
        or (
          external_result_id is null
          and event_edition_id = v_edition
          and normalized_name = v_row->>'normalizedName'
          and coalesce(normalized_bib, '') = coalesce(v_row->>'normalizedBib', '')
          and category_key = v_row->>'categoryKey'
        )
      )
    order by id desc
    limit 1;
    perform private.upsert_performance(
      v_record,
      v_row->>'athleteName',
      v_row->>'sex',
      v_row->>'distance',
      nullif(v_row->>'ageYears', '')::integer,
      nullif(v_row->>'chipTimeMs', '')::bigint,
      nullif(v_row->>'gunTimeMs', '')::bigint,
      v_row->>'finishStatus',
      ${starts},
      coalesce(v_row->>'sourceUrl', '')
    );
  end loop;

  update public.ingestion_runs
  set status = 'succeeded',
      finished_at = now(),
      insert_count = v_inserts,
      update_count = v_updates
  where id = v_run;
end
$body$;
`;
}

export function snapshotIdentity(body: Buffer | string, storagePath: string) {
  const raw = typeof body === "string" ? Buffer.from(body) : body;
  return {
    storagePath,
    contentSha256: createHash("sha256").update(raw).digest("hex"),
    byteSize: raw.length,
  };
}
