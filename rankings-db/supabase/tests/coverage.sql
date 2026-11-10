begin;
do $$
declare src bigint; evt bigint; ed bigint; run bigint; rec bigint; result_id bigint; payload jsonb;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('coverage_test','Coverage test','Test','Test',true,now()) returning id into src;
  insert into public.ingestion_runs(source_id,status) values(src,'succeeded') returning id into run;
  insert into public.events(source_id,name) values(src,'Coverage test') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name) values(evt,2098,'Coverage test') returning id into ed;
  insert into public.source_records(source_id,event_edition_id,normalized_name,category_key,last_ingestion_run_id)
  values(src,ed,'runner','10k:unknown',run) returning id into rec;
  insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status)
  values(rec,ed,'Runner','unknown','10k',3000000,3000000,'chip','finished') returning id into result_id;
  payload:=public.rankings_result_with_coverage(result_id);
  if (payload->'coverage'->>'complete')::boolean is distinct from false then raise exception 'unreviewed field certified'; end if;
  insert into public.rankings_coverage_reviews(event_edition_id,distance_slug,sex,expected_eligible_count,ingestion_run_id,evidence_url,review_notes)
  values(ed,'10k','unknown',1,run,'https://example.test/results','One eligible adult finisher');
  payload:=public.rankings_result_with_coverage(result_id);
  if (payload->'coverage'->>'complete')::boolean is distinct from true then raise exception 'matching review not recognized'; end if;
  update public.performances set updated_at=clock_timestamp()+interval '1 second' where id=result_id;
  payload:=public.rankings_result_with_coverage(result_id);
  if (payload->'coverage'->>'complete')::boolean is distinct from false then raise exception 'correction retained stale certification'; end if;
  update public.sources set display_allowed=false where id=src;
  if public.rankings_result_with_coverage(result_id) is not null then raise exception 'suppressed report exposed'; end if;
  if jsonb_array_length(public.rankings_coverage('10k',ed,'unknown')) <> 0 then raise exception 'suppressed coverage exposed'; end if;
end;
$$;
rollback;
