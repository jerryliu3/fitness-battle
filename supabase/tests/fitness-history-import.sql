-- Run in a rollback transaction after migrations.
do $$
declare u uuid := gen_random_uuid(); first_lease uuid := gen_random_uuid(); second_lease uuid := gen_random_uuid();
begin
  insert into auth.users(id,email) values(u,u::text||'@test.invalid');
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if not public.claim_fitness_history(u,'apple_health',30,first_lease) then raise exception 'first claim rejected'; end if;
  if public.claim_fitness_history(u,'strava',90,second_lease) then raise exception 'concurrent cross-provider claim accepted'; end if;
  if public.finish_fitness_history(u,second_lease,true) then raise exception 'wrong lease accepted'; end if;
  if not public.finish_fitness_history(u,first_lease,false) then raise exception 'failure not released'; end if;
  if not public.claim_fitness_history(u,'strava',14,second_lease) then raise exception 'retry rejected'; end if;
  if not public.finish_fitness_history(u,second_lease,true) then raise exception 'success not recorded'; end if;
  if public.claim_fitness_history(u,'oura',90,first_lease) then raise exception 'second lifetime import accepted'; end if;
  if public.finish_fitness_history(u,second_lease,false) then raise exception 'completion unlocked'; end if;
  if (select days from public.fitness_history_imports where user_id=u) <> 14 then raise exception 'chosen range lost'; end if;
  if has_table_privilege('authenticated','public.fitness_history_imports','UPDATE') then raise exception 'client can reset lock'; end if;
  if has_function_privilege('authenticated','public.claim_fitness_history(uuid,public.fitness_provider,integer,uuid)','EXECUTE') then raise exception 'client can bypass API'; end if;
end $$;
