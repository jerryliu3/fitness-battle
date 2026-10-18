# Material objects — Round 5

Eight new concepts build on the selected Shared Start direction and the user's preference for the bold 135% comparison. This branch is stacked on PR #154; it does not change production icon selection, sizing, app configuration, or scoring.

## Review

- Interactive: `/design/pass?view=materials` under the existing design access gate.
- Portable: `review.html?view=materials` (self-contained, offline, no API requests).
- `material-board-white.png` and `material-board-black.png`: eight concepts at a glance, with editable SVG boards alongside.
- `material-fields-white.png` and `material-fields-black.png`: matching field comparison boards, with SVG originals.
- `material-icons/white/` and `material-icons/black/`: 1024px square unmasked SVG masters and matching static field SVGs for every concept.

The icon uses the bold comparison's head centers (74,145) and (182,93), and radius 31.05. Vertical heads remain staggered and the gold wake has six echoes to silver's four; trailing artwork can crop at the tile edge. Width varies intentionally with the silhouette. Each concept uses the identical `MaterialRacer` renderer in the icon and lanes.

## Concepts

| Concept | Shape | Material question |
| --- | --- | --- |
| Lucent lens | Circle | Can clear tinted glass preserve enough silhouette at 16px? |
| Amber capsule | Vertical pill | Do layered, translucent pill echoes make the pass more tangible? |
| Frosted pebble | Soft squircle | Does a milky face make the glass idea quieter and more readable? |
| Liquid loop | Hollow ring | Can a polished glass rim retain the existing hollow-circle identity? |
| Satin alloy | Soft squircle | Does brushed metal feel more athletic and precise than glass? |
| Chromatic foil | Rounded diamond | Can a directional form and narrow spectral seam add energy without noise? |
| Glazed ceramic | Vertical pill | Is an opaque, friendly enamel object stronger at small sizes? |
| Opal drop | Upward soft drop | Can pearlescent resin introduce direction without reading as a map pin? |

White/black and one shared light slider let the same objects be inspected consistently. Large icon cards remain static; the selected field supports pass replay, held positions, independent backward-flowing wakes, and manual run scrubbing. Existing reduced-motion and hidden-page behavior are retained. SVG downloads remove display masks and freeze the echo positions. Optical effects follow explicit input; there is no ambient reflection animation.

The field uses the existing fictional `laneFrame` fixture (+2km, one strict pass) with fixed athlete lanes and an athlete-centered ±3km viewport. Higher means more distance. The prior-self marker is unranked. Names, values and identities remain independent of finish; metals do not imply podium places or rarity. Material-specific labels have a solid contrasting outline when needed. The static mini fields omit labels for compact comparisons; the full field retains them.

## References and interpretation

The local Goalmaxxing study (`docs/ux/goal-card-material-study.md`, `src/features/ux-brand/card-materials/materials.ts`) was read directly. Its polished glass thickness, satin alloy, category-tinted foil, ceramic and pearl treatments inform this round. Its difficulty mapping and goal behavior are not imported. The supplied Photos-style reference informs translucent layering and rounded optical edges, rather than its flower layout or rainbow palette.

Apple's [app icon guidance](https://developer.apple.com/design/human-interface-guidelines/app-icons) describes layered foreground artwork, varying opacity, clearly defined edges and unmasked vector layers. Its [materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) assigns native Liquid Glass primarily to controls/navigation and distinguishes it from content materials. Here, glass is an illustrative material for brand objects and athlete markers, not a claim that these SVGs implement a native system control.

These are bounded vector approximations of transmission, specular edges, soft shading and surface grain. There is no physically accurate refraction, backdrop sampling, device orientation, native Icon Composer project, or platform-specific shader. An eventual native layered icon would need its own system preview; lane labels and small-size recognition should determine which finish survives.

## Rebuild

`node apps/web/src/app/design/_studies/pass-lab/build-review.mjs` rebuilds the portable review, SVG masters, field snapshots and both material boards using existing workspace dependencies. No new package is introduced.

## Verification

Workspace typecheck, web tests (153 passed; four existing seed skips), production web build, and portable regeneration passed. All icon and field boards were rasterized and inspected. The local review returns HTTP 200. Live interaction testing in the current in-app tab was blocked by its URL-policy/error-page state; no browser security setting was changed. Interactive controls still need a manual review in a working tab.
