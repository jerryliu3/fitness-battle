-- Lifetime overtakes counter on profiles (increment on overtake events in a future change).
alter table public.profiles
  add column if not exists lifetime_overtakes integer not null default 0;

comment on column public.profiles.lifetime_overtakes is
  'Total field overtakes recorded for this athlete; incremented server-side when a pass is detected.';

-- Invite codes may be seeded uppercase (e.g. WEEKLY); match case-insensitively.
create or replace function public.join_crew(p_code text)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found public.crews;
  members integer;
  joiner text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  select * into found
  from public.crews
  where lower(invite_code) = lower(trim(p_code));
  if found.id is null then
    raise exception 'invite_not_found';
  end if;
  if exists (
    select 1 from public.crew_members m
    where m.crew_id = found.id and m.user_id = uid and m.status = 'active'
  ) then
    return found;
  end if;
  select count(*) into members
  from public.crew_members m
  where m.crew_id = found.id and m.status = 'active';
  if members >= 8 then
    raise exception 'crew_full';
  end if;
  select display_name into joiner from public.profiles where id = uid;
  insert into public.crew_members (crew_id, user_id, display_name, status)
  values (found.id, uid, coalesce(joiner, 'Athlete'), 'active');
  insert into public.crew_notices (user_id, crew_id, kind, body)
  values (
    found.created_by,
    found.id,
    'invite_accepted',
    coalesce(joiner, 'Someone') || ' joined ' || found.name || '.'
  );
  return found;
end;
$$;
