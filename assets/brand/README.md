# Overtaek app icon

Finalized Afterimage identity: hollow circles, rich gold (#dfad3c) and silver (#9fa5af), white background, slightly slower rival. `overtaek-icon.svg` is the supplied 1024px master, preserved unchanged. No lanes or text.

Run `node scripts/generate-app-icons.mjs` after installing workspace dependencies to regenerate every platform asset. The script uses the Sharp runtime already installed with Next and normalizes CSS translations for rasterization.

- Next file metadata supplies the browser favicon, SVG icon, and 180px Apple touch icon.
- The web manifest supplies 192/512px install icons and a padded maskable icon.
- Expo supplies the 1024px iOS/legacy Android icon, transparent padded Android adaptive foreground, themed monochrome mask, and Expo web favicon.

Android adaptive art is centered and scaled inside the safe circle; the launcher supplies its white background. Monochrome output preserves hollow centers. Native icon changes take effect in a new app binary; this does not submit or release an app.

The design exploration remains in `docs/design-studies/the-pass`; longer-wake experiments do not replace this production master.
