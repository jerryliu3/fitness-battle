-- Persist user-selected Athlete Card Row-1 highlight ids (PBs, achievements, stats).
alter table public.athlete_prefs add column if not exists card_highlights text[];

alter function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) rename to save_compete_account_before_card_highlights;
revoke all on function public.save_compete_account_before_card_highlights(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_compete_account_before_card_highlights(jsonb,jsonb,jsonb,timestamptz) to service_role;

create function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  committed timestamptz;
  highlights text[];
begin
  if uid is null then raise exception 'authentication_required'; end if;
  committed := public.save_compete_account_before_card_highlights(p_state, p_activities, p_readiness, p_expected_updated_at);
  if p_state ? 'cardHighlights' and jsonb_typeof(p_state->'cardHighlights') = 'array' then
    select coalesce(array_agg(v order by ord), '{}'::text[])
      into highlights
      from (
        select btrim(val) as v, ord
        from jsonb_array_elements_text(p_state->'cardHighlights') with ordinality as t(val, ord)
        where btrim(val) <> ''
        limit 3
      ) s;
  else
    highlights := null;
  end if;
  update public.athlete_prefs set card_highlights = highlights where user_id = uid;
  return committed;
end; $$;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to service_role;
