# Overtaek — a stable world for a personal Ember

October 17, 2026 · Review at `/design/brand`

The studio is a mergeable React/TypeScript implementation of the ten brand directions and their interface studies. It adds a concept for the current golden Ember, plus three more neutral systems. All study source and fixtures live under `apps/web/src/app/design/_studies/brand-lab/`; the thin route inherits the existing `/design` access gate. Production navigation, themes, competition rules and character defaults remain unchanged.

The [original ten-territory strategy](ten-territories.md) preserves the first-phase positioning, creative rationales and application briefs. The neutral systems below reflect the subsequent user feedback.

## Strategy following review

The user favours **Chain Reaction** and **Play Forward**, particularly the former's warmth and the latter's modest dimensionality. The complex, glossy Play Forward mascot is too elaborate for the desired default. The emerging direction is a broadly usable, calmer app with one recognizable star character and optional cosmetic finishes.

The selected direction after review is **Open Field with Everyday Club’s palette**: warm neutral surfaces, charcoal type and a small fixed golden accent, combined with Open Field’s airy grid, comparison-first hierarchy and restrained controls. This is an evolution of the existing app rather than a wholesale visual reset. The gallery opens on this combination by default. The original Ember is the welcoming default. A personal Ember can become mint, lilac, violet or another finish without recoloring the navigation, affecting chart semantics or replacing the app's brand.

This separates three decisions:

1. **Overtaek's identity:** the name, voice, typography, fixed semantic colors, graphic behavior and interface conventions.
2. **Ember's identity:** the existing five-point star, swept crest, face geometry, recognizable proportions and movement.
3. **The athlete's expression:** a finish chosen for their run or field, shown with a stable YOU label and lane identity.

Classic golden Ember remains the canonical introduction in brand communications. Personal finishes belong to the athlete's activity, profile and shared results; selecting one should not recolor the app or replace its public brand signature. This lets personal identity grow without fragmenting recognition of Overtaek.

## What is preserved

The ten territories are The Pass, After Hours, Rival Club, Good Pressure, Marginal Gains, Proof of Work, The Weekly Sport, Higher Ground, Play Forward and Chain Reaction. Each has a brand board, an interactive four-destination product study, button/menu/standings/chart examples, and its generated Ember reference artwork. The generated art is concept reference, not an animated production rig. Prompt provenance is in `ember-territory-prompts.json`; transparent previews live under `apps/web/public/design/brand/`.

**Current Ember** is an eleventh direction built from the existing canonical vector scene, with the original gold face, orange sides and simple green facial features. Its product setting is close to Chain Reaction but quieter. It is not a regenerated interpretation of the production character.

## Three neutral systems

| Direction | Foundation | Distinctive behavior | Best reason to choose it |
| --- | --- | --- | --- |
| Everyday Club | Warm white, charcoal, small fixed gold accent | Soft controls, subtly raised surfaces, friendly hierarchy | Chain Reaction's human warmth with broad visual compatibility |
| Open Field — selected | Everyday Club’s warm white, charcoal and gold | Airy grid, comparison before standings, a clear sporting field | The most athletic and composed foundation |
| Pocket Arena | Cloud white, charcoal-violet, quiet lavender | Slight button bevels and tactile hierarchy, with a simpler star | Play Forward's satisfying depth without its visual complexity |

All three support the same skin collection. Changing the finish updates Ember in the hero and character preview while leaving product colors, distances, rank and chart meaning intact.

## What the locker demonstrates

The study offers Classic, Mint, Lilac and a simplified Arcade as owned examples. Glacier and Night are previewable locked examples. Selecting a tile updates the large preview; only **Use for my run** equips an owned finish. A locked preview cannot overwrite the equipped finish. **Reset preview** returns to the equipped character. **Preview run** reuses the production motion sampler and honors reduced motion.

Arcade deliberately uses one violet face and one pink edge on the familiar simple silhouette. It avoids the original Play Forward render's multiple accent bands, elaborate facets and glossy detail.

The skin renderer calls the shared canonical `createEmberScene` and recolors paint attributes in a copied scene tree. It preserves geometry, gradient references, IDs and animation. It does not mutate the shared model or add skin APIs to production adapters. Classic uses the untouched scene.

Ownership, equip state and proposed unlock requirements are local review fixtures, not implemented entitlements or promises about future rewards. The same competition rules apply to every finish. A future production system should have a separately reviewed catalog, server-authorized unlocks, a stored equipped skin, small-size art validation, and a renderer strategy compatible with native and the WebView arena. This PR intentionally demonstrates the design before committing to those product rules.

## Consumer references and interpretation

