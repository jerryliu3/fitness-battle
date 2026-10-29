-- Execute in a rollback transaction. Test-only fixtures simulate registrations
-- committed before a benchmark; production functions always use the DB clock.
create function pg_temp.wave_state(p_start timestamptz,p_end timestamptz,p_enrolled boolean default true) returns jsonb
language sql as $$select jsonb_build_object(
 'name','Wave athlete','city','New York','primary','running','units','metric','freezesLeft',3,'calibrated',false,'onboardingCompleted',true,'demoNow',null,
 'clock',jsonb_build_object('periodStart',p_start),'focus',jsonb_build_object('family','sport','id','running'),
 'ratings',jsonb_build_array(jsonb_build_object('sport','running','verifiedElo',1000,'openElo',1000,'optedIn',p_enrolled,'lockVerified',1000,'lockOpen',1000,'lockPeriod',p_start)),
 'enrollments',case when p_enrolled then jsonb_build_array(jsonb_build_object('sport','running','waveStart',p_start,'weekEnd',p_end,'capacity',8,'peerIds','[]'::jsonb,'syntheticIds','[]'::jsonb,'autoEnrollNext',true)) else '[]'::jsonb end,
 'healthRatings','[]'::jsonb,'healthResults','[]'::jsonb,'periodResults','[]'::jsonb,'effortMilestones','[]'::jsonb,'frozenPeriods','[]'::jsonb,'sleepNights','[]'::jsonb,'duels','[]'::jsonb
)$$;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
 future timestamptz:=private.next_daily_wave(statement_timestamp()); finish timestamptz; s timestamptz; e timestamptz;
 state jsonb; revision timestamptz; registered timestamptz; f public.week_fields; other public.week_fields; before_ids uuid[]; before_syn text[];
