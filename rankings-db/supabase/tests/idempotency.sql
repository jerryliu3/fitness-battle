-- Re-import and correction checks. Rolls back. Run with ON_ERROR_STOP.
begin;

insert into public.sources (slug, name, access_method, reuse_notes, attribution, display_allowed, audited_at)
values (
  'sample_timing',
  'Sample timing export',
  'csv',
  'Local fixture. Storage and display allowed for tests.',
  'Sample Timing',
  true,
  now()
);

insert into public.source_snapshots (source_id, storage_path, content_sha256, byte_size)
values (
  1,
  'snapshots/sample.csv',
  repeat('ab', 32),
  120
);

insert into public.ingestion_runs (source_id, snapshot_id, status)
values (1, 1, 'running');

insert into public.events (source_id, external_event_id, name)
values (1, 'city-marathon', 'City Marathon');

insert into public.event_editions (event_id, edition_year, name, starts_on)
values (1, 2026, 'City Marathon 2026', '2026-04-20');

do $$
declare
  v_action text;
  v_count integer;
  v_fingerprint text;
  v_record_id bigint;
  v_rank bigint;
begin
  v_fingerprint := private.result_fingerprint(4, 18, 'ada lovelace', '1042', 'marathon:female');
  if v_fingerprint <> '5b57eb5a2924fe6f7c5465f373e434d9e925187c245258717a39e8caf1401cd5' then
    raise exception 'fingerprint drifted from the TypeScript fixture: %', v_fingerprint;
  end if;

  v_action := private.upsert_source_record(1, 1, 'res-1', 'ada lovelace', '1042', 'marathon:female', 1, 1);
  if v_action <> 'inserted' then
    raise exception 'expected insert, got %', v_action;
  end if;

  v_action := private.upsert_source_record(1, 1, 'res-1', 'ada lovelace', '1042', 'marathon:female', 1, 1);
  if v_action <> 'updated' then
    raise exception 'expected update on replay, got %', v_action;
  end if;

  select count(*) into v_count from public.source_records;
  if v_count <> 1 then
    raise exception 'replay created % source records', v_count;
  end if;

  select id into v_record_id from public.source_records where external_result_id = 'res-1';
  perform private.upsert_performance(v_record_id, 'Ada Lovelace', 'female', 'marathon', 34, 7800000, 7810000, 'finished', '2026-04-20', 'https://example.test/result');
  perform private.upsert_performance(v_record_id, 'Ada Lovelace', 'female', 'marathon', 34, 7790000, 7810000, 'finished', '2026-04-20', 'https://example.test/result');

  select count(*) into v_count from public.source_records;
  if v_count <> 1 then
    raise exception 'time correction duplicated the source record (% rows)', v_count;
  end if;
  select count(*) into v_count from public.performances;
  if v_count <> 1 then
    raise exception 'time correction duplicated the performance (% rows)', v_count;
  end if;
  select rank_time_ms, result_fingerprint into v_rank, v_fingerprint
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  where p.source_record_id = v_record_id;
  if v_rank <> 7790000 then
    raise exception 'corrected chip time was not stored, rank_time_ms=%', v_rank;
  end if;

  set local role anon;
  select count(*) into v_count from public.leaderboard_entries;
  if v_count <> 1 then
    raise exception 'public leaderboard row count was %', v_count;
  end if;
  begin
    perform 1 from public.performances;
    raise exception 'anon could read performances directly';
  exception
    when insufficient_privilege then
      null;
  end;
  reset role;

  v_action := private.upsert_source_record(1, 1, null, 'ada lovelace', '200', 'marathon:female', 1, 1);
  v_action := private.upsert_source_record(1, 1, null, 'ada lovelace', '201', 'marathon:female', 1, 1);
  select count(*) into v_count from public.source_records where external_result_id is null;
  if v_count <> 2 then
    raise exception 'same name with different bibs collapsed to % rows', v_count;
  end if;

  v_action := private.upsert_source_record(1, 1, null, 'grace hopper', null, '10k:female', 1, 1);
  if v_action <> 'inserted' then
    raise exception 'missing bib insert got %', v_action;
  end if;
  v_action := private.upsert_source_record(1, 1, null, 'grace hopper', null, '10k:female', 1, 1);
  if v_action <> 'updated' then
    raise exception 'missing bib replay got %', v_action;
  end if;

  begin
    perform private.upsert_performance(
      (select id from public.source_records where normalized_name = 'grace hopper'),
      'Young Runner', 'female', '10k', 17, 2400000, null, 'finished', '2026-04-20', ''
    );
    raise exception 'youth row was stored';
  exception
    when others then
      if sqlerrm <> 'youth results are not stored' then
        raise;
      end if;
  end;
end $$;

rollback;
