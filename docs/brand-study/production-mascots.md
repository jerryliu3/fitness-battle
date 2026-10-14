# Product mascot options

October 14, 2026: the user selected gold **Star Ember** as the default production mascot, with plum **Quiet Ace** retained as an available alternative. Both have simple faces and no limbs or sport-specific equipment.

`packages/shared/src/brand.ts` defines `MascotVariant`, accessible descriptions, and `DEFAULT_MASCOT`. Setting the default there changes the product mascot on both platforms. The shared package contains only platform-neutral metadata; assets stay in their platform bundles.

Web: `Ace` in `apps/web/src/features/rally/ace.tsx` keeps the existing component API and accepts `variant="quiet-ace"` or `variant="star-ember"`. Existing product surfaces inherit the shared default. Assets are in `apps/web/public/brand/mascots/`, copied from the approved refinement WebPs (480 × 480, transparent).

Mobile: `AceStrip` in `apps/mobile/src/ui/ace-strip.tsx` accepts the same variant prop and appears on the home screen. It uses the existing mobile theme tokens, without depending on the separate mobile Rally redesign branch. Both original transparent PNG assets (1254 × 1254) are statically required from `apps/mobile/assets/mascots/` so Metro can package either choice.

Source art: Quiet Ace is the approved `ace-simple-plum` refinement; Star Ember is the approved `star-ember-gold` refinement. Copies are bundled directly in the platform asset directories above. Historical design-lab assets are retained. This change sets the default for production code; it does not itself publish a deployment or mobile store build.

Naming clarification: **Acceli** is already an [AI/software agency](https://www.acceli.com/). **AccelUp** is already an active [ENoLL matchmaking platform](https://enoll.org/2026/06/09/enoll-at-the-eic-summit-2026-living-labs-as-a-competitive-advantage-for-industry/). Neither should be described as unused or cleared. No product-name change is included in this mascot implementation.

Verification: `pnpm typecheck` and `pnpm build:web` passed. Both platforms' assets match the approved source files byte for byte and retain transparency. The guest home screen has no mascot surface until a track is selected; the existing product mascot components use the shared default wherever rendered.

PR verification against `origin/main`: typecheck and production web build passed. An iOS Metro export stops in Expo Router's entrypoint because the current main mobile manifest/Metro setup cannot resolve `@expo/metro-runtime`; this happens before the mascot component loads. Native runtime appearance remains unverified.
