-- Directed, private choices attached to a real completed field and score track.
create table public.weekly_field_choices (
  field_id uuid not null references public.week_fields(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  track text not null check(track in ('open','verified')),
  congrats boolean not null default false,
  repeat boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempted_wave timestamptz,
  primary key(field_id,actor_id,recipient_id,track),
  check(actor_id<>recipient_id)
);
create index weekly_choices_recipient on public.weekly_field_choices(recipient_id,actor_id) where repeat;
alter table public.weekly_field_choices enable row level security;
create policy own_weekly_choices on public.weekly_field_choices for select to authenticated using(actor_id=(select auth.uid()));
grant select on public.weekly_field_choices to authenticated;
revoke insert,update,delete on public.weekly_field_choices from anon,authenticated;
grant all on public.weekly_field_choices to service_role;

create function public.set_weekly_field_choice(p_field_id uuid,p_recipient_id uuid,p_track text,p_kind text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare f public.week_fields; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required';end if;
  select * into f from public.week_fields where id=p_field_id;
  if not found or f.week_end>statement_timestamp() or not(uid=any(f.member_ids)) or not(p_recipient_id=any(f.member_ids)) or uid=p_recipient_id then raise exception 'not_in_settled_field';end if;
  if p_kind is null or p_kind not in ('congrats','repeat') or p_track is null or p_track not in ('open','verified') or p_enabled is null then raise exception 'invalid_choice';end if;
  if not exists(select 1 from public.period_results where user_id=uid and sport=f.sport and period_start=f.wave_start and period_end=f.week_end and track=p_track)
    or not exists(select 1 from public.period_results where user_id=p_recipient_id and sport=f.sport and period_start=f.wave_start and period_end=f.week_end and track=p_track) then raise exception 'result_not_settled';end if;
  if p_kind='repeat' and p_enabled and statement_timestamp()>=f.week_end+interval '21 days' then raise exception 'repeat_expired';end if;
  insert into public.weekly_field_choices(field_id,actor_id,recipient_id,track,congrats,repeat,expires_at)
    values(f.id,uid,p_recipient_id,p_track,p_kind='congrats' and p_enabled,p_kind='repeat' and p_enabled,f.week_end+interval '21 days')
    on conflict(field_id,actor_id,recipient_id,track) do update set
      congrats=case when p_kind='congrats' then p_enabled else public.weekly_field_choices.congrats end,
      repeat=case when p_kind='repeat' then p_enabled else public.weekly_field_choices.repeat end;
end; $$;

create function public.weekly_field_social(p_sport text,p_start timestamptz,p_end timestamptz,p_track text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare f public.week_fields; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required';end if;
  if not exists(select 1 from public.period_results where user_id=uid and sport=p_sport and period_start=p_start and period_end=p_end and track=p_track) then raise exception 'result_not_settled';end if;
  select * into f from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end and week_end<=statement_timestamp() and uid=any(member_ids) order by created_at desc limit 1;
  if not found then return jsonb_build_object('fieldId',null,'peers','[]'::jsonb);end if;
  return jsonb_build_object('fieldId',f.id,'peers',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.display_name,'place',r.place,'fieldSize',r.field_size,'distanceM',r.distance_m,'movingSec',r.moving_sec,
    'congrats',coalesce(c.congrats,false),'repeat',coalesce(c.repeat,false),'mutual',coalesce(c.repeat and reverse.repeat,false),
    'status',case when coalesce(c.repeat and reverse.repeat,false) and exists(select 1 from public.week_fields future where future.sport=f.sport and future.wave_start>=f.week_end and uid=any(future.member_ids) and p.id=any(future.member_ids)) then 'paired'
      when f.week_end+interval '21 days'<=statement_timestamp() then 'expired' when c.repeat and reverse.repeat and c.attempted_wave is not null and exists(select 1 from public.week_fields x where x.sport=f.sport and x.wave_start=c.attempted_wave and uid=any(x.member_ids)) and exists(select 1 from public.week_fields x where x.sport=f.sport and x.wave_start=c.attempted_wave and p.id=any(x.member_ids)) then 'unpaired' when c.repeat and reverse.repeat then 'mutual' when c.repeat then 'saved' else 'off' end
    ) order by r.place,p.id)
    from unnest(f.member_ids) m(id) join public.profiles p on p.id=m.id
    join public.period_results r on r.user_id=m.id and r.sport=f.sport and r.period_start=f.wave_start and r.period_end=f.week_end and r.track=p_track
    left join public.weekly_field_choices c on c.field_id=f.id and c.actor_id=uid and c.recipient_id=m.id and c.track=p_track
    left join public.weekly_field_choices reverse on reverse.field_id=f.id and reverse.actor_id=m.id and reverse.recipient_id=uid and reverse.track=p_track
    where m.id<>uid),'[]'::jsonb));
