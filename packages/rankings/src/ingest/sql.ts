import { createHash } from "node:crypto";
import type { IngestedEdition, IngestedFinish } from "./types";

export type EditionImportOptions = {
  allowCorrection?: boolean;
  freeze?: boolean;
  expectedRevision?: number;
};

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function rowJson(row: IngestedFinish) {
  const externalId = row.externalResultId?.trim();
  return {
    externalResultId: externalId ? externalId : null,
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
 * Enforces publication gates: frozen editions cannot be mutated; published editions
 * require explicit allowCorrection; re-runs bump revision when authorized.
 */
export function editionImportSql(
  edition: IngestedEdition,
  snapshot: { storagePath: string; contentSha256: string; byteSize: number },
  options?: EditionImportOptions,
): string {
  const payload = JSON.stringify(edition.results.map(rowJson));
  const input = JSON.stringify({ edition, snapshot, options });
  let tag = `body_${createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
  while (input.includes(`$${tag}$`)) tag += "_";
  const starts = edition.startsOn ? `${quote(edition.startsOn)}::date` : "null";
  return `do $${tag}$
declare
  v_source bigint;
  v_snapshot bigint;
  v_run bigint;
  v_event bigint;
  v_edition bigint;
  v_pub_state text;
  v_revision integer;
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
    access_method = case when public.sources.audited_at is not null then public.sources.access_method else excluded.access_method end,
    reuse_notes = case when public.sources.audited_at is not null then public.sources.reuse_notes else excluded.reuse_notes end,
    attribution = case when public.sources.audited_at is not null then public.sources.attribution else excluded.attribution end,
    -- Imports may suppress display, but cannot reverse an existing opt-out.
    display_allowed = case when public.sources.audited_at is not null then public.sources.display_allowed else public.sources.display_allowed and excluded.display_allowed end,
    audited_at = public.sources.audited_at
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
  values (v_source, ${edition.externalEventId ? quote(edition.externalEventId) : "null"}, ${quote(edition.eventName)})
  on conflict (source_id, external_event_id) where external_event_id is not null
  do update set name = excluded.name
  returning id into v_event;

  -- Publication gate: lock edition row and enforce import-once policy
  select id, publication_state, revision
  into v_edition, v_pub_state, v_revision
  from public.event_editions
  where event_id = v_event and edition_year = ${edition.editionYear}
  for update;

  if v_edition is not null then
    if v_pub_state = 'frozen' then
      raise exception 'Edition % is frozen (revision %); imports cannot mutate a frozen edition', v_edition, v_revision;
    elsif v_pub_state = 'published' and not ${options?.allowCorrection ? "true" : "false"} then
      raise exception 'Edition % is already published (revision %); ordinary acquisition cannot mutate a published edition without an authorized correction', v_edition, v_revision;
    end if;
    ${
      typeof options?.expectedRevision === "number"
        ? `if v_revision <> ${options.expectedRevision} then
      raise exception 'Expected edition revision % but found %; correction held', ${options.expectedRevision}, v_revision;
    end if;`
        : ""
    }
    update public.event_editions
    set name = ${quote(edition.eventName)},
        starts_on = ${starts},
        revision = case when ${options?.allowCorrection ? "true" : "false"} then revision + 1 else revision end,
        publication_state = ${options?.freeze ? "'frozen'" : "'published'"},
        published_at = coalesce(published_at, now()),
        frozen_at = case when ${options?.freeze ? "true" : "false"} then coalesce(frozen_at, now()) else frozen_at end
    where id = v_edition;
  else
    ${
      typeof options?.expectedRevision === "number"
        ? `raise exception 'Expected edition revision % but edition does not exist; correction held', ${options.expectedRevision};`
        : ""
    }
    insert into public.event_editions (
      event_id, edition_year, name, starts_on, publication_state, revision, published_at, frozen_at
    ) values (
      v_event,
      ${edition.editionYear},
      ${quote(edition.eventName)},
      ${starts},
      ${options?.freeze ? "'frozen'" : "'published'"},
      1,
      now(),
      ${options?.freeze ? "now()" : "null"}
    )
    returning id into v_edition;
  end if;

  for v_row in select value from jsonb_array_elements(${quote(payload)}::jsonb)
  loop
    -- If an unmigrated database still has the legacy source-wide constraint, guard against cross-edition relocation.
    if exists (
      select 1 from public.source_records
      where source_id = v_source
        and external_result_id = nullif(v_row->>'externalResultId', '')
        and event_edition_id <> v_edition
    ) and not exists (
      select 1 from pg_indexes
      where schemaname = 'public' and tablename = 'source_records' and indexname = 'source_records_source_edition_external_idx'
    ) then
      raise exception 'External result ID already belongs to another edition; import held';
    end if;
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
      and event_edition_id = v_edition
      and (
        (external_result_id is not null and external_result_id = nullif(btrim(v_row->>'externalResultId'), ''))
        or (
          external_result_id is null
          and normalized_name = v_row->>'normalizedName'
          and coalesce(normalized_bib, '') = coalesce(v_row->>'normalizedBib', '')
          and category_key = v_row->>'categoryKey'
        )
      )
    order by id desc
    limit 1;
    if v_record is null then
      raise exception 'Source record lookup failed for % in edition %', v_row->>'normalizedName', v_edition;
    end if;
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
  ${
    options?.allowCorrection
      ? `
  -- Reconcile corrected full-field population: remove missing results from the published field.
  -- Only performances matching this edition and the imported distances and categories that were not updated in this run are unpublished.
  update public.performances p
  set unpublished = true,
      updated_at = now()
  from public.source_records sr
  where p.source_record_id = sr.id
    and p.event_edition_id = v_edition
    and p.distance_slug in (select distinct value->>'distance' from jsonb_array_elements(${quote(payload)}::jsonb))
    and sr.category_key in (select distinct value->>'categoryKey' from jsonb_array_elements(${quote(payload)}::jsonb))
    and sr.last_ingestion_run_id <> v_run
    and not p.unpublished;
`
      : ""
  }
  update public.ingestion_runs
  set status = 'succeeded',
      finished_at = now(),
      insert_count = v_inserts,
      update_count = v_updates
  where id = v_run;
end
$${tag}$;
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
