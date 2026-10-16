# Focus implementation notes

The live web and Expo tab screens use **Focus** as the product direction, with two Trail carryovers: Athlete Elo/benchmarks (plus a season summary) at the top of Athlete, and Crew's identity-hero + goal/feed + member-rail composition.

- Visit `/today`, `/arena`, `/field`, `/you` on web; the same tab route IDs remain in Expo. Labels are Home, Arena, Crew, Athlete.
- Both arenas keep a **vertical 2D lane view** and a real **3D pursuit** view. The shared presentation window stays centered on the athlete by default, with zoom, pan, centering, fit-field, and a non-ranked ghost. Structure-lab bar boards are study-only and are not used in production.
- Web 3D remains Three.js. Mobile embeds `/arena-scene` from `EXPO_PUBLIC_API_URL` via `react-native-webview` (13.15.0, Expo SDK 54's supported version). Browser-based Expo previews use an iframe adapter. Presentation messages contain no authentication credentials and are validated/bounded on receipt. Scene errors retain 2D access.
- Mobile builds need the native WebView dependency; the web deployment must include `/arena-scene`. A phone cannot reach a development server at the phone's own `localhost`; use a reachable API origin in `EXPO_PUBLIC_API_URL`.
- Arena registration calls the existing compete actions and crew seating API. Open and GPS-verified activity/ratings remain separate. Awards use real settled result rows.
- Crew pages lead with the dark identity hero, then shared goal + activity/leaderboard feed beside (or under on narrow screens) a member accountability rail. Create/join live in empty states and the rail. Create/join/share/cheer/rest use existing APIs. Mobile sends its existing Bearer access token. Crew routes use the request-scoped Supabase client so RLS sees that identity. No schema or policy changes were introduced.
- Athlete opens with identity, a **Your season so far** strip (km / sessions / settled weeks), Elo trend, and benchmarks, then Progress / Connections / Preferences disclosures. Progress/history and training pace have dedicated native routes.
- Web remembers previously seen counted-session IDs per account, showing a return notice and Arena arrival when fresh account activity is found. Mobile keeps its existing return-progress behavior. This is not a new background sync service.
- Comparative layout study remains at `/design/structure` (and native `overtaek:///structure`). See [interface-structure-study.md](./interface-structure-study.md).

Verification covers typechecking, existing and targeted tests, production web compilation, native bundle exports, and browser rendering of web and Expo UI. Real provider OAuth, live crew mutations, physical-device WebGL/gestures, and signed native store builds require the corresponding configured environment and device checks.
