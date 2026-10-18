-- Allow members to leave a crew, reassigning ownership if needed or deleting the crew if empty.

create or replace function public.leave_crew(p_crew_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  active_count integer;
  c_name text;
  leaver text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;

  select name into c_name from public.crews where id = p_crew_id;
  select display_name into leaver from public.profiles where id = uid;

  -- Remove the member from crew_members
  delete from public.crew_members
  where crew_id = p_crew_id and user_id = uid;

  -- Clear crew_id from wave_enrollments for this user
  update public.wave_enrollments
  set crew_id = null
  where user_id = uid and crew_id = p_crew_id;

  -- Remove athlete from crew_week_fields member_ids
  update public.crew_week_fields
  set member_ids = array_remove(member_ids, uid)
  where crew_id = p_crew_id;

  -- Count remaining active members
  select count(*) into active_count
  from public.crew_members
  where crew_id = p_crew_id and status = 'active';

  -- Check if this member created the crew
  select (created_by = uid) into is_owner
  from public.crews
  where id = p_crew_id;

  if is_owner and active_count > 0 then
    -- Reassign crew creator to another remaining member
    update public.crews
    set created_by = (
      select user_id
      from public.crew_members
      where crew_id = p_crew_id and status = 'active'
      limit 1
    )
    where id = p_crew_id;
  elsif active_count = 0 then
    -- No members left, delete crew (cascades to entries, cheers, week fields)
    delete from public.crews where id = p_crew_id;
  end if;

  -- Notify remaining creator if still active
  if active_count > 0 then
    insert into public.crew_notices (user_id, crew_id, kind, body)
    select created_by, id, 'member_left', coalesce(leaver, 'A member') || ' left ' || c_name || '.'
    from public.crews
    where id = p_crew_id;
  end if;

  return true;
end;
$$;

revoke all on function public.leave_crew(uuid) from public, anon;
grant execute on function public.leave_crew(uuid) to authenticated;
