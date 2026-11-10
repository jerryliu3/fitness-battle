-- Isolated rankings database only; invoke with ON_ERROR_STOP. No persisted rows.
begin;
do $$
declare src bigint; evt bigint; other_evt bigint; ed bigint; other_ed bigint; rec bigint; payload jsonb; athlete bigint; n integer;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('athlete_history_test','Edition test','Test','Test',true,now()) returning id into src;
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
  insert into public.rankings_athletes(display_name) values('Reviewed athlete') returning id into athlete;
  insert into public.rankings_athlete_results(performance_id,athlete_id,evidence_url,evidence_notes,performance_updated_at)
  select id,athlete,'https://example.test/identity','Explicit test linkage',updated_at from public.performances where event_edition_id=ed;
  payload:=public.rankings_athlete_page(athlete,5);
  if (payload->>'total')::integer is distinct from 205 or jsonb_array_length(payload->'rows') is distinct from 5
    or (payload->'bests'->0->>'time_ms')::integer is distinct from 1000000 then raise exception 'Career paging/best failed'; end if;
  payload:=public.rankings_result_with_identity((select id from public.performances where event_edition_id=ed order by id limit 1));
  if (payload->>'athleteId')::bigint is distinct from athlete then raise exception 'Reviewed identity missing'; end if;
  update public.performances set updated_at=updated_at+interval '1 second' where event_edition_id=ed;
  if public.rankings_athlete_page(athlete,1) is not null then raise exception 'Stale identity remained public'; end if;
  update public.rankings_athlete_results l set performance_updated_at=p.updated_at from public.performances p where p.id=l.performance_id;
  update public.sources set display_allowed=false where id=src;
  if public.rankings_athlete_page(athlete,1) is not null then raise exception 'Suppression leaked profile'; end if;
  if has_table_privilege('anon','public.rankings_athlete_results','select') then raise exception 'Identity evidence publicly accessible'; end if;
end;
$$;
rollback;
