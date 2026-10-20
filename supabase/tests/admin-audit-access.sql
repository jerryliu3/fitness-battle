-- Run after the audit migration, inside a rollback-only test transaction.
do $$ begin
  if has_table_privilege('authenticated', 'public.admin_compete_actions', 'SELECT')
    or has_table_privilege('anon', 'public.admin_compete_actions', 'SELECT') then
    raise exception 'Audit snapshots are exposed to a client role';
  end if;
  if not has_table_privilege('service_role', 'public.admin_compete_actions', 'INSERT') then
    raise exception 'Service role cannot write audit records';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.admin_compete_actions'::regclass) then
    raise exception 'Audit table RLS is disabled';
  end if;
end $$;
