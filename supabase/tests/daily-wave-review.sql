-- Regression cases found while reviewing daily-wave integration. Run in a
-- rollback transaction after the complete migration chain.
create function pg_temp.review_athlete(p_id uuid,p_sport text,p_start timestamptz,p_end timestamptz,p_crew uuid default null) returns void
language plpgsql as $$begin
 insert into auth.users(id,email) values(p_id,p_id||'@test.invalid');
 insert into public.profiles(id,display_name) values(p_id,'Review athlete') on conflict do nothing;
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(p_id,p_sport,true,p_start);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end,crew_id,registered_at,auto_enroll_next)
 values(p_id,p_sport,p_start,p_end,p_crew,p_start-interval '1 hour',false);
end; $$;

-- Admin closes preserve registration metadata on the other unchanged sports.
do $$declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); source_id uuid:=gen_random_uuid(); destination uuid:=gen_random_uuid();
 s timestamptz:=statement_timestamp()-interval '1 hour'; e timestamptz:=statement_timestamp()+interval '1 day';
 revision timestamptz:=statement_timestamp(); prior_registered timestamptz; state jsonb; fv timestamptz;
begin
 perform pg_temp.review_athlete(a,'running',s,e); perform pg_temp.review_athlete(b,'running',s+interval '1 minute',e);
 insert into public.athlete_prefs(user_id,updated_at,clock_period_start) values(a,revision,s),(b,revision,s)
 on conflict(user_id) do update set updated_at=excluded.updated_at;
 insert into public.week_fields(id,sport,wave_start,week_end,member_ids) values(source_id,'running',s,e,array[a]);
 update public.wave_enrollments set field_id=source_id where user_id=a;
 select registered_at into prior_registered from public.wave_enrollments where user_id=a;
 state:=jsonb_build_object('clock',jsonb_build_object('periodStart',s),'ratings','[]'::jsonb,'healthRatings','[]'::jsonb,'healthResults','[]'::jsonb,'periodResults','[]'::jsonb,
  'enrollments',jsonb_build_array(jsonb_build_object('sport','running','waveStart',s,'weekEnd',e,'capacity',8,'peerIds','[]'::jsonb,'syntheticIds','[]'::jsonb,'autoEnrollNext',false)));
 revision:=public.admin_commit_round(gen_random_uuid(),a,a,'close-round','Metadata regression',revision,'{}',state);
 if not exists(select 1 from public.wave_enrollments where user_id=a and field_id=source_id and registered_at=prior_registered) then raise exception 'admin lost registration metadata'; end if;
 insert into public.week_fields(id,sport,wave_start,week_end,member_ids) values(destination,'running',s+interval '1 minute',e,array[b]) returning updated_at into fv;
 perform public.admin_apply_compete_scenario(gen_random_uuid(),a,a,revision,'join-field','running','Move canonical enrollment',
  jsonb_build_object('fieldId',destination,'fieldUpdatedAt',fv,'peerId',b,'peerUpdatedAt',(select updated_at from public.athlete_prefs where user_id=b)),'{}');
 if not exists(select 1 from public.wave_enrollments where user_id=a and field_id=destination) then raise exception 'admin move retained old field pointer'; end if;
end; $$;

-- The first athlete must occupy their own group even with eight mutual repeats.
do $$declare a uuid:='00000000-0000-4000-8000-000000000009'; b uuid; ids uuid[]:=array[a];
 s timestamptz:=statement_timestamp()-interval '42 days'; e timestamptz; source_id uuid:=gen_random_uuid(); f public.week_fields; i integer;
begin
 e:=private.wave_week_end(s); perform pg_temp.review_athlete(a,'running',s,e);
 for i in 1..8 loop
  b:=gen_random_uuid(); ids:=ids||b; perform pg_temp.review_athlete(b,'running',s,e);
 end loop;
 insert into public.week_fields(id,sport,wave_start,week_end,capacity,member_ids)
 values(source_id,'running',s-interval '7 days',s-interval '1 day',16,ids);
 foreach b in array ids[2:9] loop
  insert into public.weekly_field_choices(field_id,actor_id,recipient_id,track,repeat,expires_at)
  values(source_id,a,b,'verified',true,e+interval '1 day'),(source_id,b,a,'verified',true,e+interval '1 day');
 end loop;
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into f from public.resolve_week_field('running',s,e);
 if cardinality(f.member_ids)<>8 or not a=any(f.member_ids) then raise exception 'repeat choices displaced their own actor'; end if;
end; $$;