begin
 if private.next_daily_wave('2026-10-28T09:59:59Z')<>'2026-10-28T10:00Z' or private.next_daily_wave('2026-10-28T10:00:01Z')<>'2026-10-29T10:00Z' then raise exception 'cutoff wrong'; end if;
 if private.next_daily_wave('2026-03-08T06:30Z')<>'2026-03-08T10:00Z' or private.next_daily_wave('2026-11-01T05:30Z')<>'2026-11-01T11:00Z' then raise exception 'DST wrong'; end if;
 if private.wave_week_end('2026-11-01T11:00Z')<>'2026-11-02T05:00Z' or private.next_daily_wave('2026-11-01T11:00:01Z')<>'2026-11-02T11:00Z' then raise exception 'Sunday boundary wrong'; end if;
 insert into auth.users(id,email) values(a,a||'@test.invalid'),(b,b||'@test.invalid'),(c,c||'@test.invalid'),(outsider,outsider||'@test.invalid');
 insert into public.profiles(id,display_name) values(a,'A'),(b,'B'),(c,'C'),(outsider,'Outsider') on conflict do nothing;
 finish:=private.wave_week_end(future); state:=pg_temp.wave_state(future,finish);
 perform set_config('request.jwt.claim.sub',a::text,true);
 revision:=public.save_compete_account(state,'[]','[]',null);
 select registered_at into registered from public.wave_enrollments where user_id=a;
 if registered<statement_timestamp() then raise exception 'registration timestamp not server-owned'; end if;
 select * into f from public.resolve_week_field('running',future,finish);
 if f.id is not null or exists(select 1 from public.week_fields where a=any(member_ids)) then raise exception 'queued roster exposed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.save_compete_account(state,'[]','[]',null);
 perform set_config('request.jwt.claim.sub',a::text,true);
 revision:=public.save_compete_account(pg_temp.wave_state(future,finish,false),'[]','[]',revision);
 if exists(select 1 from public.wave_enrollments where user_id=a) or not exists(select 1 from public.wave_enrollments where user_id=b) then raise exception 'cancellation touched peer'; end if;
 -- Backdated new registration is refused by the database even from an older client.
 begin perform public.save_compete_account(pg_temp.wave_state(future-interval '1 day',finish),'[]','[]',revision); raise exception 'backdated join accepted';
 exception when others then if sqlerrm<>'registration_window_changed' then raise; end if; end;
 -- Simulate three entries already committed before yesterday's 06:00 benchmark.
 s:=(((statement_timestamp() at time zone 'America/New_York')::date-1)+time '06:00') at time zone 'America/New_York'; e:=private.wave_week_end(s);
 delete from public.wave_enrollments where user_id in (a,b,c);
 insert into public.sport_ratings(user_id,sport,opted_in,open_elo,verified_elo,lock_open,lock_verified,lock_period) values(c,'running',true,2100,2100,2100,2100,s) on conflict(user_id,sport) do update set opted_in=true,verified_elo=2100;
 update public.sport_ratings set opted_in=true,open_elo=1000,verified_elo=1000 where user_id in(a,b) and sport='running';
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end,registered_at) values(a,'running',s,e,s-interval '1 hour'),(b,'running',s,e,s-interval '2 hours'),(c,'running',s,e,s-interval '3 hours');
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into f from public.resolve_week_field('running',s,e);
 if not (a=any(f.member_ids) and b=any(f.member_ids)) or c=any(f.member_ids) then raise exception 'level matching wrong'; end if;
 if cardinality(f.member_ids)+cardinality(f.synthetic_ids)<>f.capacity then raise exception 'fillers wrong'; end if;
 if f.roster_locked_at is null then raise exception 'roster not frozen'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 select * into other from public.resolve_week_field('running',s,e);
 if other.id<>f.id or other.synthetic_ids<>f.synthetic_ids then raise exception 'different source of truth'; end if;
 before_ids:=f.member_ids; before_syn:=f.synthetic_ids;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.resolve_week_field('running',s,e); raise exception 'outsider read roster'; exception when others then if sqlerrm<>'not_registered' then raise; end if; end;
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(outsider,'running',true,s);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end) values(outsider,'running',s,e);
 begin perform public.resolve_week_field('running',s,e); raise exception 'late entry added'; exception when others then if sqlerrm<>'field_not_assigned' then raise; end if; end;
 select * into other from public.week_fields where id=f.id;
 if other.member_ids<>before_ids or other.synthetic_ids<>before_syn then raise exception 'running roster changed'; end if;
 -- Full document saves preserve the canonical pointer and registration timestamp.
 perform set_config('request.jwt.claim.sub',a::text,true);
 state:=pg_temp.wave_state(s,e);
 select updated_at into revision from public.athlete_prefs where user_id=a;
 perform public.save_compete_account(state,'[]','[]',revision);
 if (select field_id from public.wave_enrollments where user_id=a)<>f.id or (select registered_at from public.wave_enrollments where user_id=a)<>s-interval '1 hour' then raise exception 'metadata overwritten'; end if;
 -- Only running fields are held; started registrations cannot be cancelled.
 if e>statement_timestamp() then
  select updated_at into revision from public.athlete_prefs where user_id=a;
  begin perform public.save_compete_account(pg_temp.wave_state(s,e,false),'[]','[]',revision); raise exception 'running cancellation accepted'; exception when others then if sqlerrm<>'week_still_open' then raise; end if; end;
 end if;
 if has_table_privilege('authenticated','public.wave_enrollments','INSERT') or has_table_privilege('authenticated','public.wave_enrollments','UPDATE') or has_table_privilege('authenticated','public.wave_enrollments','DELETE') then raise exception 'direct registration writes allowed'; end if;
 if has_function_privilege('authenticated','private.finalize_week_wave(text,timestamptz,timestamptz)','EXECUTE') then raise exception 'private finalizer exposed'; end if;
end; $$;