- [Finch's approach to self-care](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care) describes a customizable companion and unlocking outfits. The useful lesson is that expression can deepen an existing character relationship. The studio does not borrow Finch's shop or economy.
- [Zwift's avatar customization guide](https://support.zwift.com/en_us/customizing-your-avatar-SJhtYrj3F) places appearance and gear in a Garage, with the selected look visible when returning to the activity. The useful lesson is a clear home for customization and continuity into the sporting context. Overtaek's proposed finishes are cosmetic; this is not a proposal to copy equipment performance effects.
- [Duolingo's shape-language article](https://blog.duolingo.com/shape-language-duolingos-art-style/) emphasizes simple, readable silhouettes and consistent art direction. Its [avatar creator](https://blog.duolingo.com/avatar-creator/) demonstrates personal variations within a recognizable world. Ember should retain its central silhouette and expression language as finishes change.
- [Pokémon GO's official overview](https://www.pokemon.com/us/pokemon-video-games/pokemon-go/) explains that a customized Trainer appears on the map, profile and social interactions. The useful lesson is that a choice becomes meaningful when it is seen in the contexts the person already values.

These are design precedents, not evidence that a particular skin system will improve retention. The recommendation is an interpretation of those patterns and the user's preferences.

## Review paths

- Recommended neutral default: `/design/brand?concept=open-field&view=product`
- Current Ember: `/design/brand?concept=current-ember&view=product`
- Pocket Arena locker: `/design/brand?concept=pocket-arena&view=locker`
- Original Chain Reaction: `/design/brand?concept=chain-reaction&view=product`
- Original Play Forward: `/design/brand?concept=play-forward&view=campaign`

Use the same fictional running week across directions. Switching to the previous week updates standings, next rival, totals, chart and athlete details. Past you is a comparison, never a ranked athlete. The sample sports record remains running distance; no normalized cross-sport score is implied.

## Framework and verification notes

The installed Next package does not contain the charter's `dist/docs/` directory. Its README points to the official documentation; the [server/client component guide](https://nextjs.org/docs/app/getting-started/server-and-client-components), [page convention](https://nextjs.org/docs/app/api-reference/file-conventions/page), and [font guide](https://nextjs.org/docs/app/getting-started/fonts) were used as fallback. The new page follows the existing thin-route/private-study pattern and uses the installed Radix dialog for focus and dismissal behavior.

Validation covers workspace typechecking, relevant study tests and the full test suite, web build, browser review of the directions, responsive layouts, week changes and locker behavior. Results and representative screenshots are recorded with the PR.

### Recorded review

- `pnpm typecheck`: passed for all workspace packages.
- `pnpm test`: 350 tests passed, including six new study checks.
- `pnpm build:web`: passed with the route registered at `/design/brand`.
- Fourteen product directions reviewed on desktop and at a 320 px frame; the three neutral systems also reviewed at 390 px. Tested product containers had no horizontal overflow.
- Week selection updates the field and comparison; Radix provides modal focus isolation and Escape dismissal.
- A locked Night preview leaves Classic equipped; owned Arcade equips explicitly and can be previewed in motion.
- [Browser verification record](reviews/verification.json), [Everyday Club](reviews/everyday-club-desktop.png), [Open Field](reviews/open-field-desktop.png), [Pocket Arena](reviews/pocket-arena-desktop.png), and [Current Ember](reviews/current-ember-desktop.png).
- [Ember locker with the simplified Arcade finish equipped](reviews/ember-locker-desktop.png).

The initial sandboxed build could not resolve Google Fonts. Re-running with normal network access completed successfully. This required no project configuration or dependency changes.

## Ember art and animation decision

The preferred character references are **The Pass / Challenger**, **Marginal Gains** and **Higher Ground**. Preserve what makes their actual looks appealing: compact star proportions, rounded dimensional volume, a clean face and a confident expression. Color and material are adjustable; they need not define separate character anatomies.

Recommended production art brief:

- Use one recognizable five-point body, crest and face placement, with shared deformation controls. Challenger supplies the confident character; Marginal Gains supplies the restrained, softly beveled finish. Keep golden Ember as the default colorway.
- Treat Higher Ground’s frosted blue as a cosmetic finish. Begin with opaque satin shading and restrained highlights; true refraction is optional, not required for the character to feel dimensional.
- Keep facial features on a stable readable surface. Avoid tiny facets, floating accessories and painted highlights that fight the bend of a limb. Judge the silhouette at 32 and 64 px as well as in the large locker preview.
- Before rebuilding a whole collection, prove one revised body with idle, run, a three-quarter turn and celebration. Check limb intersections, crest recovery, face stability, small-size readability, reduced motion and representative phones. Then apply gold, mint and frosted-blue finishes to the same motion.

**Implemented today:** the locker recolors the existing procedural vector rig and reuses its motion. It does not animate the exact generated territory renders or replace the production character. The current rig provides art-directed depth and modest turns, not full 3D geometry or material simulation; see the [mascot model documentation](../mascot/README.md).

**Recommended next decision:** refine the current 2.5D rig if the desired look can be expressed with controlled gradients, side planes and a fixed viewing range. If matching the sculpted renders, real side/back turns or changing light is essential, build one rigged 3D master and reuse its skeleton and expression controls across material variants. That requires modeling and motion validation, rather than animating a PNG. [Three.js glTF support](https://threejs.org/docs/pages/GLTFLoader.html) provides a delivery path for modeled scenes and animation; its [physical material documentation](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) describes transmission and its higher rendering cost. Our preference for satin over real-time glass is an art and performance recommendation, not a measured device result.

The complexity of a still render alone does not determine motion quality. Consistent geometry, a well-authored rig and restrained materials matter more. No new animation dependency or production skin entitlement is introduced by this decision.
