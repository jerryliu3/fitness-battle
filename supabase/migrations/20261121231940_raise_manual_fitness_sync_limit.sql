create or replace function public.acquire_fitness_sync(p_user uuid, p_provider public.fitness_provider, p_automatic boolean, p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare r private.fitness_sync_limits; recent timestamptz[];
begin
 if auth.role() is distinct from 'service_role' then raise exception 'forbidden'; end if;
 insert into private.fitness_sync_limits(user_id,provider) values(p_user,p_provider) on conflict do nothing;
 select * into r from private.fitness_sync_limits where user_id=p_user and provider=p_provider for update;
 select coalesce(array_agg(t),'{}') into recent from unnest(r.manual_at) t where t > now()-interval '1 hour';
 if r.lease_until > now() then return false; end if;
 if p_automatic and r.last_started > now()-interval '1 hour' then return false; end if;
 if not p_automatic and cardinality(recent)>=10 then
   raise sqlstate 'PT429' using
     message = 'manual_sync_limit',
     detail = ceil(extract(epoch from ((select min(t) from unnest(recent) t) + interval '1 hour' - now())))::integer::text;
 end if;
 update private.fitness_sync_limits set manual_at=case when p_automatic then recent else array_append(recent,now()) end,
 last_started=now(), lease_until=now()+interval '5 minutes',lease=p_lease where user_id=p_user and provider=p_provider;
 return true;
end $$;
