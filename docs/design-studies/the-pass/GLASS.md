# Uniform tinted glass — Round 6

**Current review:** capsule shape locked; four finishes; 26/38/50% uniform opacity; independent 10-gold and 10-silver/platinum selectors at `review.html?view=finishes`. The earlier sections below record the exploration history.

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

## Focused comparison: shape × finish

The next review narrows the active comparison to **capsule and fine loop**, at `review.html?view=finishes` or `/design/pass?view=finishes`. Both shapes are shown in four rows: new uniform glass, original Amber Capsule tinted glass, Frosted Pebble satin glass, and Glazed Ceramic fired glaze. The extra Amber row preserves the original preferred material as a direct comparison with uniform glass. Earlier rounds remain in their archive tabs; no preferred material was deleted.

Uniform glass defaults to **50% opacity**, with **38% and 64% presets**. Each preset changes only alpha; its rich-gold/silver base palette stays fixed at #dfad3c / #9fa5af. Gold and silver use the exact same face opacity. Perceived transparency can differ with hue, backdrop, draw order, and accumulated echo layers. The transmission check puts identical contrast bands behind both heads to make this visible. Inspection bands are never part of icon exports. The other three materials retain their original surfaces and do not inherit this alpha control.

The standard capsule is **40 × 58 units**, identical to both the original Amber Capsule and the non-tall Round 6 capsules. The archived Tall Capsule is **36 × 66**. This focused set uses the standard proportions throughout. Fine loops have a 23-unit outer radius and six-unit band; all materials use a true even-odd opening, including clipping of satin/glaze reflections. Icon and lane renderers share these forms. The original Amber Capsule is also shown separately as a dimensional reference.

`finish-board-white.png` / `finish-board-black.png` and their SVG originals compare all eight combinations. `finish-icons/white/` and `finish-icons/black/` each contain eight icon masters and eight matching field snapshots; uniform-glass static exports use 50%. `transmission-white.svg` and `transmission-black.svg` preserve the backdrop check. Browser exports include the selected opacity in the filename. These assets use the existing review rebuild command.

Focused-review verification: both 38% and 64% presets were checked in the browser and all rendered gold/silver face paths had the same selected alpha. The 50% default, backdrop changes, restored fired-glaze loop, and run scrubbing were verified. `finish-opacity-preview.png` captures the common-backdrop diagnostic. Workspace typecheck, web tests and web build passed after adding the focused comparison.


## Capsule locked: independent color lab

The active review now locks the standard **40 × 58 capsule** and drops rings from the active comparison. The earlier ring explorations remain archival. Uniform glass uses **26%, 38%, or 50% face opacity** for both colors; 64% is removed from the active controls. Fifty percent remains the initial default. The four retained finishes are uniform glass, original Amber tinted glass, satin glass and fired glaze.

Independent selectors offer **10 golds × 10 silver/platinum tones**. They include bright yellow/gold, warm amber/champagne, neutral silver, bright/cool/warm platinum, white, blue silver and smoke. Palette changes update the head, rim, shading and wake for all four finishes and the selected lane preview. Full-strength swatches distinguish the chosen base color from its translucent result. Export filenames include both color IDs and the uniform-glass opacity. Defaults retain rich gold / current silver; colors remain under review. `capsule-colors-white.png` and `capsule-colors-black.png`, with editable SVG originals, compare each family while holding the other color fixed.

Every wake is clipped **below the capsule's bottom edge**, in the object's local coordinate space, outside animated transforms. No wake can show through a translucent live capsule in a still frame, flow, or pass replay. The clip begins at y=30.2 for a capsule ending at y=29. The export removes only the outer icon display mask and preserves these internal clips. The original Amber face's two curved internal marks were also removed because they resembled afterimages. Remaining optical highlights belong to the material surface.

The reference screenshot is flattened and cannot uniquely determine the original alpha. A visual estimate for its stronger colored pieces is about **60–80% opacity (20–40% transparency)**, not a measurement. The 26–50% presets deliberately explore the lighter treatment requested by the user.

Verification: workspace typecheck, 168 web tests (four existing skips), and production web build passed. Browser checks confirmed 10 independent choices per color, four capsule cards, 26/38% matched alpha, both selected colors in every finish, white/black switching, replay, and wake clipping on the selected field. A raster check compared each icon with and without wakes on white and black, at rest and at an overlapping echo pose: zero pixels changed inside either live capsule across all four finishes. `capsule-color-lab-preview.png` records the working color controls.
