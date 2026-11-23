-- Backfill legacy "Guest" / blank display names to "Anonymous Athlete".
update public.profiles
set display_name = 'Anonymous Athlete'
where btrim(coalesce(display_name, '')) = ''
   or lower(btrim(display_name)) = 'guest';

update public.crew_members
set display_name = 'Anonymous Athlete'
where btrim(coalesce(display_name, '')) = ''
   or lower(btrim(display_name)) = 'guest';
