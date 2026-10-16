# Focus implementation notes

The live web and Expo tab screens use **Focus** as the product direction, with two Trail carryovers: Athlete Elo/benchmarks (plus a season summary) at the top of Athlete, and Crew's identity-hero + goal/feed + member-rail composition.

- Visit `/today`, `/arena`, `/field`, `/you` on web; the same tab route IDs remain in Expo. Labels are Home, Arena, Crew, Athlete.
- Both arenas keep a **vertical 2D lane view** and a real **3D pursuit** view. The shared presentation window stays centered on the athlete by default, with zoom, pan, centering, fit-field, and a non-ranked ghost. Lane order uses one shared helper (`orderedArenaLanes`).
- Practice 1v1 / duel matchups are removed from the product. Legacy duel rows are cleared on account sanitize/write; the `duel` compete action is a no-op.
- 3D pursuit lives in `@fitness-battle/pursuit` (Three.js). Next Arena and Expo web render it in-process. Native Expo embeds `/arena-scene` via `react-native-webview` only (ReactNativeWebView + injectJavaScript — no iframe, no `postMessage("*")`). Presentation messages are validated and sync is throttled. Scene errors retain 2D access.
- Arena registration calls the existing compete actions and crew seating API. Open and GPS-verified activity/ratings remain separate. Awards use real settled result rows.
- Crew pages lead with the dark identity hero, then shared goal + activity/leaderboard feed beside (or under on narrow screens) a member accountability rail. Create/join/share/cheer/rest use existing APIs with request-scoped Supabase so mobile Bearer tokens satisfy RLS.
- Athlete opens with identity, a **Your season so far** strip (km / sessions / settled weeks), Elo trend, and benchmarks, then Progress / Connections / Preferences disclosures.
- Home week glance, Arena volume, and Today checkpoints all use `competePeriodWindow` (seated enrollment wave when present, else clock period bounds) — not a rolling 7×86400000 window. Athlete freeze keys use `primaryFreezePeriodStart` (same as the compete engine).

Verification covers typechecking, existing and targeted tests, and production web compilation. Real provider OAuth, live crew mutations, physical-device WebGL/gestures, and signed native store builds require the corresponding configured environment and device checks.
