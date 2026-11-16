begin;
do $$
declare
  viewer uuid := gen_random_uuid(); rival uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  crew_a uuid := gen_random_uuid(); crew_b uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  starts timestamptz := statement_timestamp()-interval '1 day'; ends timestamptz := statement_timestamp()+interval '1 day';
  result jsonb;
begin
  insert into auth.users(id,email) select id,id::text||'@test.invalid' from unnest(array[viewer,rival,outsider]) id;
  insert into public.profiles(id,display_name) select id,'Athlete' from unnest(array[viewer,rival,outsider]) id on conflict(id) do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values
    (crew_a,'A',substr(crew_a::text,1,8),'strength',viewer),(crew_b,'B',substr(crew_b::text,1,8),'strength',rival);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew_a,viewer,'A'),(crew_b,rival,'B');
  insert into public.week_fields(crew_id,name,sport,wave_start,week_end,member_ids,roster_locked_at) values
    (crew_a,'A','strength',starts,ends,array[viewer],statement_timestamp()),
    (crew_b,'B','strength',starts,ends,array[rival],statement_timestamp());
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,avg_hr,verified,provenance,disposition,compete_key) values
    (viewer,'strava','derby-duration-a',category,starts+interval '1 hour',0,'strength',0,3600,180,false,'recorded','counted','derby-duration-a'),
    (rival,'strava','derby-duration-b',category,starts+interval '1 hour',0,'strength',0,3700,110,false,'recorded','counted','derby-duration-b');
  perform set_config('request.jwt.claim.sub',viewer::text,true);
  result := public.crew_derby_standings(crew_a);
  if (select (t->>'score')::numeric from jsonb_array_elements(result->'teams') t where t->>'crew_id'=crew_a::text) <> 3600 then raise exception 'Strength must expose seconds'; end if;
  if (select (t->>'place')::integer from jsonb_array_elements(result->'teams') t where t->>'crew_id'=crew_b::text) <> 1 then raise exception 'HR bonus changed duration ranking'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.crew_derby_standings(crew_a); raise exception 'Outsider accepted';
  exception when others then if sqlerrm <> 'not_a_member' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.crew_derby_standings(crew_a); raise exception 'Anonymous accepted';
  exception when others then if sqlerrm <> 'authentication_required' then raise; end if; end;
end;
$$;
rollback;
