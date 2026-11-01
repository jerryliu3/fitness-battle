-- Preserve shared Crews and battles while allowing their creator to delete their account.
alter table public.crews alter column created_by drop not null;
alter table public.crews drop constraint crews_created_by_fkey;
alter table public.crews add constraint crews_created_by_fkey foreign key(created_by) references public.profiles(id) on delete set null;
alter table public.battles alter column created_by drop not null;
alter table public.battles drop constraint battles_created_by_fkey;
alter table public.battles add constraint battles_created_by_fkey foreign key(created_by) references public.profiles(id) on delete set null;
