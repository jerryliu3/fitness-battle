# Five interactive product worlds

Route: `/design/worlds?concept=flip|rally|roam|loop|tempo`.

This study responds to the criticism that the preceding four identities shared the same interface structure. Each concept now owns a distinct central object, composition, navigation mechanism, and comparison flow. Only the lab selector, presentation fixtures, and activity receipts are shared. Individual movement and self-comparison are the default; optional groups remain a secondary entry.

## The five experiences

| World | Primary object                     | Defining interaction                                                 | Comparison                                            | Original mascot                      |
| ----- | ---------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| Flip  | A weekly comic issue               | Turn chapters; inspect the activity behind a frame                   | Open parallel storylines with paired milestone totals | Zip, an inked swift in running shoes |
| Rally | A personal sports broadcast        | Choose a matchup; replay recorded turning points                     | Two accumulating positions on one calibrated field    | Ace, an energetic sporting star      |
| Roam  | An illustrated landscape           | Follow your progress; pan ahead or back to the start                 | Optional companion marker at the same weekly cutoff   | Rove, an outdoor explorer            |
| Loop  | A tactile circular sporting object | Drag/click the dial, use the keyboard or timeline, inspect a segment | Two rings with the same kilometre-to-angle mapping    | Luma, a friendly comet runner        |
| Tempo | A movement mixtape                 | Select an activity track; flip tape sides A/B                        | Current/reference distance ribbons at the same cutoff | Bop, a radio runner                  |

Loop replaces the rejected spring creature with a compact, expressive running character. Its main object also moves away from the coil sculpture toward a tactile orbit. Tempo replaces Patch completely: music graphics, a tape deck, and paired distance tracks create an alternative closer to Flip and Rally's expressive energy without repeating Roam's outdoors/collecting metaphor.

## Scoped brand systems

- **Flip:** tomato `#f04432`, ink `#171a1c`, chalk `#fcfcf9`; Bangers display and DM Sans body; inked borders, halftones, speech bubbles, rectangular chapter controls. Character and interaction language are comic storytelling.
- **Rally:** plum `#40234e`, tennis `#f6f253`, pale sporting surface `#fff9e9`; Archivo Black display and DM Sans body; oversized scoreboard typography, court lines, broadcast captions. The mascot comments on the matchup.
- **Roam:** cobalt `#174783`, sky `#e7effe`, sunshine `#ffe35e`; Outfit display and DM Sans body; expansive illustrated terrain, waypoints and a personal journal. The character inhabits the route.
- **Loop:** aubergine `#49324b`, coral `#f3765d`, mint `#76a18e`, light studio surface `#f7f5ed`; Outfit throughout; soft material surfaces, circular controls, an object shelf. The comet's motion relates to the orbit.
- **Tempo:** midnight `#182c42`, mint `#bdf3d4`, orange `#ff895b`; Space Grotesk throughout; album sleeves, tape mechanics, rectangular controls, paired distance ribbons. The radio character ties music and movement together.

These tokens are local to the design route. The product's existing design tokens and live UI are unaffected.

## Data and behavior

Reuse the existing design/spatial distance fixtures and zero-origin presentation model. Monday = 5.9 km, Tuesday = 13.0 km, Thursday = 19.2 km; three sample running imports sum to 19.2 km. The previous-week reference at the same Thursday cutoff is 16.0 km. Maya is 12.4 km at Tuesday and 20.1 km at Thursday, exposing a genuine sign reversal in the sample comparison.

The illustrative period is `[2026-10-12T00:00:00Z, 2026-10-19T00:00:00Z)`. Thursday is a fixed sample snapshot, not a claim about the current date or live activity. All views identify sample imports. No tracker, period, standings, membership, or scoring writes are introduced.

Replays start at zero and advance through three recorded milestones in a finite, manually initiated sequence. There is no autoplay or ongoing render loop. Reduced-motion users see the same milestones without animated travel. Scrubbing pauses playback. Native dialogs support Escape and focus restoration. Direct URLs restore a whitelisted concept; unknown values fall back to Flip, and browser Back restores a selected concept.

Rally's horizontal positions and Tempo's full tape ribbon share a fixed scale derived from both final comparison totals, stable throughout replay. Tempo's individual track ribbons share a 0–10 km scale; reference segments are differences between cumulative milestones. The tape is a visual metaphor, not audio or a recorded waveform.

Roam's horizontal position encodes accumulated distance in a scrolling window. Its hills are decorative fictional scenery, not GPS or elevation. The window is 10 km on phones and 30 km on wider screens and can pan beyond those initial ranges; there is no finish-distance cap. The start remains at absolute zero as the camera follows your movement.

Loop maps kilometres to angle using the same scale for both rings. Its rings have different radii, so their physical arc lengths should not be compared. Exact totals and signed gaps accompany the object. The smaller activity objects use a shared 10 km scale for each imported contribution.

## Artwork provenance

Five original transparent PNG mascots were generated with the built-in `image_gen` tool and copied into `apps/web/public/design/worlds/`. The exact prompt set and output paths are recorded in `docs/worlds-mascot-prompts.json`. No existing character IP was requested. Next Image supplies responsive optimized delivery. These are illustration assets, not rigged avatars or new dependencies.

## Evaluation

The lab's “Compare the ideas” view states each concept's mechanism and a distinct research question. Evaluate one complete action in each experience rather than asking whether the palette is appealing: follow a comic's change, replay a close matchup, return to a journey's origin, rotate and inspect an orbit, or flip a tape comparison.

Review evidence lives in `docs/worlds-reviews/`: desktop/phone captures and the browser verification record. Verification includes 320 px layouts, accurate same-cutoff comparisons, pointer/keyboard dial controls, native receipts, finite replay, reduced motion, navigation and image loading.
