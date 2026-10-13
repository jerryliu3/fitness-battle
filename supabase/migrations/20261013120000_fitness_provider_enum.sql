-- New tracker providers. Values are added here and used only in the next migration
-- so PostgreSQL can commit the enum change before those values are referenced.
alter type public.fitness_provider add value if not exists 'garmin';
alter type public.fitness_provider add value if not exists 'apple_health';
alter type public.fitness_provider add value if not exists 'google_health';
alter type public.fitness_provider add value if not exists 'whoop';
alter type public.fitness_provider add value if not exists 'oura';
