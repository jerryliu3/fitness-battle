# Five materials for the earned trail

The three retained progress shapes stay directly behind the racer. This round changes their material: stronger solid color, deliberate borders and enough depth to feel finished at small sizes. The Material control works independently of Background, Progress and Zoom lens on desktop, phone and the persistent expanded field.

| Material | Visual direction | Useful comparison |
| --- | --- | --- |
| Route Enamel | Saturated gold/blue, precise dark outline, flat solid face | Clearest graphic route; the review default |
| Pop Rubber | Yellow/mint, rounded pieces, darker base and raised highlight | Playful and tactile, especially for dots and tiles |
| Signal Neon | Citrus/cyan, dark rim, bright core and restrained glow | Strongest energy; compare on Night Meet |
| Porcelain Inlay | White core, gold/teal border and fine dark outer edge | Clean outlined path without a colored solid center |
| Liquid Glass | Gold/ice blue, soft shadow, rich face and narrow reflection | A polished trail related to the capsule material |

No finish is selected for production. The palettes belong to study progress paint only; the canonical polished-glass heads and afterimages are unchanged. Self/peer route colors aid comparison in the fictional study and do not introduce rank, score or sport semantics.

## References and interpretation

The user's reference is the clean route presentation in [Strava Flyover](https://support.strava.com/en-us/articles/15401641-flyover). Strava's first-party guide describes a dynamic 3D route view with camera, zoom and overlay controls; it does not prescribe the stroke materials implemented here. Route Enamel is our interpretation of the requested solid, bordered, modern route, rather than a pixel copy or a claim about Strava's rendering internals.

[Duolingo's shape-language notes](https://blog.duolingo.com/shape-language-duolingos-art-style/) explicitly emphasize vibrant colors, rounded buttons, playful minimal forms and clarity at small sizes. Its [home-path explanation](https://blog.duolingo.com/new-duolingo-home-screen-design/) also describes visible progress through lesson steps. Pop Rubber adapts that rounded, substantial direction to earned distance. Session tiles still represent sourced activities, not arbitrary lesson-style milestones. Neon, Inlay and Glass are additional material explorations, not observed styles attributed to either app.

## Composition and distance

All three shapes retain their centerline and true athlete endpoint. Banked trail tapers into the wake; dots are anchored to world distance; tile seams come from counted-session boundaries. No session history means no manufactured tiles. The nine accepted grounds, shared side kilometer scale, normalized oval lap model, map/distance lenses and bottom overview remain.

The prior overall alpha made even saturated paint appear washed out. **Soft blend** now approaches full opacity farther back, then fades the complete material stack together beneath the afterimages. **Faint underlay** remains a uniform 22% comparison. A continuous radial mask quiets fill, outline, shadow and glow together near the racer. The canonical live-head silhouette remains excluded; the trail does not shift sideways or cut a cap through it. The existing racer layer is still the only owner of wake animation. New materials are static at rest.

Review `/design/boards?background=trail&progress=deposit&material=enamel&wake=blend&zoom=map`. Switch `material` between `enamel`, `rubber`, `neon`, `inlay` and `glass`; switch `progress` between `dots`, `tiles` and `deposit`. Selections restore from the URL. Missing or invalid material IDs fall back to Route Enamel.

## All fifteen combinations

| Trail | Enamel | Rubber | Neon | Inlay | Glass |
| --- | --- | --- | --- | --- | --- |
| Dotted route | [View](round6-dots-enamel.png) | [View](round6-dots-rubber.png) | [View](round6-dots-neon.png) | [View](round6-dots-inlay.png) | [View](round6-dots-glass.png) |
| Session tiles | [View](round6-tiles-enamel.png) | [View](round6-tiles-rubber.png) | [View](round6-tiles-neon.png) | [View](round6-tiles-inlay.png) | [View](round6-tiles-glass.png) |
| Banked trail | [View](round6-deposit-enamel.png) | [View](round6-deposit-rubber.png) | [View](round6-deposit-neon.png) | [View](round6-deposit-inlay.png) | [View](round6-deposit-glass.png) |

[Night Meet / Neon](round6-night-neon.png) · [Straightaway / Enamel](round6-track-enamel.png) · [Phone / Rubber dots](round6-phone-rubber.png) · [Phone oval / Glass tiles](round6-phone-oval-glass.png)

## Verification

Monorepo `pnpm typecheck`, all 18 study tests and `pnpm build:web` pass. Material URL validation also rejects inherited object keys.

The [browser report](round6-verification.json) records 180 material/shape/field/viewport combinations at 1440, 390 and 320 px. Checks cover centered endpoints, canonical head masks, no page overflow, faint-underlay and soft-blend alpha, source inspection, persistent expansion with material changes, gain alignment, mile-loop geometry and shareable material URLs. No browser runtime errors were reported. Captures above were visually reviewed, including bright and dark grounds and phones. Browser coverage does not establish native GPU performance or user motivation outcomes.

The study adds no dependencies or backend writes. Production Compete and native surfaces remain outside this protected presentation study.
