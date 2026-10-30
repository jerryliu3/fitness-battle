create table private.fitness_sync_limits (
 user_id uuid references auth.users(id) on delete cascade,
 provider public.fitness_provider not null,
 manual_at timestamptz[] not null default '{}',
 last_started timestamptz,
 lease_until timestamptz,
 lease uuid,
 primary key(user_id, provider)
);
revoke all on private.fitness_sync_limits from public, anon, authenticated;
create function public.acquire_fitness_sync(p_user uuid, p_provider public.fitness_provider, p_automatic boolean, p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r private.fitness_sync_limits; recent timestamptz[];
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 insert into private.fitness_sync_limits(user_id,provider) values(p_user,p_provider) on conflict do nothing;
 select * into r from private.fitness_sync_limits where user_id=p_user and provider=p_provider for update;
 select coalesce(array_agg(t),'{}') into recent from unnest(r.manual_at) t where t > now()-interval '1 hour';
 if r.lease_until > now() then return false; end if;
 if p_automatic and r.last_started > now()-interval '1 hour' then return false; end if;
 if not p_automatic and cardinality(recent)>=3 then return false; end if;
 update private.fitness_sync_limits set manual_at=case when p_automatic then recent else array_append(recent,now()) end,
 last_started=now(), lease_until=now()+interval '5 minutes',lease=p_lease where user_id=p_user and provider=p_provider;
 return true;
end $$;
create function public.release_fitness_sync(p_user uuid,p_provider public.fitness_provider,p_lease uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 update private.fitness_sync_limits set lease_until=null,lease=null where user_id=p_user and provider=p_provider and lease=p_lease;
end $$;
revoke all on function public.acquire_fitness_sync(uuid,public.fitness_provider,boolean,uuid) from public,anon,authenticated;
revoke all on function public.release_fitness_sync(uuid,public.fitness_provider,uuid) from public,anon,authenticated;
grant execute on function public.acquire_fitness_sync(uuid,public.fitness_provider,boolean,uuid) to service_role;
grant execute on function public.release_fitness_sync(uuid,public.fitness_provider,uuid) to service_role;
