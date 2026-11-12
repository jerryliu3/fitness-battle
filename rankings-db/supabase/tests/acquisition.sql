begin;

do $$
declare
  v_candidate bigint;
  v_decision bigint;
  v_mapping bigint;
  v_run bigint;
begin
  insert into public.acquisition_candidates (
    event_name, edition_year, results_urls, dedupe_key
  ) values (
    'Acquisition SQL test',
    2097,
    array['https://example.test/results'],
    'acq sql test|2097|https://example.test/results'
  ) returning id into v_candidate;

  insert into public.acquisition_source_decisions (
    candidate_id, source_slug, decision, storage_allowed, attribution, reuse_notes, reviewed_at
  ) values (
    v_candidate, 'acq_test_source', 'permitted', true, 'Test', 'Fixture', now()
  ) returning id into v_decision;

  insert into public.acquisition_edition_mappings (
    candidate_id, source_decision_id, adapter, population_key, distance_slug, edition_year,
    event_name, source_url, approved_at, approved_by
  ) values (
    v_candidate, v_decision, 'csv', 'acq:2097:test', '10k', 2097,
    'Acquisition SQL test 2097', 'https://example.test/results', now(), 'test'
  ) returning id into v_mapping;

  v_run := public.acquisition_claim_run(v_mapping, 'test-owner-a', 120);
  begin
    perform public.acquisition_claim_run(v_mapping, 'test-owner-b', 120);
    raise exception 'second claim should fail while lease active';
  exception
    when others then
      if position('active lease' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  perform public.acquisition_patch_run(
    v_run,
    'test-owner-a',
    jsonb_build_object('publication_outcome', 'prepared')
  );
end $$;

rollback;
