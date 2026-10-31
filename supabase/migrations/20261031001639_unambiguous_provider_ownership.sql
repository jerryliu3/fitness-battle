-- Preserve existing duplicate links for explicit owner resolution. Never route
-- deliveries arbitrarily when a provider account belongs to multiple app users.
create or replace function public.user_id_for_fitness_athlete(p_provider public.fitness_provider, p_athlete_external_id text)
returns uuid language sql security definer set search_path = '' as $$
  select case when count(*) = 1 then (array_agg(t.user_id))[1] else null end
  from private.fitness_tokens t
  where t.provider = p_provider and t.athlete_external_id = p_athlete_external_id;
$$;

create or replace function public.store_fitness_tokens(
  p_user_id uuid,
  p_provider public.fitness_provider,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_athlete_external_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  if p_athlete_external_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_provider::text || ':' || p_athlete_external_id, 0));
    if exists (select 1 from private.fitness_tokens t where t.provider = p_provider and t.athlete_external_id = p_athlete_external_id and t.user_id <> p_user_id) then
      raise exception using errcode = '23505', message = 'provider_account_already_linked';
    end if;
  end if;

  insert into private.fitness_tokens (
    user_id, provider, access_token, refresh_token, expires_at, athlete_external_id, updated_at
  )
  values (
    p_user_id, p_provider, p_access_token, p_refresh_token, p_expires_at, p_athlete_external_id, now()
  )
  on conflict (user_id, provider) do update
  set
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    expires_at = excluded.expires_at,
    athlete_external_id = excluded.athlete_external_id,
    updated_at = now();
end;
$$;

