-- Run in a rollback transaction after migrations.
do $$
declare u uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); crew uuid:=gen_random_uuid(); expected date := date_trunc('week', now() at time zone 'America/New_York')::date;
begin
 insert into auth.users(id,email) values(u,u::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
 insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Rest test',substr(crew::text,1,8),'running',u);
 insert into public.crew_members(crew_id,user_id,display_name) values(crew,u,'A');
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.set_crew_rest(crew,true);
 if (select rest_week from public.crew_members where crew_id=crew and user_id=u) is distinct from expected then raise exception 'wrong rest week';end if;
 perform public.set_crew_rest(crew,false);
 if (select rest_week from public.crew_members where crew_id=crew and user_id=u) is not null then raise exception 'rest did not clear';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.set_crew_rest(crew,true);raise exception 'outsider marked rest';exception when others then if sqlerrm<>'not_a_member' then raise;end if;end;
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.set_crew_rest(crew,true);raise exception 'guest marked rest';exception when others then if sqlerrm<>'authentication_required' then raise;end if;end;
 if has_function_privilege('anon','public.set_crew_rest(uuid,boolean)','execute') then raise exception 'anonymous execute allowed';end if;
 if date_trunc('week',timestamptz '2026-10-26 01:00Z' at time zone 'America/New_York')::date <> date '2026-10-19' then raise exception 'Sunday boundary shifted';end if;
end; $$;
