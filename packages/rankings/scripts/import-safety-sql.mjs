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

const editionWithTwoCategories = {
  ...editionFromOpenTrack({
    id: "event-categories",
    date: "2026-06-20",
    fullName: "Import safety multi-category",
    events: [
      { eventId: "1", eventCode: "10K", genders: "F", units: [{ results: [{ bib: "1", performance: "34:27" }] }] },
      { eventId: "2", eventCode: "10K", genders: "M", units: [{ results: [{ bib: "2", performance: "30:00" }] }] },
    ],
    competitors: [
      { competitorId: "1", fullName: "Female Runner", gender: "F", ageGroup: "SEN" },
      { competitorId: "2", fullName: "Male Disqualified", gender: "M", ageGroup: "SEN" },
    ],
  }),
  sourceSlug: `${slug}_cats`,
  displayAllowed: true,
};
const correctedFemaleOnly = {
  ...editionWithTwoCategories,
  results: editionWithTwoCategories.results.filter((r) => r.sex === "female"),
};

const editionSet100 = {
  sourceSlug: `${slug}_rs`,
  sourceName: "RunSignup Test",
  accessMethod: "RunSignup JSON",
  reuseNotes: "Public",
  attribution: "RunSignup",
  displayAllowed: true,
  externalEventId: "race-rs",
  eventName: "RunSignup Test Race",
  editionYear: 2026,
  startsOn: "2026-07-04",
  sourceUrl: "https://example.com/rs",
  results: [
    {
      externalResultId: "100:1",
      athleteName: "Set 100 Runner",
      normalizedName: "set 100 runner",
      normalizedBib: "100",
      sex: "female",
      distance: "10k",
      categoryKey: "10k:female",
      ageYears: 25,
      chipTimeMs: 2400000,
      gunTimeMs: 2400000,
      finishStatus: "finished",
      sourceUrl: "https://api.runsignup.com/rest/race/1/get-results?individual_result_set_id=100&page=1",
    },
  ],
  skippedYouth: 0,
  skippedUnparsed: 0,
};
const editionSet10And100 = {
  ...editionSet100,
  results: [
    ...editionSet100.results,
    {
      externalResultId: "10:1",
      athleteName: "Set 10 Runner",
      normalizedName: "set 10 runner",
      normalizedBib: "10",
      sex: "female",
      distance: "10k",
      categoryKey: "10k:female",
      ageYears: 30,
      chipTimeMs: 2500000,
      gunTimeMs: 2500000,
      finishStatus: "finished",
      sourceUrl: "https://api.runsignup.com/rest/race/1/get-results?individual_result_set_id=10&page=1",
    },
  ],
};
const correctedSet10 = {
  ...editionSet10And100,
  results: [
    editionSet100.results[0],
    {
      externalResultId: "10:2",
      athleteName: "Set 10 New Runner",
      normalizedName: "set 10 new runner",
      normalizedBib: "12",
      sex: "female",
      distance: "10k",
      categoryKey: "10k:female",
      ageYears: 32,
      chipTimeMs: 2600000,
      gunTimeMs: 2600000,
      finishStatus: "finished",
      sourceUrl: "https://api.runsignup.com/rest/race/1/get-results?individual_result_set_id=10&page=1",
    },
  ],
};
const editionRawCollision = {
  ...edition,
  sourceSlug: `${slug}_rs_collision`,
  results: [
    {
      externalResultId: "10:1",
      athleteName: "Set 10 Runner 1",
      normalizedName: "set 10 runner 1",
      normalizedBib: "101",
      sex: "female",
      distance: "10k",
      categoryKey: "10k:female",
      ageYears: 25,
      chipTimeMs: 2400000,
      gunTimeMs: 2400000,
      finishStatus: "finished",
      sourceUrl: "https://api.runsignup.com/rest/race/1/get-results?individual_result_set_id=10&page=1",
    },
    {
      externalResultId: "20:1",
      athleteName: "Set 20 Runner 1",
      normalizedName: "set 20 runner 1",
      normalizedBib: "201",
      sex: "female",
      distance: "10k",
      categoryKey: "10k:female",
      ageYears: 28,
      chipTimeMs: 2450000,
      gunTimeMs: 2450000,
      finishStatus: "finished",
      sourceUrl: "https://api.runsignup.com/rest/race/1/get-results?individual_result_set_id=20&page=1",
    },
  ],
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

-- 3. Source reviews survive imports (both approval and attribution)
update public.sources set
  display_allowed = true,
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
      and display_allowed and audited_at = '2026-01-01T00:00:00Z'
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

-- 9b. Evidence-backed re-import restores previously unpublished runner
${editionImportSql(editionWithTwo, snapshot, { allowCorrection: true })}

do $safety$
begin
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_two`)}
      and p.athlete_name = 'Runner Disqualified'
      and not p.unpublished
  ) then
    raise exception 'Re-import failed to restore previously unpublished runner';
  end if;
end $safety$;

-- 9c. Re-import does not un-suppress a runner with independent privacy suppression
do $safety$
begin
  update public.performances p
  set privacy_suppressed = true, unpublished = true
  from public.source_records sr
  join public.sources s on s.id = sr.source_id
  where sr.id = p.source_record_id
    and s.slug = ${quote(`${slug}_two`)}
    and p.athlete_name = 'Runner Disqualified';
end $safety$;

${editionImportSql(editionWithTwo, snapshot, { allowCorrection: true })}

do $safety$
begin
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_two`)}
      and p.athlete_name = 'Runner Disqualified'
      and p.unpublished and p.privacy_suppressed
  ) then
    raise exception 'Re-import unexpectedly un-suppressed runner with independent privacy suppression';
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

  -- Verify rankings_edition_history hides draft and staged
  if jsonb_array_length(public.rankings_edition_history(v_draft_ed, '10k', 'female')) <> 0 then
    raise exception 'Draft edition leaked into rankings_edition_history';
  end if;
  if jsonb_array_length(public.rankings_edition_history(v_staged_ed, '10k', 'female')) <> 0 then
    raise exception 'Staged edition leaked into rankings_edition_history';
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

