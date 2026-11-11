-- Run on an isolated rankings database with ON_ERROR_STOP; always rolls back.
begin;
do $$
declare
  src bigint; evt bigint; ed bigint; rec bigint; payload jsonb;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values ('pagination_test','Pagination test','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Pagination test') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(evt,2099,'Pagination test','published') returning id into ed;
  for n in 1..205 loop
    insert into public.source_records(source_id,event_edition_id,normalized_name,normalized_bib,category_key)
    values(src,ed,'runner '||n,n::text,'marathon:unknown') returning id into rec;
    insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status)
    values(rec,ed,'Runner '||n,'unknown','marathon',1000000 + (n/2)*1000,1000000 + (n/2)*1000,'chip','finished');
  end loop;
  payload := public.rankings_page('marathon','unknown',2099,'',5);
  if (payload->>'total')::integer <> 205 or jsonb_array_length(payload->'rows') <> 5 then
    raise exception 'full field not reachable: %',payload;
  end if;
  payload := public.rankings_page('marathon','unknown',2099,'205',1);
  if (payload->>'total')::integer <> 1 or (payload->'rows'->0->>'place')::integer <> 204 then
    raise exception 'search changed cohort rank: %',payload;
  end if;
  payload := public.rankings_result((select id from public.performances where source_record_id=rec));
  if (payload->>'total')::integer <> 205 or (payload->>'place')::integer <> 204
    or (select sum((b->>'count')::integer) from jsonb_array_elements(payload->'bins') b) <> 205 then
    raise exception 'report cohort or distribution drifted: %',payload;
  end if;
  if jsonb_array_length(public.rankings_saved(array[(select id from public.performances where source_record_id=rec)])) <> 1 then
    raise exception 'saved result missing';
  end if;
  update public.sources set display_allowed=false where id=src;
  if jsonb_array_length(public.rankings_saved(array[(select id from public.performances where source_record_id=rec)])) <> 0 then
    raise exception 'saved result bypassed suppression';
  end if;
  if public.rankings_result((select id from public.performances where source_record_id=rec)) is not null then
    raise exception 'suppressed report exposed';
  end if;
  payload := public.rankings_page('marathon','unknown',2099,'',1);
  if (payload->>'total')::integer <> 0 then raise exception 'suppressed source leaked'; end if;
end;
$$;
rollback;

-- Report suppression uses the same source gate as the field.
begin;
do $$
begin
  if public.rankings_result(-1) is not null then raise exception 'unknown result exposed'; end if;
end;
$$;
rollback;
