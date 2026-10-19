# Uniform tinted glass — Round 6

The user retained Amber Capsule and Glazed Ceramic, with Frosted Pebble as a third comparison. The new direction follows the supplied Photos icon reference more literally: one smooth translucent material, consistent across the face, with darker areas caused by overlap rather than painted texture or decorative reflections.

Eight additions explore five capsule treatments and three open loops. All prior Round 5 concepts remain in the history tab; the three retained options are also selectable in this round's field preview. Both parent PRs (#154 and #156) have merged, so this continuation starts from main containing that work. Production app icons are unchanged.

## Review and assets

- App: `/design/pass?view=glass` under the existing design access gate.
- Portable: `review.html?view=glass` (embedded fonts/code; offline and API-free).
- `glass-board-white.png` / `glass-board-black.png`: all eight icons and overlap samples, with editable SVG originals.
- `glass-fields-white.png` / `glass-fields-black.png`: paired field boards, with editable SVG originals.
- `glass-icons/white/` and `glass-icons/black/`: eight 1024px square unmasked icon SVGs, eight field SVGs and eight overlap samples per background.
- `glass-live-preview.png`: browser-verified icon/phone pairing.

## The controlled variations

| Concept | Shape | Face opacity | What changes |
| --- | --- | --- | --- |
| Clear capsule | Capsule | 38% | Light transmission and a delicate edge |
| Color capsule | Capsule | 72% | Fuller yellow/gold and silver tint, closer to the reference |
| Amber glass | Capsule | 80% | Deeper amber absorption and a stronger polished perimeter |
| Quiet edge | Capsule | 64% | Minimal boundary treatment on an even tinted face |
| Tall capsule | Narrow/tall capsule | 68% | A more elongated reference-petal silhouette |
| Fine glass loop | Circular band | 70% | A six-unit band with a genuinely open center |
| Broad glass loop | Circular band | 62% | A ten-unit band, exposing more translucent material |
| Capsule loop | Capsule band | 72% | A seven-unit open band bridging the two preferred forms |

The same material is used for gold, silver, and their echoes. Hue and alpha vary between these controlled studies, not within a single face. The edge-light control affects only a narrow boundary gradient. Overlap inspection moves two pieces together without changing their material. Standard SVG alpha compositing generates their intersection color; there is no hand-painted overlap patch.

Each face is one solid-color path with constant fill opacity. The loop path uses even-odd fill and retains a real transparent center. The new renderer contains no face gradients, reflection blobs, decorative internal lines, textures, noise, blur filters, cast shadows, or metal grain. Thin colored and illuminated boundary strokes supply edge definition.

The gold/silver pair keeps the bold layout at (74,145) and (182,93), radius 31.05, and six/four echoes. Trailing artwork can crop at the tile edge. Echo opacity falls by whole piece; it does not shade a face internally. Flow uses the same bounded alpha as the static pieces rather than inheriting the stronger legacy echo opacity.

`UniformGlassHead` and `UniformGlassRacer` render the new objects. `MaterialRacer` dispatches to them while keeping legacy finishes on the original renderer. This keeps icon, mini field, full phone field and overlap inspection on the same material implementation. The existing fictional +2km fixture, stable lanes, ±3km viewport, strict pass rule and unranked prior-self marker remain intact.

These are SVG glass studies; native system refraction and a native layered app icon would require a later platform-specific pass. The supplied screenshot is the visual reference. This round intentionally retains its uniform tinted pieces and layered color behavior rather than its flower arrangement or eight-color palette.

## Verification and regeneration

Run `node apps/web/src/app/design/_studies/pass-lab/build-review.mjs` to rebuild the portable review, white/black boards, and 48 glass SVG assets. Workspace dependencies are reused; no package was added.

Workspace typecheck, web tests (168 passed; four existing skips), and production web build passed. White/black icon and field boards were rasterized and inspected. Browser checks covered backdrop switching, separate/overlapping pieces, edge lighting, retained-favorite selection, replay, manual scrubbing, held positions and trail pause. Production masters and app icon configurations are untouched.
