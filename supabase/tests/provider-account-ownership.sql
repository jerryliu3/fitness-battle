-- Run in a rollback transaction after migrations.
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); external text:=gen_random_uuid()::text;
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid');
 perform public.store_fitness_tokens(a,'garmin','test-access','test-refresh',now()+interval '1 day',external);
 if public.user_id_for_fitness_athlete('garmin',external) is distinct from a then raise exception 'unique owner not resolved'; end if;
 begin
  perform public.store_fitness_tokens(b,'garmin','test-access2','test-refresh2',now()+interval '1 day',external);
  raise exception 'duplicate owner accepted';
 exception when unique_violation then null;
 end;
 insert into private.fitness_tokens(user_id,provider,access_token,refresh_token,expires_at,athlete_external_id) values(b,'garmin','legacy','legacy',now()+interval '1 day',external);
 if public.user_id_for_fitness_athlete('garmin',external) is not null then raise exception 'ambiguous owner selected'; end if;
end $$;
