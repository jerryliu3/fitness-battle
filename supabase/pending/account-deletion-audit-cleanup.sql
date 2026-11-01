-- Pending explicit approval for deletion of the target account's audit snapshots.
-- These snapshots contain that account's before/after personal state.
-- Retain audits about other athletes when their administrator deletes an account.
alter table public.admin_compete_actions alter column actor_id drop not null;
alter table public.admin_compete_actions drop constraint admin_compete_actions_actor_id_fkey;
alter table public.admin_compete_actions add constraint admin_compete_actions_actor_id_fkey
  foreign key(actor_id) references auth.users(id) on delete set null;
alter table public.admin_compete_actions drop constraint admin_compete_actions_target_id_fkey;
alter table public.admin_compete_actions add constraint admin_compete_actions_target_id_fkey
  foreign key(target_id) references auth.users(id) on delete cascade;