end; $$;
revoke all on function public.set_weekly_field_choice(uuid,uuid,text,text,boolean),public.weekly_field_social(text,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.set_weekly_field_choice(uuid,uuid,text,text,boolean),public.weekly_field_social(text,timestamptz,timestamptz,text) to authenticated;

-- Prioritize compatible mutual choices only when seating a NEW solo participant.
-- Existing seats and all Crew seating remain immutable under the original rules.
alter function public.seat_athlete_week_field(text,timestamptz,timestamptz,integer,uuid,text,text[]) rename to seat_athlete_week_field_before_repeat;
revoke all on function public.seat_athlete_week_field_before_repeat(text,timestamptz,timestamptz,integer,uuid,text,text[]) from public,anon,authenticated;
create function public.seat_athlete_week_field(p_sport text,p_wave_start timestamptz,p_week_end timestamptz,p_capacity integer default 8,p_crew_id uuid default null,p_crew_name text default null,p_synthetic_ids text[] default '{}') returns public.week_fields
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); f public.week_fields; new_seat boolean:=false;
begin
  if uid is null then raise exception 'authentication_required';end if;
  if p_sport is null or p_sport not in ('running','cycling','walking','strength') then raise exception 'invalid_sport';end if;
  if p_wave_start is null or p_week_end is null or p_week_end<=p_wave_start then raise exception 'invalid_bounds';end if;
  if p_capacity is null or p_capacity<2 or p_capacity>16 then raise exception 'invalid_capacity';end if;
  if p_crew_id is null then
    perform pg_advisory_xact_lock(hashtextextended(p_sport||p_wave_start::text||p_week_end::text,73));
    if not exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_wave_start and week_end=p_week_end and week_end>statement_timestamp() and uid=any(member_ids)) then
      new_seat:=true;
      select future.* into f from public.week_fields future
        where future.sport=p_sport and future.wave_start=p_wave_start and future.week_end=p_week_end and future.week_end>statement_timestamp()
        and future.crew_id is null and cardinality(future.member_ids)<future.capacity
        and exists(select 1 from public.weekly_field_choices c
          join public.weekly_field_choices reverse on reverse.field_id=c.field_id and reverse.actor_id=c.recipient_id and reverse.recipient_id=c.actor_id and reverse.track=c.track and reverse.repeat
          join public.week_fields source on source.id=c.field_id and source.sport=p_sport and source.week_end<=p_wave_start
          join public.sport_ratings mine on mine.user_id=uid and mine.sport=p_sport and mine.opted_in
          join public.sport_ratings theirs on theirs.user_id=c.recipient_id and theirs.sport=p_sport and theirs.opted_in
          where c.actor_id=uid and c.repeat and c.expires_at>statement_timestamp() and reverse.expires_at>statement_timestamp()
          and p_wave_start<c.expires_at and c.recipient_id=any(future.member_ids)
          and (c.attempted_wave is null or c.attempted_wave=p_wave_start) and (reverse.attempted_wave is null or reverse.attempted_wave=p_wave_start)
          and abs(case when c.track='verified' then mine.verified_elo-theirs.verified_elo else mine.open_elo-theirs.open_elo end)<=400)
        order by cardinality(future.member_ids) desc,future.created_at,future.id limit 1 for update;
      if found then
        update public.week_fields set member_ids=array_append(member_ids,uid),synthetic_ids=case when cardinality(synthetic_ids)>0 then synthetic_ids[1:cardinality(synthetic_ids)-1] else synthetic_ids end,updated_at=statement_timestamp() where id=f.id returning * into f;
      end if;
    end if;
  end if;
  if f.id is null then
    f:=public.seat_athlete_week_field_before_repeat(p_sport,p_wave_start,p_week_end,p_capacity,p_crew_id,p_crew_name,p_synthetic_ids);
  end if;
  if new_seat then
    update public.weekly_field_choices c set attempted_wave=p_wave_start
      where (c.actor_id=uid or c.recipient_id=uid) and c.repeat and c.attempted_wave is null and c.expires_at>statement_timestamp()
      and exists(select 1 from public.week_fields source where source.id=c.field_id and source.sport=p_sport and source.week_end<=p_wave_start)
      and exists(select 1 from public.weekly_field_choices reverse where reverse.field_id=c.field_id and reverse.actor_id=c.recipient_id and reverse.recipient_id=c.actor_id and reverse.track=c.track and reverse.repeat and (reverse.attempted_wave is null or reverse.attempted_wave=p_wave_start));
  end if;
  return f;
end; $$;
revoke all on function public.seat_athlete_week_field(text,timestamptz,timestamptz,integer,uuid,text,text[]) from public,anon;
grant execute on function public.seat_athlete_week_field(text,timestamptz,timestamptz,integer,uuid,text,text[]) to authenticated;
