# Overtaek app icon

Finalized **Shared Start** Afterimage identity: hollow circles, rich gold (#dfad3c) and silver (#9fa5af), white background, slightly slower rival. `overtaek-icon.svg` is the selected Shared Start 1024px master, promoted from `docs/design-studies/the-pass/wake-study-icons/balanced.svg` (accessible label updated). Gold has six echoes extending to the endpoint of silver’s four-echo wake. The final echo centers align at y=210.55 in the 256-unit viewBox; gold’s wake is 117.55 units long and silver’s is 65.55. No lanes or text.

Run `node scripts/generate-app-icons.mjs` after installing workspace dependencies to regenerate every platform asset. The script uses the Sharp runtime already installed with Next and normalizes CSS translations for rasterization.

- Next file metadata supplies the browser favicon, SVG icon, and 180px Apple touch icon.
- The web manifest supplies 192/512px install icons and a padded maskable icon.
- Expo supplies the 1024px iOS/legacy Android icon, transparent padded Android adaptive foreground, themed monochrome mask, and Expo web favicon.

Android adaptive art is centered and scaled inside the safe circle; the launcher supplies its white background. Monochrome output preserves hollow centers. Native icon changes take effect in a new app binary; this does not submit or release an app.

The design exploration remains in `docs/design-studies/the-pass`; Shared Start is now the selected production mark. Long Stride, Long Exposure and the earlier four-echo gold wake remain historical alternatives.
