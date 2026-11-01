-- Local/disposable database only. This file rolls back every fixture; not run by the agent.
begin;
do $$
declare
 athlete uuid:=gen_random_uuid(); old_revision timestamptz; revision timestamptz; reply jsonb;
 state jsonb:='{"name":"Overtake fixture","city":"Toronto","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"metric","clock":{"periodStart":"2026-10-19T04:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[]}'::jsonb;
 moments jsonb:='[{"id":"pass","sport":"running","plan":{"overtakenIds":["peer-a","peer-b"]}}]'::jsonb;
 baselines jsonb:='[{"key":"running","value":"after"}]'::jsonb;
begin
 insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid');
 insert into public.profiles(id,display_name) values(athlete,'Overtake fixture') on conflict(id) do nothing;
 select updated_at into old_revision from public.athlete_prefs where user_id=athlete;
 if has_function_privilege('authenticated','public.save_compete_account_with_overtakes(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz,jsonb,jsonb)','EXECUTE') then raise exception 'client receipt writer exposed'; end if;
 reply:=public.save_compete_account_with_overtakes(athlete,state,'[]','[]',old_revision,0,clock_timestamp(),baselines,moments);
 revision:=(reply->>'updatedAt')::timestamptz;
 if (reply->>'lifetimeOvertakes')::int<>2 then raise exception 'wrong acknowledgement'; end if;
 if (select lifetime_overtakes from public.profiles where id=athlete)<>2 then raise exception 'missing lifetime increment'; end if;
 if (select count(*) from public.overtake_receipts where user_id=athlete)<>1 then raise exception 'missing receipt'; end if;
 begin
  perform public.save_compete_account_with_overtakes(athlete,state,'[]','[]',old_revision,0,clock_timestamp(),baselines,moments);
  raise exception 'stale replay accepted';
 exception when others then if sqlerrm<>'account_changed_reload' then raise; end if; end;
 begin
  perform public.save_compete_account_with_overtakes(athlete,state,'[]','[]',revision,0,clock_timestamp(),'[{"key":"running","value":"failed"}]',moments||moments);
  raise exception 'duplicate sport receipt accepted';
 exception when unique_violation then null; end;
 if (select updated_at from public.athlete_prefs where user_id=athlete) is distinct from revision then raise exception 'failed receipt advanced account'; end if;
 if (select lifetime_overtakes from public.profiles where id=athlete)<>2 then raise exception 'retry duplicated lifetime count'; end if;
 if (select value from private.compete_overtake_baselines where user_id=athlete and baseline_key='running')<>'after' then raise exception 'failed receipt changed baseline'; end if;
 if (select count(*) from public.overtake_receipts where user_id=athlete)<>1 then raise exception 'failed receipt leaked'; end if;
end; $$;
rollback;
