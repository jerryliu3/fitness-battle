-- Isolated rankings database only. Invoke with ON_ERROR_STOP. Always rolls back.
begin;
do $$
declare src bigint; evt bigint; ed bigint; rec bigint; perf bigint; cps bigint; wrong_cps bigint; revision timestamptz; payload jsonb;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('split_report_test','Splits','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Splits') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(evt,2094,'Splits','published') returning id into ed;
  insert into public.source_records(source_id,event_edition_id,normalized_name,category_key)
  values(src,ed,'runner','10k:unknown') returning id into rec;
  insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status)
  values(rec,ed,'Runner','unknown','10k',3000000,3000000,'chip','finished') returning id,updated_at into perf,revision;
  payload:=public.rankings_result_with_coverage(perf);
  if payload->'splits' is distinct from 'null'::jsonb then raise exception 'Missing timings should be null'; end if;
  insert into public.race_checkpoint_sets(event_edition_id,distance_slug,distances_m)
  values(ed,'10k',array[2000,4000,5000,8000]::numeric[]) returning id into cps;
  insert into public.performance_split_times(performance_id,checkpoint_set_id,clock,elapsed_ms,source_url,performance_updated_at)
  values(perf,cps,'chip',array[600000,null,1400000,2400000],'https://example.test/results',revision);
  payload:=public.rankings_result_with_coverage(perf);
  if jsonb_array_length(payload->'splits'->'checkpoints') is distinct from 4
    or payload->'splits'->'checkpoints'->1->'elapsedMs' is distinct from 'null'::jsonb
    or (payload->'splits'->>'finishMs')::integer is distinct from 3000000 then raise exception 'Split report lost observations'; end if;
  if has_table_privilege('anon','public.performance_split_times','select')
    or has_table_privilege('authenticated','public.race_checkpoint_sets','select')
    or has_table_privilege('service_role','public.race_checkpoint_sets','update') then raise exception 'Split table access widened'; end if;
  begin
    update public.performance_split_times set elapsed_ms=array[600000,null,500000,2400000] where performance_id=perf;
    raise exception 'Accepted decreasing times';
  exception when raise_exception then
    if sqlerrm='Accepted decreasing times' then raise; end if;
  end;
  begin
    update public.performance_split_times set elapsed_ms=array[600000] where performance_id=perf;
    raise exception 'Accepted misaligned arrays';
  exception when raise_exception then
    if sqlerrm='Accepted misaligned arrays' then raise; end if;
  end;
  insert into public.race_checkpoint_sets(event_edition_id,distance_slug,distances_m)
  values(ed,'5k',array[2000,4000]::numeric[]) returning id into wrong_cps;
  begin
    update public.performance_split_times set checkpoint_set_id=wrong_cps,elapsed_ms=array[600000,1200000] where performance_id=perf;
    raise exception 'Accepted wrong race distance';
  exception when raise_exception then
    if sqlerrm='Accepted wrong race distance' then raise; end if;
  end;
  begin
    update public.performance_split_times set clock='gun' where performance_id=perf;
    raise exception 'Accepted absent clock';
  exception when raise_exception then
    if sqlerrm='Accepted absent clock' then raise; end if;
  end;
  begin
    insert into public.race_checkpoint_sets(event_edition_id,distance_slug,distances_m)
    values(ed,'10k',array[5000,4000]::numeric[]);
    raise exception 'Accepted unordered checkpoints';
  exception when check_violation then null;
  end;
  update public.performances set unpublished=true where id=perf;
  if public.rankings_result_with_coverage(perf) is not null then raise exception 'Unpublished timing report leaked'; end if;
  update public.performances set unpublished=false where id=perf;
  update public.performances set updated_at=updated_at+interval '1 second'  where id=perf;
  payload:=public.rankings_result_with_coverage(perf);
  if payload->'splits' is distinct from 'null'::jsonb then raise exception 'Stale splits exposed'; end if;
  update public.sources set display_allowed=false where id=src;
  if public.rankings_result_with_coverage(perf) is not null then raise exception 'Suppressed report leaked splits'; end if;
end;
$$;
rollback;
