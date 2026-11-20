-- Isolated rankings database only. Invoke with ON_ERROR_STOP.
begin;
do $$
declare
  own_source bigint;
  other_source bigint;
  race bigint;
  edition bigint;
  record_id bigint;
  performance_id bigint;
  athlete bigint;
  live jsonb;
  cached jsonb;
  selected jsonb;
begin
  insert into public.sources(slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values ('fast_cohort_a', 'Fast cohort', 'Test', 'Test', true, now()) returning id into own_source;
  insert into public.sources(slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values ('fast_cohort_b', 'Second source', 'Test', 'Test', true, now()) returning id into other_source;
  insert into public.events(source_id, name) values (own_source, 'Fast cohort') returning id into race;
  insert into public.event_editions(event_id, edition_year, name, publication_state)
  values (race, 2095, 'Fast cohort', 'published') returning id into edition;

  for n in 1..4 loop
    insert into public.source_records(source_id, event_edition_id, normalized_name, normalized_bib, category_key)
    values (case when n = 1 then other_source else own_source end, edition, 'runner ' || n,
      case when n = 3 then 'A%_' else n::text end, '5k:female') returning id into record_id;
    insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug,
      chip_time_ms, rank_time_ms, rank_clock, finish_status, result_date)
    values (record_id, edition, case when n = 3 then 'Runner A%_' else 'Runner ' || n end, 'female', '5k',
      greatest(1, n - 1) * 10000, greatest(1, n - 1) * 10000, 'chip', 'finished', '2095-05-01')
    returning id into performance_id;
    if n = 3 then
      insert into public.rankings_athletes(display_name) values ('Reviewed runner') returning id into athlete;
      insert into public.rankings_athlete_results(performance_id, athlete_id, evidence_url, evidence_notes, performance_updated_at)
      select id, athlete, 'https://example.test/identity', 'Observed identity', updated_at
      from public.performances where id = performance_id;
    end if;
  end loop;

  live := public.rankings_page_scoped('5k', 'all', 2095, '', 1, '2095-05-01', '2095-05-02', edition, 'all');
  perform public.refresh_rankings_distance_stats();
  cached := public.rankings_page_scoped('5k', 'all', 2095, '', 1, '2095-05-01', '2095-05-02', edition, 'all');
  if exists (select from private.rankings_time_counts_dirty) or cached is distinct from live
    or cached->'analytics'->>'medianMs' is null
    or (cached->'analytics'->>'medianMs')::numeric <> 15000 then
    raise exception 'Live and cached results diverged or lost the exact tied-field median: %', cached;
  end if;

  selected := public.rankings_page_scoped('5k', 'female', 2095, 'a%_', 1, null, null, edition, 'all');
  if selected->>'cohortTotal' is distinct from '4' or selected->>'total' is distinct from '1'
    or selected->'rows'->0->>'place' is distinct from '3'
    or selected->'rows'->0->>'athlete_name' is distinct from 'Runner A%_' then
    raise exception 'Literal search, name/bib deduplication, or full-field rank failed: %', selected;
  end if;

  update public.sources set display_allowed = false where id = other_source;
  selected := public.rankings_page_scoped('5k', 'female', 2095, 'a%_', 1, null, null, edition, 'all');
  if selected->>'cohortTotal' is distinct from '3' or selected->'rows'->0->>'place' is distinct from '2' then
    raise exception 'Cached counts leaked a hidden source: %', selected;
  end if;
  selected := public.rankings_athlete_page(athlete, 1);
  if selected->'rows'->0->>'field_total' is distinct from '3'
    or selected->'rows'->0->>'field_place' is distinct from '2' then
    raise exception 'Athlete history did not use the visible field: %', selected;
  end if;

  perform private.refresh_rankings_time_counts();
  update public.performances set unpublished = true
    where event_edition_id = edition and athlete_name = 'Runner A%_';
  if public.rankings_athlete_page(athlete, 1) is not null
    or public.rankings_page_scoped('5k', 'all', 2095, '3', 1, null, null, edition, 'all')->>'cohortTotal' <> '2' then
    raise exception 'Performance update left stale cached results';
  end if;

  if has_table_privilege('anon', 'private.rankings_time_counts', 'select')
    or has_function_privilege('anon', 'private.refresh_rankings_time_counts()', 'execute') then
    raise exception 'Private ranking cache exposed to public readers';
  end if;
end;
$$;
rollback;
