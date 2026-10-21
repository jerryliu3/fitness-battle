-- Integration hardening; all earlier migration history remains immutable.

create or replace function public.set_crew_session_rsvp(p_session_id uuid,p_join boolean) returns void
language plpgsql security definer set search_path='' as $$
declare s public.crew_sessions; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if p_join is null then raise exception 'invalid_session'; end if;
  select * into s from public.crew_sessions where id=p_session_id for update;
  if not found then raise exception 'session_closed'; end if;
  if not private.is_active_crew_member(s.crew_id) then raise exception 'not_a_member'; end if;
  if s.cancelled_at is not null or s.starts_at<=statement_timestamp() then raise exception 'session_closed'; end if;
  if p_join then insert into public.crew_session_rsvps(session_id,user_id) values(s.id,uid) on conflict do nothing;
  else delete from public.crew_session_rsvps where session_id=s.id and user_id=uid; end if;
end; $$;

create or replace function public.list_crew_sessions(p_crew_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'display_name',m.display_name) order by r.created_at,m.user_id)
    from public.crew_session_rsvps r join public.crew_members m on m.user_id=r.user_id and m.crew_id=s.crew_id and m.status='active' where r.session_id=s.id),'[]'::jsonb)) order by s.starts_at,s.id)
    from (select * from public.crew_sessions where crew_id=p_crew_id and starts_at+duration_min*interval '1 minute'>statement_timestamp() order by (cancelled_at is not null),starts_at,id limit 20) s),'[]'::jsonb);
end; $$;

create or replace function public.weekly_field_social(p_sport text,p_start timestamptz,p_end timestamptz,p_track text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.week_fields; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required';end if;
  if not exists(select 1 from public.period_results where user_id=uid and sport=p_sport and period_start=p_start and period_end=p_end and track=p_track) then raise exception 'result_not_settled';end if;
  select * into f from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end and week_end<=statement_timestamp() and uid=any(member_ids) order by created_at desc limit 1;
  if not found then return jsonb_build_object('fieldId',null,'peers','[]'::jsonb);end if;
  return jsonb_build_object('fieldId',f.id,'receivedCongrats',(select count(*) from public.weekly_field_choices where field_id=f.id and recipient_id=uid and track=p_track and congrats),'peers',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.display_name,'place',r.place,'fieldSize',r.field_size,'distanceM',r.distance_m,'movingSec',r.moving_sec,
    'canRepeat',f.week_end+interval '21 days'>statement_timestamp() and c.attempted_wave is null,'congrats',coalesce(c.congrats,false),'repeat',coalesce(c.repeat,false),'mutual',coalesce(c.repeat and reverse.repeat,false),
    'status',case when coalesce(c.repeat and reverse.repeat,false) and exists(select 1 from public.week_fields future where future.sport=f.sport and future.wave_start>=f.week_end and uid=any(future.member_ids) and p.id=any(future.member_ids)) then 'paired'
      when c.repeat and f.week_end+interval '21 days'<=statement_timestamp() then 'expired' when c.repeat and reverse.repeat and c.attempted_wave is not null and exists(select 1 from public.week_fields x where x.sport=f.sport and x.wave_start=c.attempted_wave and uid=any(x.member_ids)) and exists(select 1 from public.week_fields x where x.sport=f.sport and x.wave_start=c.attempted_wave and p.id=any(x.member_ids)) then 'unpaired' when c.repeat and reverse.repeat then 'mutual' when c.repeat then 'saved' else 'off' end
    ) order by r.place,p.id)
    from unnest(f.member_ids) m(id) join public.profiles p on p.id=m.id
    join public.period_results r on r.user_id=m.id and r.sport=f.sport and r.period_start=f.wave_start and r.period_end=f.week_end and r.track=p_track
    left join public.weekly_field_choices c on c.field_id=f.id and c.actor_id=uid and c.recipient_id=m.id and c.track=p_track
    left join public.weekly_field_choices reverse on reverse.field_id=f.id and reverse.actor_id=m.id and reverse.recipient_id=uid and reverse.track=p_track
    where m.id<>uid),'[]'::jsonb));
end; $$;

create or replace function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare committed timestamptz; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  committed := public.save_compete_account_before_milestones(p_state,p_activities,p_readiness,p_expected_updated_at);
  -- The legacy transaction already holds the account advisory and revision locks.
  if exists(select 1 from public.effort_milestones prior where prior.user_id=uid and prior.earned>0
    and (exists(select 1 from jsonb_array_elements(coalesce(p_state->'enrollments','[]'::jsonb)) e where e->>'sport'=prior.sport and (e->>'waveStart')::timestamptz=prior.period_start)
      or exists(select 1 from jsonb_array_elements(coalesce(p_state->'periodResults','[]'::jsonb)) e where e->>'sport'=prior.sport and (e->>'periodStart')::timestamptz=prior.period_start))
    and not exists(select 1 from jsonb_array_elements(coalesce(p_state->'effortMilestones','[]'::jsonb)) r where r->>'sport'=prior.sport and r->>'track'=prior.track and (r->>'periodStart')::timestamptz=prior.period_start)) then
    raise exception 'account_changed_reload';
  end if;
  perform private.store_effort_receipts(uid,p_state);
  return committed;
end; $$;
