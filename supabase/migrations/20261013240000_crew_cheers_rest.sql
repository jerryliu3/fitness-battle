-- Cheers and a planned rest week for an existing crew membership.

create or replace function public.cheer_entry(
  p_crew_id uuid,
  p_activity_id text,
  p_owner uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  actor text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if uid = p_owner then
    raise exception 'cannot_cheer_yourself';
  end if;
  if not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew_id and m.user_id = uid and m.status = 'active'
  ) then
    raise exception 'not_a_member';
  end if;
  insert into public.crew_cheers (crew_id, from_user, activity_id)
  values (p_crew_id, uid, p_activity_id)
  on conflict (crew_id, from_user, activity_id) do nothing;
  select display_name into actor from public.profiles where id = uid;
  insert into public.crew_notices (user_id, crew_id, kind, body)
  values (
    p_owner,
    p_crew_id,
    'cheer',
    coalesce(actor, 'Someone') || ' cheered a counted session.'
  );
end;
$$;

create or replace function public.set_crew_rest(p_crew_id uuid, p_rest boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  update public.crew_members
  set rest_week = case
    when p_rest then (date_trunc('week', (now() at time zone 'utc')) )::date
    else null
  end
  where crew_id = p_crew_id and user_id = uid and status = 'active';
  if not found then
    raise exception 'not_a_member';
  end if;
end;
$$;

revoke all on function public.cheer_entry(uuid, text, uuid) from public, anon;
revoke all on function public.set_crew_rest(uuid, boolean) from public, anon;
grant execute on function public.cheer_entry(uuid, text, uuid) to authenticated;
grant execute on function public.set_crew_rest(uuid, boolean) to authenticated;
