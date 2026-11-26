-- Run after migrations against a disposable database.
begin;
do $$
declare
  athlete uuid := gen_random_uuid();
  start_at timestamptz := date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York';
  revision timestamptz;
  scores jsonb := '{"running":250,"cycling":0,"walking":0,"strength":0}';
  accounts jsonb := '{"running":{},"cycling":{},"walking":{},"strength":{}}';
begin
  insert into auth.users(id, email, created_at) values (athlete, athlete::text || '@test.invalid', start_at - interval '1 day');
  insert into public.profiles(id, display_name) values (athlete, 'Backfill test') on conflict (id) do nothing;
  insert into public.athlete_prefs(user_id) values (athlete) on conflict (user_id) do nothing;
  insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, lock_open, lock_verified, lock_period)
    values (athlete, 'running', 2000, 1000, 1400, 1350, start_at)
    on conflict (user_id, sport) do update set open_elo = 2000, verified_elo = 1000, lock_open = 1400, lock_verified = 1350;
  select updated_at into revision from public.athlete_prefs where user_id = athlete;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    perform public.commit_effort_backfill(athlete, start_at, revision, accounts, scores);
    raise exception 'unprivileged backfill succeeded';
  exception when others then if sqlerrm <> 'forbidden' then raise; end if; end;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  if public.commit_effort_backfill(athlete, start_at, revision - interval '1 second', accounts, scores) <> 'conflict'
    then raise exception 'stale account revision accepted'; end if;
  if public.commit_effort_backfill(athlete, start_at, revision, accounts, scores) <> 'applied'
    then raise exception 'backfill did not apply'; end if;
  if public.commit_effort_backfill(athlete, start_at, revision, accounts, scores) <> 'already_applied'
    then raise exception 'duplicate backfill was not skipped'; end if;
  if not exists (select 1 from public.sport_ratings where user_id = athlete and sport = 'running'
    and open_elo = 250 and verified_elo = 250 and lock_open = 1400 and lock_verified = 1350)
    then raise exception 'ratings or field locks are incorrect'; end if;
  if not exists (select 1 from public.effort_score_events where user_id = athlete and sport = 'running'
    and track = 'open' and score_before = 2000 and score_after = 250)
    then raise exception 'score history event missing'; end if;
end $$;
rollback;
