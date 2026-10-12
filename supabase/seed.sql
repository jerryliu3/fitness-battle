insert into public.categories (id, slug, name, unit, description) values
  ('11111111-1111-4111-8111-111111111101', 'running', 'Running', 'meters', 'Distance covered on foot runs.'),
  ('11111111-1111-4111-8111-111111111102', 'cycling', 'Cycling', 'meters', 'Ride distance from your tracker.'),
  ('11111111-1111-4111-8111-111111111103', 'walking', 'Walking', 'meters', 'Walk and hike distance.'),
  ('11111111-1111-4111-8111-111111111104', 'strength', 'Strength', 'seconds', 'Session duration from strength workouts.')
on conflict (slug) do nothing;