do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
 s timestamptz:=(date_trunc('week',statement_timestamp() at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
 old_start timestamptz; old_end timestamptz; e timestamptz; f public.week_fields; other public.week_fields;
begin
 if s>statement_timestamp() then s:=((s at time zone 'America/New_York')-interval '7 days') at time zone 'America/New_York'; end if;
 old_end:=date_trunc('day',s at time zone 'America/New_York') at time zone 'America/New_York';
 old_start:=((s at time zone 'America/New_York')-interval '7 days') at time zone 'America/New_York'; e:=private.wave_week_end(s);
 insert into auth.users(id,email) values(a,a||'@test.invalid'),(b,b||'@test.invalid'),(c,c||'@test.invalid');
 insert into public.profiles(id,display_name) values(a,'Renew A'),(b,'Renew B'),(c,'Stopped') on conflict do nothing;
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(a,'cycling',true,old_start),(b,'cycling',true,old_start),(c,'cycling',true,old_start);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end,auto_enroll_next,registered_at) values(a,'cycling',old_start,old_end,true,old_start),(b,'cycling',old_start,old_end,true,old_start),(c,'cycling',old_start,old_end,false,old_start);
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin perform public.save_compete_account(pg_temp.wave_state(s,e,false),'[]','[]',null); raise exception 'stale renewal cancellation accepted'; exception when others then if sqlerrm<>'week_still_open' then raise; end if; end;
 select * into f from public.resolve_week_field('cycling',s,e);
 perform set_config('request.jwt.claim.sub',b::text,true);
 select * into other from public.resolve_week_field('cycling',s,e);
 if f.id<>other.id or not (a=any(f.member_ids) and b=any(f.member_ids)) or c=any(f.member_ids) then raise exception 'offline auto renewals not matched'; end if;
end; $$;

do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); crew uuid:=gen_random_uuid(); f public.week_fields;
 s timestamptz:=(((statement_timestamp() at time zone 'America/New_York')::date-1)+time '06:00') at time zone 'America/New_York'; e timestamptz;
begin
 e:=private.wave_week_end(s);
 insert into auth.users(id,email) values(a,a||'@test.invalid'),(b,b||'@test.invalid');
 insert into public.profiles(id,display_name) values(a,'Crew A'),(b,'Crew B') on conflict do nothing;
 insert into public.crews(id,name,sport,created_by,invite_code) values(crew,'Frozen crew','walking',a,substr(crew::text,1,8));
 insert into public.crew_members(crew_id,user_id,display_name,status) values(crew,a,'Crew A','active'),(crew,b,'Crew B','active');
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(a,'walking',true,s),(b,'walking',true,s);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end,crew_id,registered_at) values(a,'walking',s,e,crew,s-interval '1 hour'),(b,'walking',s,e,crew,s-interval '1 hour');
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into f from public.resolve_week_field('walking',s,e);
 perform public.leave_crew(crew);
 if (select cardinality(member_ids) from public.week_fields where id=f.id)<>2 then raise exception 'Crew departure changed started roster'; end if;
 if (select count(*) from public.week_field_roster(f.id))<>2 then raise exception 'Crew departure hid competitor'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.leave_crew(crew);
 if not exists(select 1 from public.week_fields where id=f.id and cardinality(member_ids)=2 and crew_id is null) then raise exception 'Crew deletion removed competition'; end if;
end; $$;

do $$
declare uid uuid:=gen_random_uuid(); field uuid:=gen_random_uuid(); s timestamptz:=private.next_daily_wave(statement_timestamp()); e timestamptz;
begin
 e:=private.wave_week_end(s);
 insert into auth.users(id,email) values(uid,uid||'@test.invalid');
 insert into public.profiles(id,display_name) values(uid,'Queued identity') on conflict do nothing;
 insert into public.week_fields(id,sport,wave_start,week_end,member_ids) values(field,'strength',s,e,array[uid]);
 perform set_config('request.jwt.claim.sub',uid::text,true);
 begin perform public.week_field_roster(field); raise exception 'future roster leaked'; exception when others then if sqlerrm<>'wave_not_started' then raise; end if; end;
 perform set_config('role','authenticated',true);
 if exists(select 1 from public.week_fields where id=field) then raise exception 'future field leaked through RLS'; end if;
 perform set_config('role','postgres',true);
end; $$;
