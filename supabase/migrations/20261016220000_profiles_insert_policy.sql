-- Add insert policy for public.profiles so authenticated users can insert their own profile row if missing.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
