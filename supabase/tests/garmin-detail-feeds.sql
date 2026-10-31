-- Run after the migration in a rollback transaction.
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); category uuid; activity uuid; result jsonb; external text:=gen_random_uuid()::text;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid');
 select id into category from public.categories where slug='running';
 insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,raw_name,compete_key,summary_polyline,detailed_polyline,route_replay)
 values(a,'garmin',external,category,now(),1000,'Run','garmin-'||external,'summary','detailed','[{"progress":0,"elapsedSec":0}]') returning id into activity;
 update public.activities set summary_polyline=null,detailed_polyline=null,route_replay=null where id=activity;
 if not exists(select 1 from public.activities where id=activity and summary_polyline='summary' and detailed_polyline='detailed' and route_replay is not null) then raise exception 'summary erased route'; end if;
 perform public.store_garmin_record(a,'dailies','day','{"steps":100}');
 perform public.store_garmin_record(b,'dailies','day','{"steps":200}');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 select jsonb_agg(r.payload) into result from public.garmin_records_page('dailies') r;
 if result <> '[{"steps":100}]'::jsonb then raise exception 'owner isolation failed'; end if;
 begin
  perform public.store_garmin_record(a,'dailies','day','{}');
  raise exception 'authenticated write accepted';
 exception when raise_exception then if sqlerrm <> 'forbidden' then raise; end if;
 end;
 perform set_config('request.jwt.claim.role','service_role',true);
 perform public.store_fitness_tokens(a,'garmin','test','test',now()+interval '1 day',external);
 insert into public.fitness_connections(user_id,provider,status) values(a,'garmin','connected');
 perform public.revoke_garmin_link(external);
 if exists(select 1 from private.fitness_tokens where user_id=a and provider='garmin') then raise exception 'revocation retained tokens'; end if;
 if not exists(select 1 from public.fitness_connections where user_id=a and provider='garmin' and status='disconnected') then raise exception 'revocation retained connection'; end if;
end $$;
