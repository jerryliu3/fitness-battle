-- RunSignup external IDs must stay namespaced by result set so unprefixed legacy
-- rows do not collide with {setId}:{result_id} imports.
begin;

do $$
declare
  v_src bigint;
  v_evt bigint;
  v_ed bigint;
  v_run bigint;
  v_rec_a bigint;
  v_rec_b bigint;
  v_action text;
begin
  insert into public.sources (slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values ('rsu_ns', 'RunSignup namespace test', 'Test', 'Test', true, now())
  returning id into v_src;

  insert into public.ingestion_runs (source_id, status)
  values (v_src, 'succeeded')
  returning id into v_run;

  insert into public.events (source_id, external_event_id, name)
  values (v_src, 'race-99', 'Namespace race')
  returning id into v_evt;

  insert into public.event_editions (event_id, edition_year, name, publication_state)
  values (v_evt, 2096, 'Namespace edition', 'published')
  returning id into v_ed;

  v_action := private.upsert_source_record(v_src, v_ed, '42', 'legacy runner', '100', 'marathon:female', v_run, null);
  if v_action <> 'inserted' then
    raise exception 'expected legacy insert, got %', v_action;
  end if;

  v_action := private.upsert_source_record(v_src, v_ed, '7:42', 'namespaced runner', '101', 'marathon:female', v_run, null);
  if v_action <> 'inserted' then
    raise exception 'expected namespaced insert, got %', v_action;
  end if;

  select count(*) into v_rec_a
  from public.source_records
  where event_edition_id = v_ed and external_result_id in ('42', '7:42');

  if v_rec_a <> 2 then
    raise exception 'expected two distinct external IDs, found %', v_rec_a;
  end if;

  v_action := private.upsert_source_record(v_src, v_ed, '42', 'legacy runner updated', '100', 'marathon:female', v_run, null);
  if v_action <> 'updated' then
    raise exception 'expected legacy update on same unprefixed id, got %', v_action;
  end if;

  select id into v_rec_b from public.source_records where event_edition_id = v_ed and external_result_id = '7:42';
  if v_rec_a is null or v_rec_b is null then
    raise exception 'missing expected records after upsert';
  end if;
end $$;

rollback;
