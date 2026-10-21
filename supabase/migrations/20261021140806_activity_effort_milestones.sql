-- Durable activity-growth receipts, independent of the bounded UI result history.
create table public.effort_milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('running','cycling','walking','strength')),
  track text not null check (track in ('open','verified')),
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  step numeric not null check (step > 0),
  earned integer not null check (earned >= 0),
  primary key(user_id,sport,track,period_start)
);
alter table public.effort_milestones enable row level security;
create policy own_effort_receipts on public.effort_milestones for select to authenticated using (user_id=(select auth.uid()));
grant select on public.effort_milestones to authenticated;
revoke insert,update,delete on public.effort_milestones from anon,authenticated;
grant all on public.effort_milestones to service_role;

-- Also protects legacy clients and admin settlement from decreasing a sport score.
create function private.hold_sport_score() returns trigger language plpgsql set search_path='' as $$
begin
  new.open_elo := greatest(old.open_elo,new.open_elo);
  new.verified_elo := greatest(old.verified_elo,new.verified_elo);
  return new;
end; $$;
create trigger sport_score_only_grows before update on public.sport_ratings for each row execute function private.hold_sport_score();

create function private.store_effort_receipts(p_user uuid,p_state jsonb) returns void
language plpgsql set search_path='' as $$
declare r jsonb; prior public.effort_milestones; volume numeric; base numeric; price numeric;
begin
  for r in select value from jsonb_array_elements(coalesce(p_state->'effortMilestones','[]'::jsonb)) loop
    select * into prior from public.effort_milestones where user_id=p_user and sport=r->>'sport' and track=r->>'track' and period_start=(r->>'periodStart')::timestamptz;
    if found then
      if (r->>'step')::numeric <> prior.step or (r->>'periodEnd')::timestamptz <> prior.period_end or (r->>'earned')::integer < prior.earned then
        raise exception 'milestone_receipt_changed';
      end if;
      if (r->>'earned')::integer = prior.earned then continue; end if;
    elsif not exists(select 1 from jsonb_array_elements(coalesce(p_state->'enrollments','[]'::jsonb)) e where e->>'sport'=r->>'sport' and (e->>'waveStart')::timestamptz=(r->>'periodStart')::timestamptz)
      and not exists(select 1 from jsonb_array_elements(coalesce(p_state->'periodResults','[]'::jsonb)) e where e->>'sport'=r->>'sport' and (e->>'periodStart')::timestamptz=(r->>'periodStart')::timestamptz) then
      raise exception 'milestone_sport_not_active';
    end if;
    base := case r->>'sport' when 'cycling' then 8046.72 when 'strength' then 1800 else 1609.344 end;
    price := (r->>'step')::numeric/base;
    if price not in (1,1.5,2,2.5,3,4,5) or (r->>'sport'='strength' and r->>'track'='verified') then raise exception 'invalid_milestone_step'; end if;
    select coalesce(sum(case when r->>'sport'='strength' then a.moving_sec else a.distance_m end),0) into volume
      from public.activities a where a.user_id=p_user and a.sport=r->>'sport'
      and a.started_at >= (r->>'periodStart')::timestamptz and a.started_at < (r->>'periodEnd')::timestamptz and a.started_at <= statement_timestamp()
      and a.disposition='counted' and a.provenance<>'demo' and coalesce(a.source_label,a.provider::text)<>'history'
      and coalesce(a.compete_key,'') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and (r->>'track'='open' or (a.verified and a.provenance='recorded' and a.sport<>'strength'));
    if (r->>'earned')::integer > greatest(coalesce(prior.earned,0),floor(volume/(r->>'step')::numeric)) then raise exception 'milestone_volume_mismatch'; end if;
    insert into public.effort_milestones values(p_user,r->>'sport',r->>'track',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,(r->>'step')::numeric,(r->>'earned')::integer)
      on conflict(user_id,sport,track,period_start) do update set earned=greatest(public.effort_milestones.earned,excluded.earned);
  end loop;
end; $$;
revoke all on function private.store_effort_receipts(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.store_effort_receipts(uuid,jsonb) to service_role;

alter function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) rename to save_compete_account_before_milestones;
revoke all on function public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
create function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare committed timestamptz; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  committed := public.save_compete_account_before_milestones(p_state,p_activities,p_readiness,p_expected_updated_at);
  -- The legacy transaction already holds the account advisory and revision locks.
  perform private.store_effort_receipts(uid,p_state);
  return committed;
end; $$;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to authenticated;

alter function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) rename to admin_commit_round_before_milestones;
create function public.admin_commit_round(p_action_id uuid,p_actor_id uuid,p_target_id uuid,p_action text,p_reason text,p_expected_updated_at timestamptz,p_before jsonb,p_after jsonb)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare committed timestamptz;
begin
  committed := public.admin_commit_round_before_milestones(p_action_id,p_actor_id,p_target_id,p_action,p_reason,p_expected_updated_at,p_before,p_after);
  perform private.store_effort_receipts(p_target_id,p_after);
  return committed;
end; $$;
revoke all on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;
