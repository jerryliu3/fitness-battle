-- Allow active crew members to configure crew sport, weekly tracking mode, and default targets.

create or replace function public.update_crew_settings(
  p_crew_id uuid,
  p_sport text,
  p_format text,
  p_target_sessions integer,
  p_journey_km numeric
)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  updated public.crews;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.crew_members
    where crew_id = p_crew_id
      and user_id = uid
      and status = 'active'
  ) then
    raise exception 'not_a_member';
  end if;
  if p_format not in ('volume', 'personal_target', 'cooperative') then
    raise exception 'invalid_format';
  end if;
  if trim(coalesce(p_sport, '')) not in ('running', 'cycling', 'walking', 'strength') then
    raise exception 'invalid_sport';
  end if;

  update public.crews
  set
    sport = trim(p_sport),
    format = p_format,
    target_sessions = least(14, greatest(1, coalesce(p_target_sessions, target_sessions))),
    journey_km = greatest(1, coalesce(p_journey_km, journey_km))
  where id = p_crew_id
  returning * into updated;

  if updated.id is null then
    raise exception 'crew_not_found';
  end if;

  return updated;
end;
$$;

revoke all on function public.update_crew_settings(uuid, text, text, integer, numeric) from public, anon;
grant execute on function public.update_crew_settings(uuid, text, text, integer, numeric) to authenticated;
