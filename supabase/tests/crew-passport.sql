-- Run after migrations inside a transaction that is rolled back. Not a seed.
do $$
<<fixture>>
declare
  owner_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid(); outsider uuid := gen_random_uuid(); crew uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1); season uuid; contract uuid; replacement uuid; result jsonb; receipt uuid;
  starts timestamptz := date_trunc('week', clock_timestamp() at time zone 'America/New_York') at time zone 'America/New_York';
  previous_start timestamptz; next_end timestamptz;
begin
  previous_start := ((starts at time zone 'America/New_York') - interval '7 days') at time zone 'America/New_York';
  next_end := ((starts at time zone 'America/New_York') + interval '7 days') at time zone 'America/New_York';
  insert into auth.users(id,email) values(owner_id,owner_id::text||'@test.invalid'),(member_id,member_id::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(owner_id,'Owner'),(member_id,'Member'),(outsider,'Outsider') on conflict do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Passport SQL test',substr(crew::text,1,8),'running',owner_id);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew,owner_id,'Owner'),(crew,member_id,'Member');
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  -- A member who is not the creator can configure seasons and contracts.
  season := public.create_crew_season(crew,'Chapter one',previous_start,next_end);
  begin
    perform public.create_crew_season(crew,'Overlap',starts,next_end);
    raise exception 'overlapping season allowed';
  exception when others then if sqlerrm <> 'season_overlap' then raise; end if; end;
  contract := public.set_crew_contract(crew,'A shared start','sessions',2,null);
  begin
    perform public.set_crew_contract(crew,'Lost update','sessions',1,null);
    raise exception 'stale replacement allowed';
  exception when others then if sqlerrm <> 'contract_changed' then raise; end if; end;
  replacement := public.set_crew_contract(crew,'One shared session','sessions',1,contract);
  if (select cancelled_at from public.crew_contracts where id=contract) is null then raise exception 'replacement erased history'; end if;
  if (select season_id from public.crew_contracts where id=replacement) <> season then raise exception 'season association missing'; end if;
  begin
    perform public.set_crew_contract(crew,'Too many teammates','contributors',3,replacement);
    raise exception 'impossible participation target allowed';
  exception when others then if sqlerrm <> 'invalid_contract' then raise; end if; end;

  -- A closed fixture uses facts accepted before its deadline. Later facts cannot
  -- turn a previously missed contract into an earned stamp.
  update public.crew_contracts set starts_at=previous_start,ends_at=starts where id=replacement;
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
  select owner_id,'strava',crew::text||':'||n,category,previous_start+interval '1 hour',1000,'running',1000,600,
    case when n=2 then 'demo' else 'manual' end,case when n=3 then 'excluded' else 'counted' end,'passport-sql-'||n from generate_series(1,3)n;
  update private.competition_fact_versions v set accepted_at=previous_start+interval '2 hours' where v.owner_id=fixture.owner_id;
  result := public.crew_passport(crew);
  if (select result_value from public.crew_contracts where id=replacement) <> 1 then raise exception 'eligibility filter changed'; end if;
  if jsonb_array_length(result->'stamps') <> 1 then raise exception 'incorrect earned stamps: %',result; end if;
  select id into receipt from public.crew_passport_stamps where contract_id=replacement and code='contract_finish';
  if receipt is null then raise exception 'finish stamp missing'; end if;
  perform public.crew_passport(crew);
  if (select count(*) from public.crew_passport_stamps where contract_id=replacement) <> 1 then raise exception 'duplicate stamps on retry'; end if;
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    values(member_id,'strava',crew::text||':late',category,previous_start+interval '3 hours',1000,'running',1000,600,'manual','counted','passport-late');
  perform public.crew_passport(crew);
  if (select result_value from public.crew_contracts where id=replacement) <> 1
    or (select count(*) from public.crew_passport_stamps where contract_id=replacement) <> 1 then raise exception 'closed results changed after late import'; end if;
  -- Leaving does not delete the crew's receipts; the recorded roster is stable.
  update public.crew_members set status='declined' where crew_id=crew and user_id=fixture.owner_id;
  perform public.set_crew_contract(crew,'Next week','sessions',1,null);
  if not exists(select 1 from public.crew_passport_stamps where id=receipt) then raise exception 'weekly replacement erased stamp'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin perform public.crew_passport(crew); raise exception 'outsider read passport';
    exception when others then if sqlerrm <> 'not_a_member' then raise; end if; end;
  begin perform public.set_crew_contract(crew,'Forged','sessions',1,null); raise exception 'outsider changed contract';
    exception when others then if sqlerrm <> 'not_a_member' then raise; end if; end;
  set local role authenticated;
  if exists(select 1 from public.crew_seasons where crew_id=crew)
    or exists(select 1 from public.crew_contracts where crew_id=crew)
    or exists(select 1 from public.crew_passport_stamps where contract_id=replacement) then raise exception 'RLS exposed another crew'; end if;
  reset role;
  if has_table_privilege('authenticated','public.crew_passport_stamps','INSERT')
    or has_table_privilege('authenticated','public.crew_contracts','UPDATE') then raise exception 'direct result writes granted'; end if;
  if has_function_privilege('anon','public.crew_passport(uuid)','EXECUTE')
    or has_function_privilege('authenticated','private.settle_crew_contracts(uuid)','EXECUTE') then raise exception 'private writer exposed'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.crew_passport(crew); raise exception 'anonymous read passport';
    exception when others then if sqlerrm <> 'authentication_required' then raise; end if; end;
end; $$;
