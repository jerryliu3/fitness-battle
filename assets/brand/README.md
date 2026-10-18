# Overtaek app icon

Finalized **Shared Start** Afterimage identity: hollow circles, rich gold (#dfad3c) and silver (#9fa5af), white background, slightly slower rival. `overtaek-icon.svg` is the selected Shared Start 1024px master, promoted from `docs/design-studies/the-pass/wake-study-icons/balanced.svg` (accessible label updated). Gold has six echoes extending to the endpoint of silver’s four-echo wake. The final echo centers align at y=210.55 in the 256-unit viewBox; gold’s wake is 117.55 units long and silver’s is 65.55. No lanes or text.

Run `node scripts/generate-app-icons.mjs` after installing workspace dependencies to regenerate every platform asset. The script uses the Sharp runtime already installed with Next and normalizes CSS translations for rasterization.

- Next file metadata supplies the browser favicon, SVG icon, and 180px Apple touch icon.
- The web manifest supplies 192/512px install icons and a padded maskable icon.
- Expo supplies the 1024px iOS/legacy Android icon, transparent padded Android adaptive foreground, themed monochrome mask, and Expo web favicon.

Android adaptive art is centered and scaled inside the safe circle; the launcher supplies its white background. Monochrome output preserves hollow centers. Native icon changes take effect in a new app binary; this does not submit or release an app.

The design exploration remains in `docs/design-studies/the-pass`; Shared Start is now the selected production mark. Long Stride, Long Exposure and the earlier four-echo gold wake remain historical alternatives.

## Background variants and scale review

`overtaek-icon.svg` is white; `overtaek-icon-black.svg` is true black (#000000). Hollow centers match each background; rich gold and silver stay unchanged. Web-ready SVGs and PNGs (16, 32, 48, 64, 180, 192, 512, 1024px) are available under `apps/web/public/icons/white/` and `black/`. Native alternate artwork is `apps/mobile/assets/icon-black.png`, with a matching `adaptive-icon-black.png` foreground for a black launcher background; the existing `icon.png` stays white. Both web sets also include a padded maskable PNG. The generator handles both self-closing and paired SVG rectangle tags when removing adaptive backgrounds. These are explicit assets for future conditional use; no automatic theme switch is configured.

The generated `docs/design-studies/the-pass/scale-study/index.html` compares the current composition with 120% and 135% scales in both backgrounds, including small-size and rounded-mask previews. All studies keep silver’s head center at (88,145) and gold’s at (168,93). Each racer scales around its own head center, enlarging the circles, outlines and wakes without moving the heads. Wakes may extend beyond the bottom edge; no extra bottom padding is added. Production sizing and Android adaptive safe-area padding remain unchanged pending selection. Rebuild everything with the existing icon generation script.
