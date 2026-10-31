-- Record actual committed changes, never reconstruct old milestone timestamps.
create table public.effort_score_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('running','cycling','walking','strength')),
  track text not null check (track in ('open','verified')),
  occurred_at timestamptz not null default clock_timestamp(),
  score_before numeric not null,
  score_after numeric not null,
  check (score_before <> score_after)
);
create index effort_score_events_owner_time on public.effort_score_events(user_id, occurred_at, id);
alter table public.effort_score_events enable row level security;
create policy own_effort_score_events on public.effort_score_events for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.effort_score_events from public, anon, authenticated;
grant select on public.effort_score_events to authenticated;
grant select, insert on public.effort_score_events to service_role;
grant usage, select on sequence public.effort_score_events_id_seq to service_role;

-- Invoker inherits the existing authority of the rating writer. Athletes cannot
-- write ratings or events. No scoring logic or second client write path is added.
create function private.record_effort_score_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.open_elo is distinct from old.open_elo then
    insert into public.effort_score_events(user_id,sport,track,score_before,score_after)
      values(new.user_id,new.sport,'open',old.open_elo,new.open_elo);
  end if;
  if new.verified_elo is distinct from old.verified_elo then
    insert into public.effort_score_events(user_id,sport,track,score_before,score_after)
      values(new.user_id,new.sport,'verified',old.verified_elo,new.verified_elo);
  end if;
  return new;
end; $$;
revoke all on function private.record_effort_score_change() from public,anon,authenticated;
create trigger record_effort_score_change after update on public.sport_ratings
  for each row execute function private.record_effort_score_change();
