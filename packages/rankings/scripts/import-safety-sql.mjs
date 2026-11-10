// Emit a rollback-only integration test of the actual SQL generator.
// Pipe into psql against a migrated local rankings database; never production.
import { register } from "node:module";
import { randomUUID } from "node:crypto";

register("./ts-resolve.mjs", import.meta.url);
const { editionFromOpenTrack, editionImportSql, snapshotIdentity } = await import("../src/index.ts");
const slug = `ingest_safety_${randomUUID().replaceAll("-", "")}`;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const edition = {
  ...editionFromOpenTrack({
    id: "event-1",
    date: "2026-04-20",
    fullName: "Import safety fixture",
    events: [{ eventId: "1", eventCode: "10K", genders: "F", units: [{ results: [{ bib: "1", performance: "34:27" }] }] }],
    competitors: [{ competitorId: "1", fullName: "O'Connor $body$ $payload$", gender: "F", ageGroup: "SEN" }],
  }),
  sourceSlug: slug,
  displayAllowed: false,
};
const snapshot = snapshotIdentity("{}", "fixtures/import-safety.json");
const corrected = { ...edition, displayAllowed: true, results: edition.results.map((row) => ({ ...row, gunTimeMs: 2_000_000 })) };
const collision = { ...edition, editionYear: 2027, startsOn: "2027-04-20" };
console.log(`
begin;
set local statement_timeout = '10s';
${editionImportSql(edition, snapshot)}
update public.sources set
  display_allowed = false,
  audited_at = '2026-01-01T00:00:00Z',
  reuse_notes = 'Reviewed access decision',
  attribution = 'Reviewed attribution',
  access_method = 'Reviewed method'
where slug = ${quote(slug)};
${editionImportSql(corrected, snapshot)}
do $safety$
begin
  if not exists (
    select 1 from public.sources where slug = ${quote(slug)}
      and not display_allowed and audited_at = '2026-01-01T00:00:00Z'
      and reuse_notes = 'Reviewed access decision'
      and attribution = 'Reviewed attribution' and access_method = 'Reviewed method'
  ) then raise exception 'Import overwrote source review or suppression'; end if;
  if (select count(*) from public.performances p join public.source_records sr on sr.id = p.source_record_id
      join public.sources s on s.id = sr.source_id where s.slug = ${quote(slug)}) <> 1 then
    raise exception 'Replay duplicated the result';
  end if;
  if not exists (
    select 1 from public.performances p join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id where s.slug = ${quote(slug)}
      and p.rank_time_ms = 2000000 and p.athlete_name = ${quote(edition.results[0].athleteName)}
  ) then raise exception 'Correction or quoted source text was not preserved'; end if;
end $safety$;
update public.sources set display_allowed = true where slug = ${quote(slug)};
${editionImportSql({ ...corrected, displayAllowed: false }, snapshot)}
do $safety$
begin
  if not (select display_allowed from public.sources where slug = ${quote(slug)}) then
    raise exception 'Import revoked an existing source approval';
  end if;
  begin
    execute ${quote(editionImportSql(collision, snapshot))};
    raise exception 'Cross-edition result ID was accepted';
  exception when others then
    if sqlerrm <> 'External result ID already belongs to another edition; import held' then raise; end if;
  end;
  if (select count(*) from public.event_editions ed join public.events e on e.id = ed.event_id
      join public.sources s on s.id = e.source_id where s.slug = ${quote(slug)}) <> 1 then
    raise exception 'Rejected collision left a partial edition';
  end if;
  if (select count(*) from public.source_snapshots sn join public.sources s on s.id = sn.source_id
      where s.slug = ${quote(slug)}) <> 3 then
    raise exception 'Rejected collision left snapshot writes';
  end if;
end $safety$;
rollback;
`);
