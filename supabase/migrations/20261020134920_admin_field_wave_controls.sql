-- All field metadata, member settlements and audit records commit together.
create table public.admin_field_wave_actions (
  id uuid primary key,
  actor_id uuid not null,
  field_id uuid not null,
  action text not null check(action in ('close-field','restart-field')),
  reason text not null,
  before_field jsonb not null,
  after_field jsonb not null,
  account_actions jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.admin_field_wave_actions enable row level security;
revoke all on public.admin_field_wave_actions from public,anon,authenticated;
grant all on public.admin_field_wave_actions to service_role;

create function public.admin_commit_field_wave(
  p_action_id uuid,p_actor_id uuid,p_field_id uuid,p_expected_updated_at timestamptz,p_target_id uuid,
  p_reason text,p_action text,p_now timestamptz,p_next_field jsonb,p_accounts jsonb
) returns void language plpgsql security invoker set search_path='' as $$
declare
  field public.week_fields;
  account jsonb;
  submitted uuid[];
  version timestamptz;
begin
  select * into field from public.week_fields where id=p_field_id for update;
  if not found or not(p_target_id=any(field.member_ids)) then raise exception 'field_not_found'; end if;
  if field.updated_at is distinct from p_expected_updated_at then raise exception 'field_changed_reload'; end if;
  if p_now <= field.wave_start or p_now >= field.week_end then raise exception 'field_not_active'; end if;
  if p_action not in ('close-field','restart-field') then raise exception 'invalid_action'; end if;
  select array_agg((r->>'userId')::uuid order by r->>'userId') into submitted from jsonb_array_elements(p_accounts) r;
  if submitted is distinct from array(select unnest(field.member_ids) order by 1) then raise exception 'field_members_changed'; end if;
  -- Stable lock order across all member accounts; normal account saves use these same rows.
  perform 1 from public.athlete_prefs where user_id=any(field.member_ids) order by user_id for update;
  for account in select value from jsonb_array_elements(p_accounts) loop
    select updated_at into version from public.athlete_prefs where user_id=(account->>'userId')::uuid;
    if not found or version is distinct from (account->>'updatedAt')::timestamptz then raise exception 'account_changed_reload_preview'; end if;
    perform public.admin_commit_round((account->>'actionId')::uuid,p_actor_id,(account->>'userId')::uuid,'close-round',
      p_reason || ' [field action ' || p_action_id::text || ']',(account->>'updatedAt')::timestamptz,account->'before',account->'after');
  end loop;
  update public.week_fields set week_end=p_now,updated_at=clock_timestamp() where id=p_field_id;
  if jsonb_array_length(p_next_field->'member_ids') > 0 then
    insert into public.week_fields(id,sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids)
      values((p_next_field->>'id')::uuid,field.sport,(p_next_field->>'wave_start')::timestamptz,(p_next_field->>'week_end')::timestamptz,
        field.capacity,field.crew_id,field.name,array(select value::uuid from jsonb_array_elements_text(p_next_field->'member_ids')),
        array(select jsonb_array_elements_text(p_next_field->'synthetic_ids')));
  end if;
  insert into public.admin_field_wave_actions(id,actor_id,field_id,action,reason,before_field,after_field,account_actions)
    values(p_action_id,p_actor_id,p_field_id,p_action,p_reason,to_jsonb(field),p_next_field,
      (select jsonb_agg(jsonb_build_object('userId',r->>'userId','actionId',r->>'actionId')) from jsonb_array_elements(p_accounts) r));
end;
$$;
revoke all on function public.admin_commit_field_wave(uuid,uuid,uuid,timestamptz,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_field_wave(uuid,uuid,uuid,timestamptz,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;
