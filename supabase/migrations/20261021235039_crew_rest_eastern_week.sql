-- Rest markers follow the same Eastern Mon–Mon calendar as competition.
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
    when p_rest then (date_trunc('week', now() at time zone 'America/New_York'))::date
    else null
  end
  where crew_id = p_crew_id and user_id = uid and status = 'active';
  if not found then
    raise exception 'not_a_member';
  end if;
end;
$$;

revoke all on function public.set_crew_rest(uuid, boolean) from public, anon;
grant execute on function public.set_crew_rest(uuid, boolean) to authenticated;
