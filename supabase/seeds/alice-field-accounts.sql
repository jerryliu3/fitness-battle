-- Administrative QA seed, not an application write path or automatic migration.
-- Creates six database-backed athletes with auth identities and full training history.
-- By default, leaves Alice's frozen fields untouched. To explicitly reseed ONLY
-- her current solo demo fields, run in the same transaction before this DO block:
--   set local overtaek.reseed_alice_fields = 'on';
-- Use a transaction. Never run this as an athlete or against arbitrary accounts.
do $$
declare
 alice constant uuid := '11111111-1111-4111-8111-111111111111';
 cohort uuid[] := array[alice];
 athlete uuid; label text; mail text; n integer; d integer; seed_sport text;
 today date := (clock_timestamp() at time zone 'America/New_York')::date;
 monday timestamptz := date_trunc('week',clock_timestamp() at time zone 'America/New_York') at time zone 'America/New_York';
 f public.week_fields%rowtype;
 reseat boolean := coalesce(current_setting('overtaek.reseed_alice_fields',true),'')='on';
begin
 perform pg_advisory_xact_lock(hashtextextended(alice::text,0));
 if not exists(select 1 from auth.users where id=alice and email='alice@example.com') then raise exception 'alice_fixture_missing'; end if;
 -- Reject a reserved-ID collision instead of modifying another athlete's account.
 for n in 1..6 loop
  athlete := ('a11ce000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  if exists(select 1 from auth.users where id=athlete and raw_app_meta_data->>'fixture' is distinct from 'alice-field-accounts') then raise exception 'reserved_fixture_id_in_use'; end if;
  cohort := array_append(cohort,athlete);
 end loop;
 if reseat then
  perform 1 from public.week_fields where alice=any(member_ids) and wave_start<=statement_timestamp() and week_end>statement_timestamp() and crew_id is null for update;
  if not found then raise exception 'alice_has_no_active_solo_fields'; end if;
  if exists(select 1 from public.week_fields wf cross join lateral unnest(wf.member_ids) as members(member_id) join auth.users u on u.id=members.member_id
    where alice=any(wf.member_ids) and wf.wave_start<=statement_timestamp() and wf.week_end>statement_timestamp() and wf.crew_id is null and not (u.id=any(cohort))) then
    raise exception 'field_contains_another_live_account';
  end if;
  if exists(select 1 from public.athlete_blocks where blocker_id=any(cohort) and blocked_id=any(cohort)) then raise exception 'fixture_roster_has_block_conflict'; end if;
 end if;
 for n in 1..6 loop
  athlete := cohort[n+1];
  label := (array['Jordan Lee','Mara Chen','Theo Grant','Nora Patel','Luis Rivera','Avery Brooks'])[n];
  mail := 'alice-field-'||n||'@example.com';
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
    confirmation_token,recovery_token,email_change_token_new,email_change_token_current,reauthentication_token,email_change,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(athlete,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',mail,
    extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),'','','','','','',
    jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'fixture','alice-field-accounts'),jsonb_build_object('display_name',label),now(),now())
  on conflict(id) do nothing;
  insert into auth.identities(user_id,provider_id,identity_data,provider,created_at,updated_at)
    values(athlete,athlete::text,jsonb_build_object('sub',athlete::text,'email',mail,'email_verified',true),'email',now(),now()) on conflict(provider_id,provider) do nothing;
  insert into public.profiles(id,display_name,city,primary_sport) values(athlete,label,'New York','running')
    on conflict(id) do update set display_name=excluded.display_name,city=excluded.city,primary_sport=excluded.primary_sport;
  insert into public.athlete_prefs(user_id,freezes_left,calibrated,onboarding_completed,clock_period_start,focus_family,focus_id,units)
    values(athlete,3,true,true,monday,'sport','running','us')
    on conflict(user_id) do update set onboarding_completed=true,calibrated=true;
  foreach seed_sport in array array['running','cycling','walking','strength'] loop
   insert into public.sport_ratings(user_id,sport,open_elo,verified_elo,opted_in,lock_open,lock_verified,lock_period)
    values(athlete,seed_sport,1000+n*22,1000+n*22,true,1000+n*22,1000+n*22,monday) on conflict(user_id,sport) do nothing;
   for d in 0..59 loop
    if (d+n)%3<>0 then continue; end if;
    insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,moving_sec,avg_hr,raw_name,sport,distance_m,verified,provenance,disposition,compete_key,source_label)
    select athlete,'mock','alice-field-'||seed_sport||'-'||d,c.id,
      ((today-d)::timestamp+interval '7 hours') at time zone 'America/New_York',
      case seed_sport when 'strength' then 1800+n*120 else (case seed_sport when 'cycling' then 14000 when 'walking' then 2500 else 4000 end)+n*400+d*15 end,
      case seed_sport when 'cycling' then 2400+n*120 else 1800+n*120 end,128+n*3,
      label||' · '||seed_sport,seed_sport,
      case seed_sport when 'strength' then 0 else (case seed_sport when 'cycling' then 14000 when 'walking' then 2500 else 4000 end)+n*400+d*15 end,
      seed_sport<>'strength','recorded','counted','seeded-'||seed_sport||'-'||d,'Seeded training'
    from public.categories c where c.slug=seed_sport
    on conflict(user_id,provider,external_id) do nothing;
   end loop;
  end loop;
  for d in 0..59 loop
   insert into public.daily_health_readings(user_id,provider,day,steps,resting_hr,hrv)
    values(athlete,'mock',today-d,7500+n*410+(d*397%4500),51+n+(d%5),45+n*3+(d*7%20)) on conflict(user_id,provider,day) do nothing;
   insert into public.sleep_nights(user_id,night_id,day,score,duration_min,efficiency,deep_min,rem_min,light_min,awake_min,source,verified)
    values(athlete,'seeded-sleep-'||d,today-d,78+(d+n)%15,420+(d+n)%60,90+(d+n)%7,75,95,250,20,'manual',false) on conflict(user_id,night_id) do nothing;
  end loop;
 end loop;
 if reseat then
  for f in select * from public.week_fields where alice=any(member_ids) and wave_start<=statement_timestamp() and week_end>statement_timestamp() and crew_id is null loop
   update public.week_fields set member_ids=cohort,synthetic_ids='{}',capacity=cardinality(cohort),
    entry_ratings=coalesce(entry_ratings,'{}'::jsonb)||(select jsonb_object_agg(r.user_id::text,jsonb_build_object('open',r.open_elo,'verified',r.verified_elo)) from public.sport_ratings r where r.user_id=any(cohort) and r.user_id<>alice and r.sport=f.sport),updated_at=clock_timestamp() where id=f.id;
   foreach athlete in array cohort loop
    insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id,registered_at,field_id)
     values(athlete,f.sport,f.wave_start,f.week_end,cardinality(cohort),array(select member_id::text from unnest(cohort) as members(member_id) where member_id<>athlete),'{}',true,null,f.wave_start,f.id)
     on conflict(user_id,sport,wave_start) do update set wave_start=excluded.wave_start,week_end=excluded.week_end,capacity=excluded.capacity,peer_ids=excluded.peer_ids,synthetic_ids='{}',crew_id=null,field_id=excluded.field_id;
   end loop;
  end loop;
 end if;
end; $$;
