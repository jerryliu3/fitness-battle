-- A bounded roster read; synthetic-data accounts use the same membership authorization.
create function public.crew_member_effort_scores()
returns table (crew_id uuid, user_id uuid, open_elo numeric, verified_elo numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query
    select peer.crew_id, peer.user_id, rating.open_elo, rating.verified_elo
    from public.crew_members viewer
    join public.crew_members peer on peer.crew_id = viewer.crew_id and peer.status = 'active'
    join public.crews crew on crew.id = viewer.crew_id
    join public.sport_ratings rating on rating.user_id = peer.user_id and rating.sport = crew.sport
    where viewer.user_id = (select auth.uid()) and viewer.status = 'active';
end;
$$;
revoke all on function public.crew_member_effort_scores() from public, anon;
grant execute on function public.crew_member_effort_scores() to authenticated;
