-- Staged acquisition imports stay hidden until publish_event_edition.
begin;

do $$
declare
  v_src bigint;
  v_evt bigint;
  v_ed bigint;
  v_run bigint;
  v_rec bigint;
  v_perf bigint;
begin
  insert into public.sources (slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values ('acq_stage', 'Acquisition staging', 'Test', 'Test', true, now())
  returning id into v_src;

  insert into public.ingestion_runs (source_id, status)
  values (v_src, 'succeeded')
  returning id into v_run;

  insert into public.events (source_id, external_event_id, name)
  values (v_src, 'M2097', 'Staging marathon')
  returning id into v_evt;

  insert into public.event_editions (event_id, edition_year, name, publication_state, published_at)
  values (v_evt, 2097, 'Staging marathon 2097', 'staged', null)
  returning id into v_ed;

  perform private.upsert_source_record(v_src, v_ed, 'M2097:1', 'runner staged', '1', 'marathon:female', v_run, null);
  select sr.id into v_rec
  from public.source_records sr
  where sr.event_edition_id = v_ed and sr.external_result_id = 'M2097:1';
  perform private.upsert_performance(v_rec, 'Runner Staged', 'female', 'marathon', null, 12600000, null, 'finished', '2097-11-02'::date, 'https://example.test');

  select p.id into v_perf
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  where sr.event_edition_id = v_ed
  limit 1;

  if public.rankings_result(v_perf) is not null then
    raise exception 'staged edition exposed in rankings_result';
  end if;
  if jsonb_array_length((public.rankings_page_scoped('marathon', 'female', 2097))->'rows') <> 0 then
    raise exception 'staged edition exposed in rankings_page_scoped';
  end if;

  perform public.publish_event_edition(v_ed);

  if public.rankings_result(v_perf) is null then
    raise exception 'published staged edition hidden from rankings_result';
  end if;
end $$;

rollback;
