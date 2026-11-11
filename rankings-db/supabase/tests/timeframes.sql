begin;
do $$
declare src bigint;evt bigint;ed bigint;rec bigint;payload jsonb; n integer;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('date_window_test','Date test','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Date test') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(evt,2097,'Date test','published') returning id into ed;
  for n in 1..5 loop
    insert into public.source_records(source_id,event_edition_id,normalized_name,category_key)
    values(src,ed,'runner '||n,'5k:unknown') returning id into rec;
    insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status,result_date)
    values(rec,ed,'Runner '||n,'unknown','5k',3000000+n*1000,3000000+n*1000,'chip','finished',
      case n when 1 then date '2097-01-01' when 2 then date '2097-01-02' when 3 then date '2097-01-03' when 4 then date '2097-01-04' else null end);
  end loop;
  payload:=public.rankings_page_window('5k','unknown',2097,'',1,'2097-01-02','2097-01-04');
  if (payload->>'total')::integer<>2 then raise exception 'date bounds or null-date exclusion failed'; end if;
  payload:=public.rankings_page_window('5k','unknown',2097,'Runner 3',1,'2097-01-02','2097-01-04');
  if (payload->>'total')::integer<>1 or (payload->'rows'->0->>'place')::integer<>2 then raise exception 'search changed timeframe rank'; end if;
  payload:=public.rankings_page('5k','unknown',2097,'',1);
  if (payload->>'total')::integer<>5 then raise exception 'legacy year scope excluded undated results'; end if;
end;
$$;
rollback;
