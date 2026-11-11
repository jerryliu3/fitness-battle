-- Isolated rankings database only. Invoke with ON_ERROR_STOP. Always rolls back.
begin;
do $$
declare
  src bigint; evt bigint; ed bigint; rec_m bigint; rec_f bigint; perf_m bigint; perf_f bigint;
  cps bigint; rev_m timestamptz; rev_f timestamptz; payload jsonb; result_report jsonb;
begin
  -- 1. Setup isolated Chicago 2025 event edition
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('chicago_replay_test','Chicago Source','Official results','Public use',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Bank of America Chicago Marathon') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(evt,2025,'Bank of America Chicago Marathon 2025','published') returning id into ed;

  insert into public.source_records(source_id,event_edition_id,normalized_name,category_key)
  values(src,ed,'jacob kiplimo','marathon:male') returning id into rec_m;
  insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status)
  values(rec_m,ed,'Jacob Kiplimo','male','marathon',7343000,7343000,'chip','finished') returning id,updated_at into perf_m,rev_m;

  insert into public.source_records(source_id,event_edition_id,normalized_name,category_key)
  values(src,ed,'hawi feysa gejia','marathon:female') returning id into rec_f;
  insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status)
  values(rec_f,ed,'Hawi Feysa Gejia','female','marathon',8097000,8097000,'chip','finished') returning id,updated_at into perf_f,rev_f;

  -- 2. Add checkpoint set for marathon
  insert into public.race_checkpoint_sets(event_edition_id,distance_slug,distances_m)
  values(ed,'marathon',array[5000,10000,15000,20000,21097.5,25000,30000,35000,40000,42195]::numeric[]) returning id into cps;

  -- 3. Add replay course
  insert into public.rankings_replay_courses(event_edition_id,distance_slug,points,source_url,attribution,review_notes,reviewed_at,display_allowed)
  values(ed,'marathon',
    '[[-87.620677,41.880905,0],[-87.632515,41.890135,4997.33],[-87.639207,41.932976,10162.18],[-87.644702,41.931996,15148.63],[-87.634011,41.890802,20166.89],[-87.637007,41.882819,21213.98],[-87.67654,41.877458,24966.25],[-87.661478,41.86335,30117.28],[-87.626856,41.845589,35545.69],[-87.623775,41.852992,40044.85],[-87.620507,41.869889,42195]]'::jsonb,
    'https://www.chicago-marathon.com/','Garmin Connect','Verified course track',now(),true);

  -- 4. Add split times
  insert into public.performance_split_times(performance_id,checkpoint_set_id,clock,elapsed_ms,source_url,start_at,performance_updated_at)
  values
    (perf_m,cps,'chip',array[838000,1705000,2561000,3426000,3616000,4272000,5131000,5993000,6910000,7343000],'https://example.test/kiplimo','2025-10-12T12:30:00Z',rev_m),
    (perf_f,cps,'chip',array[966000,1928000,2880000,3839000,4050000,4799000,5754000,6718000,7679000,8097000],'https://example.test/gejia','2025-10-12T12:30:00Z',rev_f);

  -- 5. Test rankings_result_with_coverage has split report
  result_report:=public.rankings_result_with_coverage(perf_m);
  if result_report->'splits' is null
    or (result_report->'splits'->>'finishMs')::integer<>7343000
    or jsonb_array_length(result_report->'splits'->'checkpoints')<>10 then
    raise exception 'Individual result split report failed: %', result_report->'splits';
  end if;

  -- 6. Test rankings_replay_page across all categories
  payload:=public.rankings_replay_page(ed,'marathon','all','chip');
  if payload is null
    or (payload->>'totalAvailable')::integer<>2
    or jsonb_array_length(payload->'runners')<>2
    or payload->'course'->'points' is null
    or jsonb_array_length(payload->'course'->'points')<>11 then
    raise exception 'Replay all-categories payload failed: %', payload;
  end if;

  -- 7. Test category filter: male only
  payload:=public.rankings_replay_page(ed,'marathon','male','chip');
  if (payload->>'totalAvailable')::integer<>1
    or jsonb_array_length(payload->'runners')<>1
    or (payload->'runners'->0->>'id')::bigint<>perf_m then
    raise exception 'Replay male category filter failed: %', payload;
  end if;

  -- 8. Test specific runner id selection
  payload:=public.rankings_replay_page(ed,'marathon','all','chip',array[perf_f]);
  if (payload->>'totalAvailable')::integer<>2
    or jsonb_array_length(payload->'runners')<>1
    or (payload->'runners'->0->>'id')::bigint<>perf_f then
    raise exception 'Replay specific id filter failed: %', payload;
  end if;
end;
$$;
rollback;
