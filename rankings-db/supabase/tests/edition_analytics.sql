-- Isolated rankings database only; invoke with ON_ERROR_STOP. No persisted rows.
begin;
do $$
declare src bigint; evt bigint; other_evt bigint; ed bigint; other_ed bigint; rec bigint; payload jsonb; baseline jsonb; n integer;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('edition_analytics_test','Edition test','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Edition test') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name) values(evt,2096,'First race') returning id into ed;
  insert into public.events(source_id,name) values(src,'Second event') returning id into other_evt;
  insert into public.event_editions(event_id,edition_year,name) values(other_evt,2096,'Second race') returning id into other_ed;
  for n in 1..206 loop
    insert into public.source_records(source_id,event_edition_id,normalized_name,normalized_bib,category_key)
    values(src,case when n=206 then other_ed else ed end,'runner '||n,n::text,'marathon:unknown') returning id into rec;
    insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status,result_date)
    values(rec,case when n=206 then other_ed else ed end,'Runner '||n,'unknown','marathon',
      1000000+(n/2)*1000,1000000+(n/2)*1000,'chip','finished','2096-05-01');
  end loop;
  update public.performances set rank_clock='gun',gun_time_ms=rank_time_ms
  where event_edition_id=ed and athlete_name='Runner 205';
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,ed);
  baseline:=payload->'analytics';
  if (baseline->>'total')::integer<>205 or (baseline->>'fastestMs')::bigint<>1000000
    or (baseline->>'medianMs')::numeric<>1051000 or (baseline->>'slowestMs')::bigint<>1102000
    or (baseline->>'chipCount')::integer<>204 or (baseline->>'officialCount')::integer<>1
    then raise exception 'edition benchmarks or clock counts incorrect: %',baseline; end if;
  if (select sum((b->>'count')::integer) from jsonb_array_elements(baseline->'bins') b)<>205
    or jsonb_array_length(baseline->'bins')>41 then raise exception 'distribution count/size incorrect'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'205',1,null,null,ed);
  if (payload->>'total')::integer<>1 or payload->'analytics'<>baseline then raise exception 'search changed analytics'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',5,null,null,ed);
  if jsonb_array_length(payload->'rows')<>5 or payload->'analytics'<>baseline then raise exception 'paging changed analytics'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'absent',1,null,null,ed);
  if (payload->>'total')::integer<>0 or payload->'analytics'<>baseline then raise exception 'empty search lost cohort'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,'2096-05-02',null,ed);
  if payload->'analytics'<>'null'::jsonb then raise exception 'empty date scope exposed analytics'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,null);
  if (payload->'analytics'->>'total')::integer is distinct from 206 or (payload->'analytics'->>'editionCount')::integer is distinct from 2 then raise exception 'All-distance analytics lost editions'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,other_ed);
  if (payload->'analytics'->>'total')::integer<>1 or jsonb_array_length(payload->'analytics'->'bins')<>1
    then raise exception 'single-finisher field incorrect'; end if;
  update public.performances set rank_time_ms=1000000,chip_time_ms=1000000,gun_time_ms=1000000 where event_edition_id=ed;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,ed);
  if jsonb_array_length(payload->'analytics'->'bins')<>1 or (payload->'analytics'->>'medianMs')::numeric<>1000000
    then raise exception 'identical finish times broke histogram'; end if;
  update public.sources set display_allowed=false where id=src;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,ed);
  if payload->'analytics'<>'null'::jsonb then raise exception 'suppressed source leaked analytics'; end if;
end;
$$;
rollback;
