-- Frozen weekly state is committed under the existing account version lock.
-- Live previews never write this column.
alter table public.athlete_prefs add column effort_accounts jsonb;
alter table public.period_results add column effort_reward numeric;
alter table public.period_results add column effort_change jsonb;
alter function public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz) rename to save_compete_account_before_effort_state;
create function public.save_compete_account_before_milestones(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare committed timestamptz; uid uuid := auth.uid(); r jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  committed := public.save_compete_account_before_effort_state(p_state,p_activities,p_readiness,p_expected_updated_at);
  if p_state ? 'effortAccounts' then
    update public.athlete_prefs set effort_accounts=p_state->'effortAccounts' where user_id=uid;
    for r in select value from jsonb_array_elements(coalesce(p_state->'periodResults','[]'::jsonb)) loop
      if r ? 'effortReward' then
        update public.period_results set effort_reward=(r->>'effortReward')::numeric, effort_change=r->'effortChange'
        where user_id=uid and sport=r->>'sport' and track=r->>'track' and period_start=(r->>'periodStart')::timestamptz;
      end if;
    end loop;
  end if;
  return committed;
end; $$;
revoke all on function public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz) to service_role;
revoke all on function public.save_compete_account_before_effort_state(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_compete_account_before_effort_state(jsonb,jsonb,jsonb,timestamptz) to service_role;

-- Admin settlement uses the same transaction boundary for the target account.
alter function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) rename to admin_commit_round_before_effort_state;
create function public.admin_commit_round(p_action_id uuid,p_actor_id uuid,p_target_id uuid,p_action text,p_reason text,p_expected_updated_at timestamptz,p_before jsonb,p_after jsonb)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare committed timestamptz; r jsonb;
begin
  committed:=public.admin_commit_round_before_effort_state(p_action_id,p_actor_id,p_target_id,p_action,p_reason,p_expected_updated_at,p_before,p_after);
  if p_after ? 'effortAccounts' then
    update public.athlete_prefs set effort_accounts=p_after->'effortAccounts' where user_id=p_target_id;
    for r in select value from jsonb_array_elements(coalesce(p_after->'periodResults','[]'::jsonb)) loop
      if r ? 'effortReward' then
        update public.period_results set effort_reward=(r->>'effortReward')::numeric, effort_change=r->'effortChange'
        where user_id=p_target_id and sport=r->>'sport' and track=r->>'track' and period_start=(r->>'periodStart')::timestamptz;
      end if;
    end loop;
  end if;
  return committed;
end; $$;
revoke all on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;
revoke all on function public.admin_commit_round_before_effort_state(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_round_before_effort_state(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;

-- Keep native-duration competition totals aligned with the shared scorer.
create or replace function private.week_field_scores(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric,
  effort double precision,
  verified_effort double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_rec public.week_fields;
begin
  select * into field_rec from public.week_fields where id = p_field_id;
  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce((field_rec.entry_ratings->p.id::text->>'open')::numeric, r.open_elo, 1000)::numeric,
    case
      when field_rec.sport = 'walking'
        then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::numeric
      else coalesce(sum(a.distance_m), 0)::numeric
    end,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce((field_rec.entry_ratings->p.id::text->>'verified')::numeric, r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
    case
      when field_rec.sport = 'strength' then coalesce(sum(a.moving_sec),0)::double precision
      when field_rec.sport = 'walking'
        then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::double precision
      else coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr)), 0)::double precision
    end,
    coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr))
      filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::double precision
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.avg_hr, activity.verified, activity.provenance
    from private.competition_activity_rows(field_rec.sport, field_rec.wave_start, field_rec.week_end, m.id) activity
    where field_rec.sport <> 'walking'
      and activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance not in ('demo', 'manual')
      and coalesce(activity.journal_only, false) = false
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo, field_rec.sport, field_rec.wave_start, field_rec.week_end
  order by p.id;
end;
$$;

