-- Run inside a rollback transaction.
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); old_field uuid:=gen_random_uuid(); target uuid:=gen_random_uuid(); s timestamptz:=statement_timestamp()-interval '8 days'; e timestamptz:=statement_timestamp()-interval '1 day'; next_start timestamptz:=statement_timestamp(); next_end timestamptz:=statement_timestamp()+interval '6 days'; f public.week_fields; payload jsonb;
begin
 insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
 insert into public.profiles(id,display_name) values(a,'A'),(b,'B'),(outsider,'Outsider') on conflict(id) do nothing;
 insert into public.week_fields(id,sport,wave_start,week_end,capacity,member_ids) values(old_field,'running',s,e,2,array[a,b]);
 insert into public.period_results(user_id,period_start,period_end,sport,track,place,field_size,elo_before,elo_after,settled_at)
   values(a,s,e,'running','open',1,2,1000,1012,statement_timestamp()),(b,s,e,'running','open',2,2,1000,1000,statement_timestamp());
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.set_weekly_field_choice(old_field,b,'open','congrats',true);
 perform public.set_weekly_field_choice(old_field,b,'open','repeat',true);
 perform public.set_weekly_field_choice(old_field,b,'open','congrats',false);
 if not (select repeat and not congrats from public.weekly_field_choices where actor_id=a) then raise exception 'choices coupled';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.set_weekly_field_choice(old_field,a,'open','repeat',true);raise exception 'outsider reacted';exception when others then if sqlerrm<>'not_in_settled_field' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 payload:=public.weekly_field_social('running',s,e,'open');
 if payload->'peers'->0->>'status'<>'off' then raise exception 'one sided choice leaked';end if;
 perform public.set_weekly_field_choice(old_field,a,'open','repeat',true);
 insert into public.sport_ratings(user_id,sport,opted_in,lock_period) values(a,'running',true,next_start),(b,'running',true,next_start);
 insert into public.week_fields(id,sport,wave_start,week_end,capacity,member_ids) values(target,'running',next_start,next_end,2,array[a]);
 -- A fuller unrelated field would normally win; mutual preference chooses A's field.
 insert into public.week_fields(sport,wave_start,week_end,capacity,member_ids,created_at) values('running',next_start,next_end,4,array[outsider],statement_timestamp()-interval '1 hour');
 select * into f from public.seat_athlete_week_field('running',next_start,next_end,2);
 if f.id<>target or cardinality(f.member_ids)<>2 then raise exception 'mutual seating missed';end if;
 payload:=public.weekly_field_social('running',s,e,'open');
 if payload->'peers'->0->>'status'<>'paired' then raise exception 'real pairing not reported';end if;
 select * into f from public.seat_athlete_week_field('running',next_start,next_end,2);
 if f.id<>target or cardinality(f.member_ids)<>2 then raise exception 'existing seat moved';end if;
 if has_table_privilege('authenticated','public.weekly_field_choices','INSERT') then raise exception 'direct choices allowed';end if;
end; $$;
