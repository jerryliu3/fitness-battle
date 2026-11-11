begin;
do $$
declare
  src bigint;
  evt bigint;
  ed bigint;
  run bigint;
  rec bigint;
  result_id bigint;
  payload jsonb;
begin
  insert into public.sources(slug, name, attribution, reuse_notes, display_allowed, audited_at)
  values('pub_test', 'Publication test', 'Test', 'Test', true, now())
  returning id into src;

  insert into public.ingestion_runs(source_id, status)
  values(src, 'succeeded')
  returning id into run;

  insert into public.events(source_id, external_event_id, name)
  values(src, 'pub_event', 'Publication test event')
  returning id into evt;

  -- 1. Edition starts in draft by default
  insert into public.event_editions(event_id, edition_year, name, publication_state)
  values(evt, 2095, 'Draft edition', 'draft')
  returning id into ed;

  insert into public.source_records(source_id, event_edition_id, external_result_id, normalized_name, category_key, last_ingestion_run_id)
  values(src, ed, 'pub_1', 'runner one', '10k:female', run)
  returning id into rec;

  insert into public.performances(source_record_id, event_edition_id, athlete_name, sex, distance_slug, rank_time_ms, rank_clock, finish_status)
  values(rec, ed, 'Runner One', 'female', '10k', 2400000, 'chip', 'finished')
  returning id into result_id;

  -- In draft: hidden from public reads
  if public.rankings_result(result_id) is not null then
    raise exception 'draft edition exposed in rankings_result';
  end if;
  if jsonb_array_length((public.rankings_page_scoped('10k', 'female', 2095))->'rows') <> 0 then
    raise exception 'draft edition exposed in rankings_page_scoped';
  end if;
  if jsonb_array_length(public.rankings_saved(array[result_id])) <> 0 then
    raise exception 'draft edition exposed in rankings_saved';
  end if;

  -- 2. Transition to staged: still hidden from public reads
  update public.event_editions set publication_state = 'staged' where id = ed;
  if public.rankings_result(result_id) is not null then
    raise exception 'staged edition exposed in rankings_result';
  end if;
  if jsonb_array_length((public.rankings_page_scoped('10k', 'female', 2095))->'rows') <> 0 then
    raise exception 'staged edition exposed in rankings_page_scoped';
  end if;

  -- 3. Publish edition: becomes publicly visible
  perform public.publish_event_edition(ed);
  if (select publication_state from public.event_editions where id = ed) <> 'published' then
    raise exception 'publish_event_edition failed to set published state';
  end if;
  if public.rankings_result(result_id) is null then
    raise exception 'published edition hidden from rankings_result';
  end if;
  if jsonb_array_length((public.rankings_page_scoped('10k', 'female', 2095))->'rows') <> 1 then
    raise exception 'published edition missing from rankings_page_scoped';
  end if;

  -- 4. Freeze edition: remains visible, but cannot be mutated or republished
  perform public.freeze_event_edition(ed);
  if (select publication_state from public.event_editions where id = ed) <> 'frozen' then
    raise exception 'freeze_event_edition failed to set frozen state';
  end if;
  if public.rankings_result(result_id) is null then
    raise exception 'frozen edition hidden from rankings_result';
  end if;

  -- publish_event_edition rejects frozen editions
  begin
    perform public.publish_event_edition(ed);
    raise exception 'publish_event_edition unexpectedly allowed publishing a frozen edition';
  exception when others then
    if sqlerrm not like '%frozen and cannot be published%' then raise; end if;
  end;

  -- Direct update to unfreeze is rejected by database trigger
  begin
    update public.event_editions set publication_state = 'published' where id = ed;
    raise exception 'direct update unexpectedly allowed unfreezing a frozen edition';
  exception when others then
    if sqlerrm not like '%is frozen and cannot transition%' then raise; end if;
  end;
end;
$$;
rollback;
