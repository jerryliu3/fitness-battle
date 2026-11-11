# Rank artwork generation

Built-in image generation, with the supplied Ascendant Laurel screenshot as the
reference and `transparent_background: true`. The generated atlas was split
and normalized into nine 512px transparent frames. No scoring rules changed.

## Prompt

Create ONE production sprite atlas image, a precisely aligned 3 by 3 grid of NINE rank wreath frames, matching the attached reference artwork as EXACTLY as possible. This is an asset extraction/recreation, not a redesign. No text, no labels, no backdrop, no shadows outside art. Truly transparent background AND transparent circular centers. The wreath forms and highly detailed polished 3D foliage must closely follow the reference, NOT flat vector shapes. Soft realistic sculpted tapered olive laurel leaves, pointed elongated tips, visible central veins and folded facets, shaded dark forest green undersides, olive sage highlights, burnished gold highlights, delicate golden circular rims, rich dimensional emerald satin ribbons. Match natural asymmetric overlapping leaf placement and silhouette from reference; do not make a mechanical evenly spaced botanical diagram. Top row left to right Beginner (one small green sprig each bottom side), Rookie (two leaves each bottom side), Active (slender partial green laurel branches). Middle row Challenger (taller green branches), Athlete (fuller green branches), Elite (full green branches and dark green dimensional ribbon at bottom). Bottom row Master (green laurel with gold upper leaves and faceted gold diamond at bottom), Olympian (mostly gold laurel with green lower leaves, diamond bottom, gold four-point spark above), Champion (luxuriant gold laurel, sculpted gold crown above, dark green satin ribbon and central gold shield-shaped jewel below). Every cell SAME dimensions. Every center circular opening exactly same size and location: centered at 50% cell width and 51.25% cell height, opening diameter 52.5% cell width. All artwork fits within its cell with 4% margin, no overlap between cells. Thin cream/gold double metal circle rim around opening. IMPORTANT: centers empty fully transparent, NO cream discs, NO chevrons, NO portraits. Artwork carefully rendered with smooth glossy 3D beveled surfaces and fine texture and lighting matching supplied reference. Render large high resolution square atlas, ideally 1536x1536, with 512px square cells.


## Follow-up progression edits

The built-in image tool edited individual assets using these constraints:

- Active: add exactly one leaf per side to Rookie, keeping its two existing
  bottom leaves, to produce three leaves per side. Preserve the rim, transparent
  center, folded green leaves, veins, dark undersides and sage/gold highlights.
- Challenger: add exactly one leaf to the top of each Active branch, producing
  four leaves per side. Preserve the three existing leaves and all other styling.
- Athlete: reuse the original Challenger PNG unchanged.
- Elite: generate only a dimensional emerald satin ribbon beneath the original
  Challenger frame. Keep the original foliage exactly; after normalizing the
  generated image, composite only its ribbon region over the unchanged Athlete
  asset, preserving the foliage pixels.

All three generation calls requested true transparency, no text, no chevrons,
no crown or jewel, and unchanged circular rim placement. The results were
normalized to the shared portrait aperture and copied to both asset locations.


## Elite symbol replacement

Final edit: replace Elite’s green ribbon with the gold jewel from Master,
retaining Athlete/Elite foliage unchanged. Built-in image tool prompt:

> Extract ONLY the faceted gold diamond/star-shaped jewel at the bottom center of this supplied rank emblem. Preserve the jewel exactly: same silhouette, gold material, facets, size and placement within the original square canvas. Remove ALL green foliage, circular rim and everything else. Output the isolated original bottom gold diamond on a truly transparent canvas, with the same framing as the input. No redesign, no extra elements, no new star, no text.

The extracted jewel is normalized to the original jewel’s footprint and composed
over the unchanged Athlete wreath, which removes the ribbon without regenerating
any foliage.
