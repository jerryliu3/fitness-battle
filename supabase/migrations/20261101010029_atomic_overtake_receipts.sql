-- Server-owned baselines and receipts; presentation never writes lifetime totals.
create table private.compete_overtake_baselines (
 user_id uuid not null references auth.users(id) on delete cascade,
 baseline_key text not null,
 value text not null,
 primary key(user_id,baseline_key)
);
alter table private.compete_overtake_baselines enable row level security;
revoke all on private.compete_overtake_baselines from public,anon,authenticated;
grant select,insert,update,delete on private.compete_overtake_baselines to service_role;
create table public.overtake_receipts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_revision timestamptz not null,
 sport text not null check(sport in ('running','walking','cycling','strength')),
 count integer not null check(count>0),
 moment jsonb not null,
 occurred_at timestamptz not null default clock_timestamp(),
 unique(user_id,account_revision,sport)
);
alter table public.overtake_receipts enable row level security;
create policy own_overtake_receipts on public.overtake_receipts for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.overtake_receipts from public,anon,authenticated;
grant select on public.overtake_receipts to authenticated;
grant select,insert on public.overtake_receipts to service_role;
create function public.read_compete_overtake_baselines(p_user_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(baseline_key,value),'{}'::jsonb) from private.compete_overtake_baselines where user_id=p_user_id;
$$;
revoke all on function public.read_compete_overtake_baselines(uuid) from public,anon,authenticated;
grant execute on function public.read_compete_overtake_baselines(uuid) to service_role;
create function public.save_compete_account_with_overtakes(
 p_user_id uuid,p_state jsonb,p_activities jsonb,p_readiness jsonb,
 p_expected_updated_at timestamptz,p_expected_receipts bigint,p_computed_at timestamptz,
 p_baselines jsonb,p_moments jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare committed timestamptz; m jsonb; awarded integer:=0; total integer;
begin
 if current_user not in ('service_role','postgres') then raise exception 'server_required'; end if;
 -- Same account lock and revision check as the existing save. A competing writer
 -- invalidates the entire transaction, including receipts and lifetime changes.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 committed:=public.save_compete_account_server(p_user_id,p_state,p_activities,p_readiness,p_expected_updated_at,p_expected_receipts,p_computed_at);
 for m in select value from jsonb_array_elements(p_moments) loop
  if jsonb_array_length(m->'plan'->'overtakenIds')>0 then
   insert into public.overtake_receipts(user_id,account_revision,sport,count,moment)
    values(p_user_id,committed,m->>'sport',jsonb_array_length(m->'plan'->'overtakenIds'),m);
   awarded:=awarded+jsonb_array_length(m->'plan'->'overtakenIds');
  end if;
 end loop;
 update public.profiles set lifetime_overtakes=lifetime_overtakes+awarded where id=p_user_id returning lifetime_overtakes into total;
 insert into private.compete_overtake_baselines(user_id,baseline_key,value)
  select p_user_id,b->>'key',b->>'value' from jsonb_array_elements(p_baselines) b
  on conflict(user_id,baseline_key) do update set value=excluded.value;
 return jsonb_build_object('updatedAt',committed,'lifetimeOvertakes',total,'overtakes',awarded);
end; $$;
revoke all on function public.save_compete_account_with_overtakes(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_compete_account_with_overtakes(uuid,jsonb,jsonb,jsonb,timestamptz,bigint,timestamptz,jsonb,jsonb) to service_role;
create function private.guard_lifetime_overtakes() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user not in ('service_role','postgres') then
  if tg_op='INSERT' then
   if new.lifetime_overtakes<>0 then raise exception 'server_required'; end if;
  elsif new.lifetime_overtakes is distinct from old.lifetime_overtakes then raise exception 'server_required';
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.guard_lifetime_overtakes() from public,anon,authenticated;
create trigger guard_lifetime_overtakes before insert or update on public.profiles for each row execute function private.guard_lifetime_overtakes();
