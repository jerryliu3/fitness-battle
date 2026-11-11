-- Isolated rankings database only. Invoke with ON_ERROR_STOP. Always rolls back.
begin;
do $$
declare
  src bigint;
  evt bigint;
  ed bigint;
  rec1 bigint; rec2 bigint; rec3 bigint;
  p1 bigint; p2 bigint; p3 bigint;
  page jsonb;
  res1 jsonb; res2 jsonb; res3 jsonb;
begin
  insert into public.sources(slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values('percentile_test', 'Percentile Test Source', 'Test', 'Test', true, now())
  returning id into src;

  insert into public.events(source_id, external_event_id, name)
  values(src, 'percentile_event', 'Percentile Test Event')
  returning id into evt;

  insert into public.event_editions(event_id, edition_year, name, publication_state)
  values(evt, 2026, 'Percentile Test Edition', 'published')
  returning id into ed;

  -- Insert 3 runners with times [10000, 10000, 20000] (tied leaders)
  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key)
  values (src, ed, 'p1', 'leader one', '10k:female') returning id into rec1;
  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values (rec1, ed, 'Leader One', 'female', '10k', 10000, 'chip', 'finished') returning id into p1;

  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key)
  values (src, ed, 'p2', 'leader two', '10k:female') returning id into rec2;
  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values (rec2, ed, 'Leader Two', 'female', '10k', 10000, 'chip', 'finished') returning id into p2;

  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key)
  values (src, ed, 'p3', 'trailing runner', '10k:female') returning id into rec3;
  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values (rec3, ed, 'Trailing Runner', 'female', '10k', 20000, 'chip', 'finished') returning id into p3;

  -- 1. Test explorer rankings_page_scoped calculates strict slower percentile
  page := public.rankings_page_scoped('10k', 'female', 2026);
  if jsonb_array_length(page->'rows') <> 3 then
    raise exception 'Expected 3 rows in rankings_page_scoped, got %', page;
  end if;

  -- For times [10, 10, 20], exactly 1 runner is slower than the leaders (1/3 = 33.3%).
  -- The leaders must receive 33.3%, NOT 66.7%!
  if (page->'rows'->0->>'percentile')::numeric <> 33.3 or (page->'rows'->1->>'percentile')::numeric <> 33.3 then
    raise exception 'Tied finish explorer percentile failed: expected 33.3, got % and %',
      page->'rows'->0->>'percentile', page->'rows'->1->>'percentile';
  end if;

  -- Trailing runner has 0 slower runners (0.0%)
  if (page->'rows'->2->>'percentile')::numeric <> 0.0 then
    raise exception 'Trailing runner percentile failed: expected 0.0, got %', page->'rows'->2->>'percentile';
  end if;

  -- 2. Test individual report rankings_result gives identical percentile to explorer
  res1 := public.rankings_result(p1);
  if (res1->>'percentile')::numeric <> 33.3 or (res1->>'slower')::integer <> 1 then
    raise exception 'rankings_result for leader one gave % (slower %), expected 33.3 (slower 1)',
      res1->>'percentile', res1->>'slower';
  end if;

  res2 := public.rankings_result(p2);
  if (res2->>'percentile')::numeric <> 33.3 or (res2->>'slower')::integer <> 1 then
    raise exception 'rankings_result for leader two gave % (slower %), expected 33.3 (slower 1)',
      res2->>'percentile', res2->>'slower';
  end if;

  -- 3. In this 3-runner field, nobody meets the 99th, 95th, 90th, 75th, or 50th percentile criteria
  -- Benchmarks must return null ("—") for qualifying cutoffs that nobody meets
  if page->'analytics'->'benchmarks'->>'top1Ms' is not null then
    raise exception 'top1Ms cutoff unexpectedly populated for 3-runner field: %', page->'analytics'->'benchmarks';
  end if;
  if page->'analytics'->'benchmarks'->>'top25Ms' is not null then
    raise exception 'top25Ms cutoff unexpectedly populated for 3-runner field: %', page->'analytics'->'benchmarks';
  end if;

  -- 4. Filtering by top1, top5, top10, top25, top50 yields 0 rows
  page := public.rankings_page_scoped('10k', 'female', 2026, '', 1, null, null, null, 'top1');
  if (page->>'total')::integer <> 0 or jsonb_array_length(page->'rows') <> 0 then
    raise exception 'top1 filter admitted runners who did not qualify: %', page;
  end if;

  -- 5. Test compatibility 8-argument wrapper delegates cleanly without ambiguity
  page := public.rankings_page_scoped('10k', 'female', 2026, '', 1, null, null, null);
  if (page->>'total')::integer <> 3 then
    raise exception '8-argument wrapper failed: %', page;
  end if;
end;
$$;
rollback;