-- Isolated rankings database only. Invoke with ON_ERROR_STOP. Always rolls back.
begin;
do $$
declare src bigint; evt bigint; ed bigint; rec bigint; perf bigint; cps bigint; wrong_cps bigint; revision timestamptz; payload jsonb;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('replay_contract_test','Splits','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Splits') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name) values(evt,2094,'Splits') returning id into ed;
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
  insert into public.rankings_replay_courses(event_edition_id,distance_slug,points,source_url,attribution,review_notes,reviewed_at,display_allowed)
  values(ed,'10k','[[0,0,0],[0.05,0,5000],[0.1,0,10000]]','https://example.test/course','Course','Reviewed alignment',now(),true);
  payload:=public.rankings_replay_page(ed,'10k','unknown','chip',array[perf],0);
  if (payload->>'totalAvailable')::integer is distinct from 1 or jsonb_array_length(payload->'runners') is distinct from 1
    or payload->'course'->'points' is null or payload->'next' is distinct from 'null'::jsonb then raise exception 'Replay scope failed'; end if;
  payload:=public.rankings_replay_page(ed,'10k','unknown','chip',null,perf);
  if jsonb_array_length(payload->'runners') is distinct from 0 or payload->'course' is distinct from 'null'::jsonb then raise exception 'Replay cursor failed'; end if;
  payload:=public.rankings_replay_page(ed,'10k','female','chip',null,0);
  if payload is not null then raise exception 'Replay ignored category'; end if;
  update public.rankings_replay_courses set display_allowed=false;
  if public.rankings_replay_page(ed,'10k','unknown','chip',null,0) is not null then raise exception 'Unapproved course exposed'; end if;
  update public.rankings_replay_courses set display_allowed=true;
  update public.sources set display_allowed=false where id=src;
  if public.rankings_replay_page(ed,'10k','unknown','chip',null,0) is not null then raise exception 'Suppressed replay leaked'; end if;
  if has_table_privilege('anon','public.rankings_replay_courses','select') then raise exception 'Raw course table exposed'; end if;
end;
$$;
rollback;
