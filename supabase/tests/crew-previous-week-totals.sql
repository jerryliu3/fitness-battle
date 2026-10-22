-- Execute in a transaction and roll back fixture users, crew and activities.
do $$
declare
  athlete uuid:=gen_random_uuid();
  peer uuid:=gen_random_uuid();
  outsider uuid:=gen_random_uuid();
  crew uuid:=gen_random_uuid();
  category uuid:=(select id from public.categories limit 1);
  current_start timestamptz;
  previous_start timestamptz;
  previous_end timestamptz;
  sessions bigint;
  distance numeric;
  total numeric;
begin
  select b.starts_at into current_start from public.period_bounds('weekly',statement_timestamp(),null,null,'America/New_York') b;
  select b.starts_at,b.ends_at into previous_start,previous_end from public.period_bounds('weekly',current_start-interval '1 microsecond',null,null,'America/New_York') b;
  if previous_end<>current_start then raise exception 'Comparison weeks must be adjacent'; end if;
  insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid'),(peer,peer::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(athlete,'Relay owner'),(peer,'Relay peer'),(outsider,'Outsider') on conflict(id) do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Rollback relay',substr(crew::text,1,8),'running',athlete);
  insert into public.crew_members(crew_id,user_id,display_name,status) values(crew,athlete,'Owner','active'),(crew,peer,'Peer','active');
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key,source_label)
    select athlete,'strava',n::text,category,
      case when n=5 then current_start when n=6 then previous_start-interval '1 microsecond' else previous_start+interval '1 hour' end,
      1000,case when n=7 then 'cycling' else 'running' end,1000,600,
      case when n=3 then 'demo' else 'manual' end,case when n=4 then 'excluded' else 'counted' end,
      case when n=8 then 'mock-stub-relay' else 'relay-sql-'||n end,case when n=9 then 'history' else 'strava' end
      from generate_series(1,9) n;
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    values(peer,'strava','peer',category,previous_start,3000,'running',3000,1200,'recorded','counted','relay-peer');
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  select t.session_count,t.distance_m into sessions,distance from public.crew_previous_week_totals(crew) t where t.user_id=athlete;
  if sessions<>2 or distance<>2000 then raise exception 'Incorrect eligible totals: %, %',sessions,distance; end if;
  select sum(t.distance_m) into total from public.crew_previous_week_totals(crew) t;
  if total<>5000 then raise exception 'Current members must contribute together'; end if;
  update public.crew_members set status='declined' where crew_id=crew and user_id=peer;
  select sum(t.distance_m) into total from public.crew_previous_week_totals(crew) t;
  if total<>2000 then raise exception 'Former members must not count'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin perform * from public.crew_previous_week_totals(crew);raise exception 'Outsider was allowed';exception when others then if sqlerrm<>'not_a_member' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform * from public.crew_previous_week_totals(crew);raise exception 'Anonymous was allowed';exception when others then if sqlerrm<>'authentication_required' then raise;end if;end;
end;
$$;
