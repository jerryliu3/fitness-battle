-- Isolated rankings database only; invoke with ON_ERROR_STOP. No persisted rows.
begin;
do $$
declare src bigint; evt bigint; other_evt bigint; ed bigint; other_ed bigint; rec bigint; payload jsonb; n integer;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('unified_fields_test','Edition test','Test','Test',true,now()) returning id into src;
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
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',5,null,null,ed);
  if (payload->>'total')::integer<>205 or (payload->>'cohortTotal')::integer<>205
    or jsonb_array_length(payload->'rows')<>5 then raise exception 'edition field truncated or mixed: %',payload; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'205',1,null,null,ed);
  if (payload->>'total')::integer<>1 or (payload->>'cohortTotal')::integer<>205
    or (payload->'rows'->0->>'place')::integer<>204 then raise exception 'search changed edition cohort or ties'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,'2096-05-02',null,ed);
  if (payload->>'total')::integer<>0 then raise exception 'edition scope ignored dates'; end if;
  payload:=public.rankings_page_scoped('10k','unknown',2096,'',1,null,null,ed);
  if (payload->>'total')::integer<>0 then raise exception 'edition scope ignored distance'; end if;
  payload:=public.rankings_page_scoped('marathon','female',2096,'',1,null,null,ed);
  if (payload->>'total')::integer<>0 then raise exception 'edition scope ignored category'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2095,'',1,null,null,ed);
  if (payload->>'total')::integer<>0 then raise exception 'edition scope ignored year'; end if;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',99,null,null,other_ed);
  if (payload->>'total')::integer<>1 or (payload->>'page')::integer<>1
    or (payload->'rows'->0->>'place')::integer<>1 then raise exception 'edition rank/page not scoped'; end if;
  payload:=public.rankings_page_window('marathon','unknown',2096,'',1);
  if (payload->>'total')::integer<>206 then raise exception 'legacy date RPC lost editions'; end if;
  payload:=public.rankings_page('marathon','unknown',2096,'',1);
  if (payload->>'total')::integer<>206 then raise exception 'legacy page RPC lost editions'; end if;
  update public.performances set sex='female' where source_record_id=rec;
  payload:=public.rankings_page_scoped('marathon','all',2096,'',1,null,null,other_ed);
  if (payload->>'total')::integer is distinct from 1 then raise exception 'All-category field missing'; end if;
  payload:=public.rankings_edition_history(other_ed,'marathon','all');
  if jsonb_array_length(payload) is distinct from 1 then raise exception 'Combined year history missing'; end if;
  update public.performances set unpublished=true where source_record_id=rec;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,other_ed);
  if (payload->>'total')::integer<>0 then raise exception 'unpublished result leaked'; end if;
  update public.sources set display_allowed=false where id=src;
  payload:=public.rankings_page_scoped('marathon','unknown',2096,'',1,null,null,ed);
  if (payload->>'total')::integer<>0 or (payload->>'cohortTotal')::integer<>0
    or jsonb_array_length(payload->'rows')<>0 then raise exception 'suppressed source leaked'; end if;
end;
$$;
rollback;
