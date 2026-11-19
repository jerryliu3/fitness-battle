-- Support Google and Apple OAuth user metadata keys (full_name, name) when
-- initializing public.profiles on auth.users insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Athlete'
  ), 80);

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
