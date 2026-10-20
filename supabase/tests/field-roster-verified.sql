-- Run after migrations, inside a rolled-back transaction.
do $$
declare
  athlete uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  field uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  result record;
begin
  insert into auth.users(id,email) values (athlete,athlete::text || '@test.invalid'),(outsider,outsider::text || '@test.invalid');
  insert into public.profiles(id,display_name) values (athlete,'Roster test'),(outsider,'Outsider') on conflict(id) do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Roster test',substr(crew::text,1,8),'running',athlete);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew,athlete,'Roster test');
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids)
    values(field,'running',statement_timestamp()-interval '1 day',statement_timestamp()+interval '1 day',2,crew,'Field',array[athlete],array[]::text[]);
  insert into public.sport_ratings(user_id,sport,open_elo,verified_elo,lock_period) values(athlete,'running',1200,900,statement_timestamp());
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key,verified)
    select athlete,'strava',n::text,category,
      case when n=5 then statement_timestamp()+interval '1 hour' else statement_timestamp()-interval '1 minute' end,
      1000,'running',1000,600,
      case when n=1 then 'recorded' when n=3 then 'demo' else 'manual' end,
      case when n=4 then 'excluded' else 'counted' end,'roster-test-'||n,n=1
    from generate_series(1,5) n;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  select * into result from public.week_field_roster(field);
  if result.distance_m <> 2000 or result.verified_distance_m <> 1000 or result.moving_sec <> 1200 or result.verified_moving_sec <> 600 or result.verified_elo <> 900 then
    raise exception 'Incorrect private crew roster totals: %',row_to_json(result);
  end if;
  update public.week_fields set crew_id=null where id=field;
  select * into result from public.week_field_roster(field);
  if result.distance_m <> 2000 or result.verified_distance_m <> 1000 then raise exception 'Incorrect open roster totals'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform * from public.week_field_roster(field);
    raise exception 'Outsider allowed';
  exception when others then if sqlerrm <> 'not_in_field' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform * from public.week_field_roster(field);
    raise exception 'Anonymous allowed';
  exception when others then if sqlerrm <> 'authentication_required' then raise; end if; end;
end;
$$;
