# Focus implementation notes

The actual web and Expo tab screens now use the chosen Focus direction with Trail's crew composition and top-of-Athlete Elo/benchmarks. This is separate from `/design/structure`.

- Visit `/today`, `/arena`, `/field`, `/you` on web; the same tab route IDs remain in Expo. Labels are Home, Arena, Crew, Athlete.
- Both arenas retain a vertical 2D lane view and real 3D view. The shared presentation window is fixed around the athlete, with zoom, pan, centering, fit-field, and a non-ranked ghost.
- Web 3D remains Three.js. Mobile embeds `/arena-scene` from `EXPO_PUBLIC_API_URL` via `react-native-webview` (13.15.0, Expo SDK 54's supported version). Browser-based Expo previews use an iframe adapter. Presentation messages contain no authentication credentials and are validated/bounded on receipt. Scene errors retain 2D access.
- Mobile builds need the new native dependency included; the web deployment must include `/arena-scene`. A phone cannot access a development server at the phone's own `localhost`; use a reachable API origin in `EXPO_PUBLIC_API_URL`.
- Arena registration calls the existing compete actions and crew seating API. Open and GPS-verified activity/ratings remain separate. Awards use real settled result rows.
- Crew pages read actual crew membership and entries; create/join/share/cheer/rest use existing APIs. Mobile sends its existing Bearer access token. Crew routes now use the existing request-scoped Supabase client so RLS sees that identity. No schema or policy changes were introduced.
- Profile Elo charts use actual settled history, with an explicit first-week empty state. Progress/history and training pace have dedicated native routes. File import, provider connect/disconnect/sync, notifications, and existing preference controls remain available rather than being replaced by fixture interactions.
- Web remembers previously seen counted-session IDs per account, showing a return notice and Arena arrival when fresh account activity is found. Mobile keeps its existing return-progress behavior. This is not a new background sync service.

Verification covers typechecking, existing and targeted tests, production web compilation, native bundle exports, and browser rendering of web and Expo UI. Real provider OAuth, live crew mutations, physical-device WebGL/gestures, and signed native store builds require the corresponding configured environment and device checks.
