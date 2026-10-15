# Overtaek motion identity studies

October 14, 2026: the user selected **Overtaek** as the application name and requested loading-screen studies. The word starts as **Overtake**; the mascot K passes the final E to form **Overtaek**. Only K is a character. These studies keep Star Ember's gold/flame palette, dark green simple face, and sport-neutral body without shoes or limbs.

## Star-first refinement

The next user direction favors **Afterburn** and **Slipstream**, with a loose K impression from a star facing E and its far arm mostly hidden. `star-turn-concepts.html` preserves those two motions with fuller, rounded star bodies, an offset three-quarter face, a tucked rear point, and a shallow side rim. Both use uppercase lettering. A five-point front pose turns toward E during anticipation, then flies past it; a small look back completes the lockup. The preview includes front and turned pose comparisons, and the optional design controls can reveal the full fifth point. The original four studies below remain available. The refined pair was inspected at 736 px and 320 px, including the turn, passing frame, finished lockup, and replay; the browser console reported no errors.

## Concepts

| Concept | Letter treatment | K design | Motion | Duration |
| --- | --- | --- | --- | --- |
| Slipstream | Uppercase | Rounded typographic K | Anticipation, shallow rising pass, small overshoot, wink | 1.75 s |
| Hop over | Mixed case | Star body with a tall flame stem | Squash, large arc above E, springy landing | 2.05 s |
| Afterburn | Uppercase | Swept-back flame K | Focused eyes, stretch, fast pass and short trail | 1.55 s |
| Starburst | Mixed case | Puffy K that unfolds into a star | Contour morph during an arc, then return to K | 2.25 s |

`motion-concepts.html` is the editable inline preview source. It includes a host-provided variant carousel, Replay/Pause, a position scrubber, and a slow-motion option. Each concept starts on its finished lockup; motion plays on request. Reduced-motion preferences show the final frame. The host's optional design controls can toggle the face to inspect the silhouette. `characters/` contains independent SVG exports of all four resting K shapes.

These are new scalable drawings for letterform exploration. They are not edits to the approved production mascot assets. The production application, app manifests, and PR #39 are unchanged by this concept study.

Design recommendation: **Afterburn** has the strongest combination of a legible K, recognizable flame character, and athletic energy. **Hop over** is the most characterful alternative. A next refinement could pair Afterburn's silhouette with Hop over's expressive anticipation and landing, while shortening the full pass for repeat app launches.

The reference is Duolingo's use of expressive character poses and intentional facial motion: [character design](https://blog.duolingo.com/building-character/), [character animation](https://blog.duolingo.com/world-character-visemes/). No Duolingo artwork is included.

## Verification

- Inspected all four concepts at 736 px and the layout at 320 px in the browser.
- Inspected the initial OVERTAKE order, passing frames, and final OVERTAEK order.
- Checked Replay playback, position scrubbing, and carousel switching.
- Checked the Starburst contour transformation in flight.
- Browser console had no errors during the checks.
- No production code or dependency changes; application build checks were not needed for these standalone studies.
