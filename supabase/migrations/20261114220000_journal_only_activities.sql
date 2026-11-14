-- Unmapped tracker workouts persist as journal-only strength sessions.

alter table public.activities
  add column if not exists journal_only boolean not null default false;

-- Exclude journal-only rows from field score activity joins (PR3 reader + filter).
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