-- 12. Correction reconciles disappearing categories when categoryKeys is omitted
${editionImportSql(editionWithTwoCategories, snapshot)}

do $safety$
begin
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_cats`)}
      and p.athlete_name = 'Male Disqualified'
      and not p.unpublished
  ) then
    raise exception 'Initial category import failed';
  end if;
end $safety$;

${editionImportSql(correctedFemaleOnly, snapshot, { allowCorrection: true, populationScope: { distanceSlug: "10k" } })}

do $safety$
begin
  -- Male runner whose category disappeared must be unpublished with correction_removed = true
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_cats`)}
      and p.athlete_name = 'Male Disqualified'
      and p.unpublished and p.correction_removed
  ) then
    raise exception 'Disappearing category failed to reconcile missing runners';
  end if;
  -- Female runner must remain published
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_cats`)}
      and p.athlete_name = 'Female Runner'
      and not p.unpublished
  ) then
    raise exception 'Active runner unexpectedly unpublished during category reconciliation';
  end if;
end $safety$;

-- 13. RunSignup reconciliation with externalResultIdPrefix does not unpublish other result sets (e.g. set 10 vs set 100)
${editionImportSql(editionSet10And100, snapshot)}

do $safety$
begin
  if (select count(*) from public.performances p
      join public.source_records sr on sr.id = p.source_record_id
      join public.sources s on s.id = sr.source_id
      where s.slug = ${quote(`${slug}_rs`)} and not p.unpublished) <> 2 then
    raise exception 'Initial RunSignup multi-set import failed';
  end if;
end $safety$;

${editionImportSql(correctedSet10, snapshot, {
  allowCorrection: true,
  populationScope: {
    distanceSlug: "10k",
    externalResultIdPrefix: "10:",
  },
})}

do $safety$
begin
  -- Set 10 old runner 10:1 was replaced by 10:2, so 10:1 must be unpublished
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs`)}
      and sr.external_result_id = '10:1'
      and p.unpublished and p.correction_removed
  ) then
    raise exception 'Missing set 10 runner failed to reconcile';
  end if;

  -- Set 10 new runner 10:2 must be published
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs`)}
      and sr.external_result_id = '10:2'
      and not p.unpublished
  ) then
    raise exception 'New set 10 runner not published';
  end if;

  -- Set 100 runner 100:1 MUST REMAIN PUBLISHED (NOT unseated by set 10 correction!)
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs`)}
      and sr.external_result_id = '100:1'
      and not p.unpublished
  ) then
    raise exception 'Set 100 runner was mistakenly unpublished by set 10 correction!';
  end if;
end $safety$;

-- 14. Pre-existing privacy/manual suppression remains suppressed even after correction or re-import
do $safety$
begin
  -- Mark set 100 runner with independent privacy suppression
  update public.performances p
  set privacy_suppressed = true, unpublished = true
  from public.source_records sr
  join public.sources s on s.id = sr.source_id
  where sr.id = p.source_record_id
    and s.slug = ${quote(`${slug}_rs`)}
    and sr.external_result_id = '100:1';
end $safety$;

-- Re-import the exact row with evidence
${editionImportSql(editionSet100, snapshot, { allowCorrection: true })}

do $safety$
begin
  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs`)}
      and sr.external_result_id = '100:1'
      and p.unpublished and p.privacy_suppressed
  ) then
    raise exception 'Pre-existing privacy suppression was cleared by re-import!';
  end if;
end $safety$;

-- 15. Namespaced result sets sharing raw result ID (1) insert distinct records without overwrite
${editionImportSql(editionRawCollision, snapshot)}

do $safety$
begin
  if (select count(*) from public.performances p
      join public.source_records sr on sr.id = p.source_record_id
      join public.sources s on s.id = sr.source_id
      where s.slug = ${quote(`${slug}_rs_collision`)}) <> 2 then
    raise exception 'Multi-set raw ID collision caused overwrites; expected 2 distinct performances';
  end if;

  if not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs_collision`)}
      and sr.external_result_id = '10:1'
      and p.athlete_name = 'Set 10 Runner 1'
  ) or not exists (
    select 1 from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    where s.slug = ${quote(`${slug}_rs_collision`)}
      and sr.external_result_id = '20:1'
      and p.athlete_name = 'Set 20 Runner 1'
  ) then
    raise exception 'Namespaced result set records were corrupted or overwritten';
  end if;
end $safety$;

rollback;
`);
