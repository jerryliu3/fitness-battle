begin;
do $$ begin
 if to_regprocedure('private.field_activity_effort(text,numeric,numeric,numeric)') is not null then raise exception 'obsolete effort multiplier remains'; end if;
 if position('field_activity_effort' in pg_get_functiondef('private.week_field_scores(uuid)'::regprocedure))>0 then raise exception 'legacy effort computation remains'; end if;
 if has_function_privilege('authenticated','private.week_field_scores(uuid)','EXECUTE') then raise exception 'private scoring helper exposed'; end if;
end $$;
-- Exercise the function body without creating or modifying any account records.
select * from private.week_field_scores('00000000-0000-0000-0000-000000000000');
rollback;
