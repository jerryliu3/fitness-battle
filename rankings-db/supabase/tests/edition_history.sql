-- Isolated rankings database only; invoke with ON_ERROR_STOP. No persisted rows.
begin;
do $$
declare src bigint; evt bigint; other_evt bigint; ed bigint; other_ed bigint; rec bigint; payload jsonb; n integer;
begin
  insert into public.sources(slug,name,attribution,reuse_notes,display_allowed,audited_at)
  values('edition_history_test','Edition test','Test','Test',true,now()) returning id into src;
  insert into public.events(source_id,name) values(src,'Edition test') returning id into evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(evt,2096,'First race','published') returning id into ed;
  insert into public.events(source_id,name) values(src,'Second event') returning id into other_evt;
  insert into public.event_editions(event_id,edition_year,name,publication_state) values(other_evt,2096,'Second race','published') returning id into other_ed;
  for n in 1..206 loop
    insert into public.source_records(source_id,event_edition_id,normalized_name,normalized_bib,category_key)
    values(src,case when n=206 then other_ed else ed end,'runner '||n,n::text,'marathon:unknown') returning id into rec;
    insert into public.performances(source_record_id,event_edition_id,athlete_name,sex,distance_slug,chip_time_ms,rank_time_ms,rank_clock,finish_status,result_date)
    values(rec,case when n=206 then other_ed else ed end,'Runner '||n,'unknown','marathon',
      1000000+(n/2)*1000,1000000+(n/2)*1000,'chip','finished','2096-05-01');
  end loop;
  payload:=public.rankings_edition_history(ed,'marathon','unknown');
  if jsonb_array_length(payload) is distinct from 1 or (payload->0->>'total')::integer is distinct from 205
    then raise exception 'History mixed distinct events or fields'; end if;
  payload:=public.rankings_edition_history(ed,'10k','unknown');
  if payload is distinct from '[]'::jsonb then raise exception 'History ignored distance'; end if;
  update public.sources set display_allowed=false where id=src;
  payload:=public.rankings_edition_history(ed,'marathon','unknown');
  if payload is distinct from '[]'::jsonb then raise exception 'History bypassed suppression'; end if;
end;
$$;
rollback;
