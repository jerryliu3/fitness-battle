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
const nextYearEdition = { ...edition, editionYear: 2027, startsOn: "2027-04-20" };
const editionWithTwo = {
  ...editionFromOpenTrack({
    id: "event-two",
    date: "2026-05-20",
    fullName: "Import safety two-runner",
    events: [{ eventId: "1", eventCode: "10K", genders: "F", units: [{ results: [{ bib: "1", performance: "34:27" }, { bib: "2", performance: "35:00" }] }] }],
    competitors: [
      { competitorId: "1", fullName: "Runner One", gender: "F", ageGroup: "SEN" },
      { competitorId: "2", fullName: "Runner Disqualified", gender: "F", ageGroup: "SEN" },
    ],
  }),
  sourceSlug: `${slug}_two`,
  displayAllowed: true,
};
const correctedOneOnly = {
  ...editionWithTwo,
  results: [editionWithTwo.results[0]],
};

console.log(`
begin;
set local statement_timeout = '10s';

-- 1. Initial import publishes edition at revision 1
${editionImportSql(edition, snapshot)}

do $safety$
declare
  v_pub text;
  v_rev integer;
begin
  select ed.publication_state, ed.revision into v_pub, v_rev
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(slug)} and ed.edition_year = 2026;

  if v_pub <> 'published' or v_rev <> 1 then
    raise exception 'Initial import did not set publication_state=published and revision=1 (got %, %)', v_pub, v_rev;
  end if;
end $safety$;

-- 2. Ordinary acquisition replay on published edition is rejected by publication gate
do $safety$
begin
  begin
    execute ${quote(editionImportSql(corrected, snapshot))};
    raise exception 'Ordinary acquisition unexpectedly mutated a published edition';
  exception when others then
    if sqlerrm not like 'Edition % is already published%' then raise; end if;
  end;
end $safety$;

-- 3. Source reviews survive imports
update public.sources set
  display_allowed = false,
  audited_at = '2026-01-01T00:00:00Z',
  reuse_notes = 'Reviewed access decision',
  attribution = 'Reviewed attribution',
  access_method = 'Reviewed method'
where slug = ${quote(slug)};

-- 4. Authorized correction updates performance, bumps revision, preserves source review
${editionImportSql(corrected, snapshot, { allowCorrection: true })}

do $safety$
declare
  v_pub text;
  v_rev integer;
begin
  if not exists (
    select 1 from public.sources where slug = ${quote(slug)}
      and not display_allowed and audited_at = '2026-01-01T00:00:00Z'
      and reuse_notes = 'Reviewed access decision'
      and attribution = 'Reviewed attribution' and access_method = 'Reviewed method'
  ) then raise exception 'Import overwrote source review or suppression'; end if;

  select ed.publication_state, ed.revision into v_pub, v_rev
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(slug)} and ed.edition_year = 2026;

  if v_rev <> 2 then
    raise exception 'Correction did not bump revision from 1 to 2 (got %)', v_rev;
  end if;

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

-- 5. Stale revision rejection: providing expectedRevision = 1 when revision is now 2 fails
do $safety$
begin
  begin
    execute ${quote(editionImportSql(corrected, snapshot, { allowCorrection: true, expectedRevision: 1 }))};
    raise exception 'Stale expectedRevision was accepted';
  exception when others then
    if sqlerrm not like 'Expected edition revision 1 but found 2%' then raise; end if;
  end;
end $safety$;

-- 6. Freeze edition and verify frozen editions cannot be mutated even with allowCorrection
${editionImportSql(corrected, snapshot, { allowCorrection: true, freeze: true })}

do $safety$
declare
  v_pub text;
begin
  select ed.publication_state into v_pub
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(slug)} and ed.edition_year = 2026;

  if v_pub <> 'frozen' then
    raise exception 'Edition was not frozen (got %)', v_pub;
  end if;

  begin
    execute ${quote(editionImportSql(corrected, snapshot, { allowCorrection: true }))};
    raise exception 'Frozen edition was mutated';
  exception when others then
    if sqlerrm not like 'Edition % is frozen%' then raise; end if;
  end;
end $safety$;

-- 7. Widened provider namespace: next year edition with same external ID imports cleanly
${editionImportSql(nextYearEdition, snapshot)}

do $safety$
begin
  if (select count(*) from public.event_editions ed join public.events e on e.id = ed.event_id
      join public.sources s on s.id = e.source_id where s.slug = ${quote(slug)}) <> 2 then
    raise exception 'Provider namespace did not permit second edition for the same source';
  end if;
  if (select count(*) from public.source_records sr join public.sources s on s.id = sr.source_id
      where s.slug = ${quote(slug)}) <> 2 then
    raise exception 'Expected 2 distinct source records across the two editions';
  end if;
end $safety$;

-- 8. publish_event_edition rejects frozen editions
do $safety$
declare
  v_ed_id bigint;
begin
  select ed.id into v_ed_id
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(slug)} and ed.edition_year = 2026;

  begin
    perform public.publish_event_edition(v_ed_id);
    raise exception 'publish_event_edition allowed unfreezing a frozen edition';
  exception when others then
    if sqlerrm not like '%frozen and cannot be published%' then raise; end if;
  end;
end $safety$;

-- 9. Correction reconciliation unpublishes removed results from the field
${editionImportSql(editionWithTwo, snapshot)}
${editionImportSql(correctedOneOnly, snapshot, { allowCorrection: true })}

do $safety$
begin
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_two`)}
      and p.athlete_name = 'Runner Disqualified'
      and not p.eligible and p.unpublished
  ) then
    raise exception 'Correction failed to unpublish removed result';
  end if;
end $safety$;

rollback;
`);
