-- Run after the migration, inside a transaction that is rolled back.
do $$
declare
  athlete uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  sessions bigint;
  distance numeric;
begin
  insert into auth.users(id, email) values (athlete, athlete::text || '@test.invalid'), (outsider, outsider::text || '@test.invalid');
  insert into public.profiles(id, display_name) values (athlete, 'Crew SQL test'), (outsider, 'Outsider') on conflict (id) do nothing;
  insert into public.crews(id, name, invite_code, sport, created_by) values (crew, 'Rollback test', substr(crew::text,1,8), 'running', athlete);
  insert into public.crew_members(crew_id, user_id, display_name) values (crew, athlete, 'Test');
  insert into public.activities(user_id, provider, external_id, category_id, started_at, metric_value, sport, distance_m, moving_sec, provenance, disposition, compete_key)
    select athlete, 'strava', n::text, category, statement_timestamp() - interval '1 minute', 1000, 'running', 1000, 600,
      case when n = 3 then 'demo' else 'manual' end, case when n = 4 then 'excluded' else 'counted' end, 'crew-sql-' || n
    from generate_series(1,4) n;
  perform set_config('request.jwt.claim.sub', athlete::text, true);
  select t.session_count, t.distance_m into sessions, distance from public.crew_week_totals(crew) t;
  if sessions <> 2 or distance <> 2000 then raise exception 'Incorrect totals: %, %', sessions, distance; end if;
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  begin
    perform * from public.crew_week_totals(crew);
    raise exception 'Outsider was allowed';
  exception when others then
    if sqlerrm <> 'not_a_member' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform * from public.crew_week_totals(crew);
    raise exception 'Anonymous was allowed';
  exception when others then
    if sqlerrm <> 'authentication_required' then raise; end if;
  end;
end;
$$;
