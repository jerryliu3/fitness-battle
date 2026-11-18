-- Weekly Effort Score superseded milestone awards. The old wrapper still
-- rejects accounts whose durable legacy receipts are absent from today's
-- document, even after the versioned account write succeeds. Retain historical
-- receipts, but stop requiring or rewriting them during account saves.
create or replace function public.save_compete_account_before_daily_waves(
  p_state jsonb, p_activities jsonb, p_readiness jsonb,
  p_expected_updated_at timestamptz
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  -- The current writer retains the account lock, revision check and frozen
  -- effort state. Outer wrappers still enforce wave and server authority.
  return public.save_compete_account_before_milestones(
    p_state, p_activities, p_readiness, p_expected_updated_at
  );
end;
$$;
revoke all on function public.save_compete_account_before_daily_waves(jsonb,jsonb,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.save_compete_account_before_daily_waves(jsonb,jsonb,jsonb,timestamptz) to service_role;
