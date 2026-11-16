-- Run against a disposable migrated database. No account data is changed.
begin;
do $$
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='athlete_prefs' and column_name='effort_accounts') then raise exception 'weekly effort state missing'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='period_results' and column_name='effort_reward') then raise exception 'event reward receipt missing'; end if;
 if has_function_privilege('authenticated','public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz)','EXECUTE') then raise exception 'client can forge frozen baseline'; end if;
 if has_function_privilege('anon','public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb)','EXECUTE') then raise exception 'public admin settlement'; end if;
 if not has_function_privilege('service_role','public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz)','EXECUTE') then raise exception 'authority cannot save baseline'; end if;
 if has_table_privilege('authenticated','public.sport_ratings','UPDATE') then raise exception 'client can forge finalized score'; end if;
 if position('save_compete_account_before_effort_state' in pg_get_functiondef('public.save_compete_account_before_milestones(jsonb,jsonb,jsonb,timestamptz)'::regprocedure))=0 then raise exception 'account version transaction bypassed'; end if;
end $$;
rollback;
