-- One history import per account, independent of tracker disconnection.
create table public.fitness_history_imports (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider public.fitness_provider,
  days integer check (days between 1 and 90),
  started_at timestamptz,
  completed_at timestamptz,
  lease uuid,
  lease_until timestamptz
);
alter table public.fitness_history_imports enable row level security;
revoke all on public.fitness_history_imports from anon, authenticated;
grant select on public.fitness_history_imports to authenticated;
grant all on public.fitness_history_imports to service_role;
create policy fitness_history_imports_select on public.fitness_history_imports
  for select to authenticated using (user_id = (select auth.uid()));

-- Preserve the existing account-wide one-time calibration lock.
insert into public.fitness_history_imports(user_id, days, completed_at)
select user_id, 90, now() from public.athlete_prefs where calibrated;

create function public.claim_fitness_history(p_user uuid, p_provider public.fitness_provider, p_days integer, p_lease uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r public.fitness_history_imports;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  if p_days is null or p_days not between 1 and 90 or p_lease is null
    or p_provider is null or p_provider not in ('apple_health', 'google_health', 'strava', 'whoop', 'oura') then
    raise exception 'invalid_history_import';
  end if;
  insert into public.fitness_history_imports(user_id) values(p_user) on conflict do nothing;
  select * into r from public.fitness_history_imports where user_id = p_user for update;
  if r.completed_at is not null or r.lease_until > now()
    or exists(select 1 from public.athlete_prefs where user_id = p_user and calibrated) then return false; end if;
  update public.fitness_history_imports set provider = p_provider, days = p_days,
    started_at = now(), lease = p_lease, lease_until = now() + interval '30 minutes'
    where user_id = p_user;
  return true;
end $$;

create function public.finish_fitness_history(p_user uuid, p_lease uuid, p_success boolean)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
  update public.fitness_history_imports set
    completed_at = case when p_success then now() else null end,
    lease = null, lease_until = null
    where user_id = p_user and lease = p_lease and completed_at is null;
  return found;
end $$;
revoke all on function public.claim_fitness_history(uuid, public.fitness_provider, integer, uuid) from public, anon, authenticated;
revoke all on function public.finish_fitness_history(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_fitness_history(uuid, public.fitness_provider, integer, uuid) to service_role;
grant execute on function public.finish_fitness_history(uuid, uuid, boolean) to service_role;