-- Sleep auto-renewal has the same database-side hold as volume events.
do $$declare a uuid:=gen_random_uuid();
 s timestamptz:=(date_trunc('week',statement_timestamp() at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
begin
 if s>statement_timestamp() then return; end if;
 insert into auth.users(id,email) values(a,a||'@test.invalid');
 insert into public.health_ratings(user_id,metric,elo,opted_in,lock_elo,lock_period,auto_enroll_next)
 values(a,'sleep',1000,true,1000,((s at time zone 'America/New_York')-interval '7 days') at time zone 'America/New_York',true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin
  perform public.save_compete_account('{"enrollments":[],"healthRatings":[]}'::jsonb,'[]','[]',null);
  raise exception 'stale sleep cancellation accepted';
 exception when others then if sqlerrm<>'week_still_open' then raise; end if; end;
end; $$;

-- Weighted score is aggregated before discarding private sensor readings.
do $$declare a uuid:=gen_random_uuid(); field uuid:=gen_random_uuid(); result record;
 s timestamptz:=statement_timestamp()-interval '49 days'; e timestamptz;
 category uuid:=(select id from public.categories limit 1);
begin
 e:=private.wave_week_end(s); perform pg_temp.review_athlete(a,'strength',s,e);
 insert into public.week_fields(id,sport,wave_start,week_end,member_ids) values(field,'strength',s,e,array[a]);
 insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,avg_hr,provenance,disposition,compete_key)
 values(a,'strava','weighted-strength',category,s+interval '1 hour',3600,'strength',0,3600,180,'recorded','counted','weighted-strength');
 -- Privileged historical fixture: this activity was accepted before its close.
 update private.competition_fact_versions set accepted_at=e-interval '1 second' where owner_id=a and kind='activity';
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into result from public.week_field_roster(field);
 if abs(result.effort-8.96)>0.000000001 or result.verified_effort<>0 then raise exception 'weighted strength aggregate lost'; end if;
 if abs(private.field_activity_effort('cycling',10000,1200,180)-11.466666666666669)>0.000000001 then raise exception 'cycling effort formula drift'; end if;
end; $$;

-- Large Crews require more than one bounded field for the same benchmark.
do $$declare owner_id uuid:=gen_random_uuid(); member_id uuid; crew uuid:=gen_random_uuid();
 s timestamptz:=statement_timestamp()-interval '28 days'; e timestamptz; i integer; f public.week_fields;
begin
 e:=private.wave_week_end(s);
 perform pg_temp.review_athlete(owner_id,'strength',s,e);
 insert into public.crews(id,name,sport,created_by,invite_code) values(crew,'Large crew','strength',owner_id,substr(crew::text,1,8));
 for i in 1..9 loop
  member_id:=case when i=1 then owner_id else gen_random_uuid() end;
  if i>1 then perform pg_temp.review_athlete(member_id,'strength',s,e,crew); end if;
  insert into public.crew_members(crew_id,user_id,display_name,status) values(crew,member_id,'Member','active');
 end loop;
 update public.wave_enrollments set crew_id=crew where user_id=owner_id;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 select * into f from public.resolve_week_field('strength',s,e);
 if (select count(*) from public.week_fields where crew_id=crew and wave_start=s)<>2
  or (select sum(cardinality(member_ids)) from public.week_fields where crew_id=crew and wave_start=s)<>9 then raise exception 'large Crew not partitioned'; end if;
end; $$;

-- A departure after the start must not change a lazily materialized roster.
do $$declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); crew uuid:=gen_random_uuid();
 s timestamptz:=statement_timestamp()-interval '1 minute'; e timestamptz; f public.week_fields;
begin
 e:=private.wave_week_end(s);
 perform pg_temp.review_athlete(a,'walking',s,e); perform pg_temp.review_athlete(b,'walking',s,e);
 insert into public.crews(id,name,sport,created_by,invite_code) values(crew,'Delayed reveal','walking',a,substr(crew::text,1,8));
 insert into public.crew_members(crew_id,user_id,display_name,status) values(crew,a,'A','active'),(crew,b,'B','active');
 update public.wave_enrollments set crew_id=crew where user_id in(a,b);
 perform set_config('request.jwt.claim.sub',a::text,true); perform public.leave_crew(crew);
 select * into f from public.resolve_week_field('walking',s,e);
 if f.crew_id is distinct from crew or not b=any(f.member_ids) then raise exception 'departure changed started assignment before reveal'; end if;
end; $$;

-- A stored closed Crew enrollment can be left before the account rolls over.
do $$declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); crew uuid:=gen_random_uuid();
 s timestamptz:=statement_timestamp()-interval '35 days'; e timestamptz; f public.week_fields;
begin
 e:=private.wave_week_end(s);
 perform pg_temp.review_athlete(a,'cycling',s,e); perform pg_temp.review_athlete(b,'cycling',s,e);
 insert into public.crews(id,name,sport,created_by,invite_code) values(crew,'Closed crew','cycling',a,substr(crew::text,1,8));
 insert into public.crew_members(crew_id,user_id,display_name,status) values(crew,a,'A','active'),(crew,b,'B','active');
 update public.wave_enrollments set crew_id=crew where user_id in(a,b);
 perform set_config('request.jwt.claim.sub',a::text,true); select * into f from public.resolve_week_field('cycling',s,e);
 perform public.leave_crew(crew);
 if not exists(select 1 from public.wave_enrollments where user_id=a and field_id=f.id)
   or not exists(select 1 from public.week_fields where id=f.id and a=any(member_ids)) then raise exception 'closed Crew identity lost'; end if;
end; $$;
