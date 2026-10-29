-- Run after migrations inside a rollback transaction.
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); old uuid:=gen_random_uuid(); f public.week_fields;
 s timestamptz:=statement_timestamp()-interval '2 hours'; cutoff timestamptz:=statement_timestamp()-interval '1 hour'; e timestamptz:=statement_timestamp()+interval '2 days';
begin
 insert into auth.users(id,email) values(a,a||'@test.invalid'),(b,b||'@test.invalid');
 insert into public.profiles(id,display_name) values(a,'Athlete'),(b,'Newcomer') on conflict do nothing;
 insert into public.week_fields(id,sport,wave_start,week_end,capacity,member_ids,roster_locked_at) values(old,'running',s,cutoff,2,array[a],cutoff);
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(a,'running',true,s);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end,registered_at) values(a,'running',s,e,s-interval '1 hour');
 perform set_config('request.jwt.claim.sub',a::text,true);
 select * into f from public.seat_athlete_week_field('running',s,e);
 if f.id=old or f.week_end<>e then raise exception 'closed field reused'; end if;
 if not exists(select 1 from public.week_fields where id=old and week_end=cutoff and member_ids=array[a]) then raise exception 'closed history changed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin perform public.seat_athlete_week_field('running',s,e); raise exception 'unregistered newcomer seated'; exception when others then if sqlerrm<>'not_registered' then raise; end if; end;
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(b,'running',true,s);
 insert into public.wave_enrollments(user_id,sport,wave_start,week_end) values(b,'running',s,e);
 begin perform public.seat_athlete_week_field('running',s,e); raise exception 'late newcomer seated'; exception when others then if sqlerrm<>'field_not_assigned' then raise; end if; end;
 if (select member_ids from public.week_fields where id=f.id)<>array[a] then raise exception 'running roster changed'; end if;
end; $$;
