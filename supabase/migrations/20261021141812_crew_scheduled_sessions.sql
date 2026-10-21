create table public.crew_sessions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  sport text not null check (sport in ('running','cycling','walking','strength')),
  starts_at timestamptz not null,
  duration_min integer not null check (duration_min between 15 and 240),
  time_zone text not null default 'America/New_York',
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index crew_sessions_upcoming on public.crew_sessions(crew_id,starts_at);
create index crew_sessions_creator on public.crew_sessions(created_by);
create table public.crew_session_rsvps (
  session_id uuid not null references public.crew_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(session_id,user_id)
);
create index crew_session_rsvps_user on public.crew_session_rsvps(user_id);
alter table public.crew_sessions enable row level security;
alter table public.crew_session_rsvps enable row level security;
create policy crew_sessions_read on public.crew_sessions for select to authenticated using(private.is_active_crew_member(crew_id));
create policy crew_rsvps_read on public.crew_session_rsvps for select to authenticated using(exists(select 1 from public.crew_sessions s where s.id=session_id and private.is_active_crew_member(s.crew_id)));
grant select on public.crew_sessions,public.crew_session_rsvps to authenticated;
revoke insert,update,delete on public.crew_sessions,public.crew_session_rsvps from anon,authenticated;
grant all on public.crew_sessions,public.crew_session_rsvps to service_role;

create function public.create_crew_session(p_id uuid,p_crew_id uuid,p_title text,p_starts_at timestamptz,p_duration_min integer,p_time_zone text default 'America/New_York') returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); prior public.crew_sessions;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_crew_id::text,47));
  select * into prior from public.crew_sessions where id=p_id;
  if found then
    if prior.created_by=uid and prior.crew_id=p_crew_id then return prior.id; end if;
    raise exception 'invalid_session';
  end if;
  if p_title is null or length(trim(p_title)) not between 1 and 80 or p_starts_at is null or p_starts_at<=statement_timestamp() or p_starts_at>statement_timestamp()+interval '180 days'
    or p_duration_min is null or p_duration_min not between 15 and 240 or p_time_zone is null or not exists(select 1 from pg_timezone_names where name=p_time_zone) then raise exception 'invalid_session'; end if;
  if (select count(*) from public.crew_sessions where crew_id=p_crew_id and cancelled_at is null and starts_at>statement_timestamp())>=20 then raise exception 'too_many_sessions'; end if;
  insert into public.crew_sessions(id,crew_id,created_by,title,sport,starts_at,duration_min,time_zone)
    select p_id,p_crew_id,uid,trim(p_title),sport,p_starts_at,p_duration_min,p_time_zone from public.crews where id=p_crew_id;
  insert into public.crew_session_rsvps(session_id,user_id) values(p_id,uid);
  return p_id;
end; $$;
create function public.set_crew_session_rsvp(p_session_id uuid,p_join boolean) returns void
language plpgsql security definer set search_path='' as $$
declare s public.crew_sessions; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into s from public.crew_sessions where id=p_session_id for update;
  if not found then raise exception 'session_closed'; end if;
  if not private.is_active_crew_member(s.crew_id) then raise exception 'not_a_member'; end if;
  if s.cancelled_at is not null or s.starts_at<=statement_timestamp() then raise exception 'session_closed'; end if;
  if p_join then insert into public.crew_session_rsvps(session_id,user_id) values(s.id,uid) on conflict do nothing;
  else delete from public.crew_session_rsvps where session_id=s.id and user_id=uid; end if;
end; $$;
create function public.cancel_crew_session(p_session_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.crew_sessions; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into s from public.crew_sessions where id=p_session_id for update;
  if not found then raise exception 'session_closed'; end if;
  if not private.is_active_crew_member(s.crew_id) then raise exception 'not_a_member'; end if;
  if s.created_by<>uid then raise exception 'session_owner_required'; end if;
  if s.starts_at<=statement_timestamp() then raise exception 'session_closed'; end if;
  update public.crew_sessions set cancelled_at=coalesce(cancelled_at,statement_timestamp()) where id=s.id;
end; $$;
create function public.list_crew_sessions(p_crew_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name) order by r.created_at,m.user_id)
    from public.crew_session_rsvps r join public.crew_members m on m.user_id=r.user_id and m.crew_id=s.crew_id and m.status='active' where r.session_id=s.id),'[]'::jsonb)) order by s.starts_at,s.id)
    from (select * from public.crew_sessions where crew_id=p_crew_id and starts_at+duration_min*interval '1 minute'>statement_timestamp() order by starts_at,id limit 20) s),'[]'::jsonb);
end; $$;
revoke all on function public.create_crew_session(uuid,uuid,text,timestamptz,integer,text),public.set_crew_session_rsvp(uuid,boolean),public.cancel_crew_session(uuid),public.list_crew_sessions(uuid) from public,anon;
grant execute on function public.create_crew_session(uuid,uuid,text,timestamptz,integer,text),public.set_crew_session_rsvp(uuid,boolean),public.cancel_crew_session(uuid),public.list_crew_sessions(uuid) to authenticated;
