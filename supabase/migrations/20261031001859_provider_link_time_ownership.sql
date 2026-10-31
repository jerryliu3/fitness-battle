-- Ownership conflicts are rejected when tokens are stored. Retain the existing
-- single-owner lookup behavior for legacy duplicate mappings.
create or replace function public.user_id_for_fitness_athlete(p_provider public.fitness_provider, p_athlete_external_id text)
returns uuid language sql security definer set search_path = '' as $$
  select t.user_id from private.fitness_tokens t
  where t.provider = p_provider and t.athlete_external_id = p_athlete_external_id
  limit 1;
$$;
