begin;
do $$
declare
  athlete uuid := gen_random_uuid();
  ticket uuid := gen_random_uuid();
  sync_lease uuid := gen_random_uuid();
  activity_time timestamptz := now() - interval '1 day';
  selected jsonb;
begin
  insert into auth.users(id, email) values (athlete, athlete::text || '@test.invalid');
  insert into public.profiles(id, display_name) values (athlete, 'Strava review fixture') on conflict (id) do nothing;
  perform set_config('request.jwt.claim.role', 'service_role', true);

  for attempt in 1..10 loop
    if not public.acquire_fitness_sync(athlete, 'strava', false, sync_lease) then
      raise exception 'manual sync % should be allowed', attempt;
    end if;
    perform public.release_fitness_sync(athlete, 'strava', sync_lease);
  end loop;

  begin
    perform public.acquire_fitness_sync(athlete, 'strava', false, sync_lease);
    raise exception 'eleventh manual sync should be rate limited';
  exception when sqlstate 'PT429' then
    null;
  end;

  if not public.claim_fitness_history(athlete, 'strava', 90, ticket) then
    raise exception 'history claim failed';
  end if;
  update public.fitness_history_imports set review_samples = '[{"id":"first-draft"}]' where user_id = athlete;
  perform public.finish_fitness_history(athlete, ticket, false);
  if exists (select 1 from public.fitness_history_imports where user_id = athlete and (review_samples is not null or completed_at is not null or lease is not null))
    or exists (select 1 from public.activities where user_id = athlete) then
    raise exception 'cancellation retained the review or persisted activities';
  end if;

  ticket := gen_random_uuid();
  if not public.claim_fitness_history(athlete, 'strava', 90, ticket) then
    raise exception 'cancelled history should be claimable again';
  end if;
  update public.fitness_history_imports set review_samples = '[{"id":"confirmed-draft"}]' where user_id = athlete;
  selected := jsonb_build_array(jsonb_build_object(
    'external_id', 'confirmed-draft',
    'category_id', (select id from public.categories where slug = 'running'),
    'started_at', activity_time, 'metric_value', 5000, 'moving_sec', 1800,
    'raw_name', 'Confirmed run',
    'sport', 'running', 'distance_m', 5000, 'verified', true, 'journal_only', false,
    'provenance', 'recorded', 'disposition', 'counted', 'source_label', 'strava',
    'compete_key', 'strava-confirmed-draft'
  ));
  if not public.confirm_strava_history_review(athlete, ticket, selected) then
    raise exception 'confirmation rejected a valid review';
  end if;
  if (select count(*) from public.activities where user_id = athlete and external_id = 'confirmed-draft') <> 1 then
    raise exception 'confirmation did not save the selected activity';
  end if;
  if not exists (select 1 from public.fitness_history_imports where user_id = athlete and completed_at is not null and review_samples is null) then
    raise exception 'confirmation did not complete the import and clear staging';
  end if;
end $$;
rollback;
