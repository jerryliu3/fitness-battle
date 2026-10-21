-- Run inside a rollback transaction after migrations.
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); crew uuid:=gen_random_uuid(); session uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
 insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Test session',substr(crew::text,1,8),'running',a);
 insert into public.crew_members(crew_id,user_id,display_name) values(crew,a,'A'),(crew,b,'B');
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.create_crew_session(session,crew,'Easy run',statement_timestamp()+interval '1 day',30);
 perform public.create_crew_session(session,crew,'Easy run',statement_timestamp()+interval '1 day',30);
 if (select count(*) from public.crew_sessions where id=session)<>1 then raise exception 'duplicate create'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.set_crew_session_rsvp(session,true);perform public.set_crew_session_rsvp(session,true);
 if (select count(*) from public.crew_session_rsvps where session_id=session)<>2 then raise exception 'duplicate rsvp'; end if;
 begin perform public.cancel_crew_session(session);raise exception 'non-owner cancelled';exception when others then if sqlerrm<>'session_owner_required' then raise;end if;end;
 perform public.set_crew_session_rsvp(session,false);
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 begin perform public.set_crew_session_rsvp(session,true);raise exception 'outsider joined';exception when others then if sqlerrm<>'not_a_member' then raise;end if;end;
 begin perform public.list_crew_sessions(crew);raise exception 'outsider read';exception when others then if sqlerrm<>'not_a_member' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',a::text,true);perform public.cancel_crew_session(session);
 begin perform public.set_crew_session_rsvp(session,true);raise exception 'cancelled session joined';exception when others then if sqlerrm<>'session_closed' then raise;end if;end;
 if has_table_privilege('authenticated','public.crew_sessions','INSERT') then raise exception 'direct writes allowed';end if;
end; $$;
