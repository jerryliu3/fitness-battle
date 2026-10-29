-- Real server-clock cutoff. No application clock pin or scheduled job is used.
do $$declare a uuid:=gen_random_uuid(); field uuid:=gen_random_uuid(); category uuid:=(select id from public.categories where slug='running');
 s timestamptz:=clock_timestamp()-interval '1 hour'; e timestamptz:=clock_timestamp()+interval '0.3 seconds'; result record;
begin
 insert into auth.users(id,email) values(a,a||'@test.invalid');
 insert into public.week_fields(id,sport,wave_start,week_end,member_ids,roster_locked_at) values(field,'running',s,e,array[a],clock_timestamp());
 insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key)
 values(a,'strava','on-time',category,s+interval '1 minute',5000,'running',5000,1800,true,'recorded','counted','strava-on-time');
 perform pg_sleep(greatest(0,extract(epoch from e-clock_timestamp()))+0.03);
 insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key)
 values(a,'strava','late',category,s+interval '2 minutes',9000,'running',9000,2400,true,'recorded','counted','strava-late');
 update public.activities set distance_m=12000,disposition='excluded' where user_id=a and external_id='on-time';
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into result from public.week_field_roster(field);
 if result.verified_distance_m<>5000 then raise exception 'deadline changed after late import/edit: %',result.verified_distance_m; end if;
 if (select count(*) from public.activities where user_id=a)<>2 then raise exception 'late activity lost from training'; end if;
 if has_function_privilege('authenticated','public.save_compete_account(jsonb,jsonb,jsonb,timestamptz)','EXECUTE')
   or has_function_privilege('authenticated','public.save_compete_account_server(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz)','EXECUTE') then raise exception 'client score writer exposed'; end if;
 if has_table_privilege('authenticated','public.period_results','UPDATE') or has_table_privilege('authenticated','public.sport_ratings','UPDATE') then raise exception 'client score table exposed'; end if;
end; $$;
