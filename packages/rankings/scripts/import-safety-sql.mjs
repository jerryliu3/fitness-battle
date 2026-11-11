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
      and p.unpublished
  ) then
    raise exception 'Correction failed to unpublish removed result';
  end if;
end $safety$;

-- 10. Direct update of a frozen edition to published or draft is rejected by trigger
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
    update public.event_editions set publication_state = 'published' where id = v_ed_id;
    raise exception 'Direct update allowed unfreezing a frozen edition';
  exception when others then
    if sqlerrm not like '%is frozen and cannot transition%' then raise; end if;
  end;
end $safety$;

-- 11. Draft and staged editions do not expose performances to public queries
do $safety$
declare
  v_draft_ed bigint;
  v_staged_ed bigint;
  v_draft_perf bigint;
  v_staged_perf bigint;
  v_evt bigint;
  v_src bigint;
  v_rec bigint;
  v_page jsonb;
begin
  select id into v_src from public.sources where slug = ${quote(slug)};
  insert into public.events(source_id, external_event_id, name)
  values (v_src, 'visibility_test', 'Visibility Test Event')
  returning id into v_evt;

  insert into public.event_editions(event_id, edition_year, name, publication_state)
  values (v_evt, 2090, 'Draft Edition', 'draft')
  returning id into v_draft_ed;

  insert into public.event_editions(event_id, edition_year, name, publication_state)
  values (v_evt, 2091, 'Staged Edition', 'staged')
  returning id into v_staged_ed;

  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key)
  values (v_src, v_draft_ed, 'draft_1', 'draft runner', '10k:female')
  returning id into v_rec;

  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values (v_rec, v_draft_ed, 'Draft Runner', 'female', '10k', 2500000, 'chip', 'finished')
  returning id into v_draft_perf;

  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key)
  values (v_src, v_staged_ed, 'staged_1', 'staged runner', '10k:female')
  returning id into v_rec;

  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values (v_rec, v_staged_ed, 'Staged Runner', 'female', '10k', 2600000, 'chip', 'finished')
  returning id into v_staged_perf;

  -- Ensure sources is display_allowed for testing public query gate
  update public.sources set display_allowed = true where id = v_src;

  -- Verify rankings_page_scoped hides draft and staged
  v_page := public.rankings_page_scoped('10k', 'female', 2090);
  if jsonb_array_length(v_page->'rows') <> 0 then
    raise exception 'Draft edition leaked into rankings_page_scoped';
  end if;

  v_page := public.rankings_page_scoped('10k', 'female', 2091);
  if jsonb_array_length(v_page->'rows') <> 0 then
    raise exception 'Staged edition leaked into rankings_page_scoped';
  end if;

  -- Verify rankings_result hides draft and staged
  if public.rankings_result(v_draft_perf) is not null then
    raise exception 'Draft performance leaked into rankings_result';
  end if;
  if public.rankings_result(v_staged_perf) is not null then
    raise exception 'Staged performance leaked into rankings_result';
  end if;

  -- Verify rankings_saved hides draft and staged
  if jsonb_array_length(public.rankings_saved(array[v_draft_perf, v_staged_perf])) <> 0 then
    raise exception 'Draft/staged performances leaked into rankings_saved';
  end if;

  -- Verify rankings_top hides draft and staged
  if exists (
    select 1 from public.rankings_top('10k', 'female') where id in (v_draft_perf, v_staged_perf)
  ) then
    raise exception 'Draft/staged performances leaked into rankings_top';
  end if;

  -- Verify private.leaderboard_rows hides draft and staged
  if exists (
    select 1 from private.leaderboard_rows() where id in (v_draft_perf, v_staged_perf)
  ) then
    raise exception 'Draft/staged performances leaked into leaderboard_rows';
  end if;

  -- Verify refresh_rankings_distance_stats excludes draft and staged
  perform public.refresh_rankings_distance_stats();
  if (select result_count from public.rankings_distance_stats where distance_slug = '10k') <> (
    select count(*) from public.performances p
    join public.event_editions ed on ed.id = p.event_edition_id
    join public.sources s on s.id = (select source_id from public.events where id = ed.event_id)
    where p.distance_slug = '10k' and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ) then
    raise exception 'Distance stats included unpublished edition results';
  end if;
end $safety$;

rollback;
`);
