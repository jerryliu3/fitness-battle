import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);

const { readFileSync, writeFileSync } = await import("node:fs");
const { createHash } = await import("node:crypto");
const { parseOpenTrackCompetition } = await import("../src/opentrack.ts");

const fixturePath = new URL("../fixtures/emv-10k-2025.json", import.meta.url);
const raw = readFileSync(fixturePath);
const parsed = parseOpenTrackCompetition(JSON.parse(raw.toString("utf8")), {
  sourceUrl: "https://estonia.opentrack.run/et/x/2025/EST/emv10km/",
});
const sha = createHash("sha256").update(raw).digest("hex");
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;

const payload = JSON.stringify(
  parsed.results.map((row) => ({
    externalResultId: row.externalResultId,
    athleteName: row.athleteName,
    normalizedName: row.normalizedName,
    normalizedBib: row.normalizedBib,
    sex: row.sex,
    distance: row.distance,
    categoryKey: row.categoryKey,
    gunTimeMs: row.gunTimeMs,
    sourceUrl: row.sourceUrl,
  })),
);

const sql = `do $body$
declare
  v_source bigint;
  v_snapshot bigint;
  v_run bigint;
  v_event bigint;
  v_edition bigint;
  v_record bigint;
  v_action text;
  v_row jsonb;
begin
  insert into public.sources (
    slug, name, access_method, reuse_notes, attribution, display_allowed, audited_at
  ) values (
    'opentrack',
    'OpenTrack',
    'Public JSON download from the competition downloads page',
    'OpenTrack asks organizers to publish under the Open Database License. This import uses that public download, which does not include dates of birth. Age groups that are entirely under 18 are not stored. Policy: https://opentrack.run/philosophy/opendata.html',
    '© OpenTrack contributors. Open Database License: https://www.opendatacommons.org/licenses/odbl/',
    true,
    now()
  )
  on conflict (slug) do update set
    reuse_notes = excluded.reuse_notes,
    attribution = excluded.attribution,
    access_method = excluded.access_method,
    display_allowed = true,
    audited_at = now()
  returning id into v_source;

  insert into public.source_snapshots (source_id, storage_path, content_sha256, byte_size)
  values (
    v_source,
    'packages/rankings/fixtures/emv-10k-2025.json',
    ${q(sha)},
    ${raw.length}
  )
  returning id into v_snapshot;

  insert into public.ingestion_runs (
    source_id, snapshot_id, status, finished_at, input_count, insert_count, skip_count
  ) values (
    v_source, v_snapshot, 'succeeded', now(), ${parsed.results.length + parsed.skippedYouth}, ${parsed.results.length}, ${parsed.skippedYouth}
  )
  returning id into v_run;

  insert into public.events (source_id, external_event_id, name)
  values (v_source, ${q(parsed.competitionId)}, ${q(parsed.eventName)})
  on conflict (source_id, external_event_id) where external_event_id is not null
  do update set name = excluded.name
  returning id into v_event;

  insert into public.event_editions (event_id, edition_year, name, starts_on)
  values (v_event, ${parsed.editionYear}, ${q(parsed.eventName)}, ${q(parsed.startsOn)}::date)
  on conflict (event_id, edition_year)
  do update set name = excluded.name, starts_on = excluded.starts_on
  returning id into v_edition;

  for v_row in select value from jsonb_array_elements($payload$${payload}$payload$)
  loop
    v_action := private.upsert_source_record(
      v_source,
      v_edition,
      v_row->>'externalResultId',
      v_row->>'normalizedName',
      nullif(v_row->>'normalizedBib', ''),
      v_row->>'categoryKey',
      v_run,
      v_snapshot
    );
    select id into v_record
    from public.source_records
    where source_id = v_source
      and external_result_id = v_row->>'externalResultId';
    v_action := private.upsert_performance(
      v_record,
      v_row->>'athleteName',
      v_row->>'sex',
      v_row->>'distance',
      null,
      null,
      (v_row->>'gunTimeMs')::bigint,
      'finished',
      ${q(parsed.startsOn)}::date,
      v_row->>'sourceUrl'
    );
  end loop;
end
$body$;`;

const out = new URL("../fixtures/emv-10k-2025.import.sql", import.meta.url);
writeFileSync(out, sql);
console.log(
  JSON.stringify({
    results: parsed.results.length,
    skippedYouth: parsed.skippedYouth,
    bytes: Buffer.byteLength(sql),
    sha,
  }),
);
