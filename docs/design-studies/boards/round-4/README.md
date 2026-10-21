# Progress paths — consumer reference review

October 20, 2026 · `/design/boards` · fictional presentation data

This round keeps Banked trail as the selected comparison and replaces the other four progress options. It also moves the straight-track lane numbers behind the zero start line, retains the oval’s numbers behind its start, and removes repeated distance labels from all ground surfaces. Athlete totals and the shared side axis remain. Whole-kilometer cross-track paint on the red straightaway is retained as part of its athletics surface.

## Research and interpretation

These are first-party product references, checked October 20, 2026. The adaptations below are our design interpretations, not claims that these products use the exact proposed geometry or that the patterns have proven motivation benefits.

| Product / source | What the product demonstrates | Useful interpretation for Compete |
| --- | --- | --- |
| [Strava Activity Replay](https://support.strava.com/en-us/articles/15401546-activity-replay) | Animated playback of an activity route, with selected achievements highlighted | Make accumulated travel readable as a path; keep the current position distinct from its history |
| [Relive](https://www.relive.com/) | Activities presented as stories and animated 3D videos | A trace can remain on the ground as the athlete moves; the complete journey matters as well as the current marker |
| [Duolingo’s path design](https://blog.duolingo.com/new-duolingo-home-screen-design/) | Individual learning levels arranged along a long, scrollable path; completed steps remain available | Let sourced efforts make separate pieces of the visible journey rather than smoothing every session into one fill |
| [Fog of World](https://fogofworld.app/en/) | Travel clears previously unexplored routes, leaving a visible record of visited ground | Change a narrow strip of ground instead of adding a conventional progress bar |
| [Forza Horizon 5 Rally Adventure](https://forza.net/news/forza-horizon-5-rally-adventure-now-available) | In-world split gates at route intervals and an optional driving line | Keep route cues in the world, distinct from the moving object. The racing guidance is for navigation, so we do not copy its future-direction or speed colors as earned distance |

The main recommendation is to separate the enduring record from the afterimage animation. The wake is motion/identity; an earned trace should reach the athlete’s actual coordinate. Reserving a fixed screen-space wake gap explains the old Banked trail’s detached endpoint, but it also makes the earned amount look incomplete. The four alternatives route beside that space instead of reducing the distance drawn. There is no artificial finish or percentage target.

## Four replacements

| Treatment | Visual mechanism | Endpoint and meaning |
| --- | --- | --- |
| Dotted route | Round, world-anchored breadcrumbs; the path bends onto the shoulder before the echoes | Dots accumulate from zero; the endpoint ring is at the exact current distance. Dots are white on darker grounds and gold/ink on pale grounds. Their spacing is decorative, not a fractional distance ruler |
| Waypoint cord | One fine continuous line with an open waypoint and short connection toward the capsule | The waypoint sits beside the capsule at the same accumulated distance; no arbitrary longitudinal gap |
| Session tiles | Rounded, proportional pieces with seams at actual source-session boundaries | Each piece corresponds to a counted activity, with no fabricated segments when history is unavailable. Long visible sessions can look continuous; Fit field reveals the broader sequence |
| Revealed ground | A narrow hatched shoulder becomes clear, lightly colored ground after it has been traversed | Completed and unexplored surfaces meet at the capsule’s actual distance. The echo corridor stays open |

Banked trail retains its taper and explicit wake clearance for comparison. It remains the default until another treatment is selected. The previous Edge lights / Session thread / Kilometer stamps / Session tokens remain historical captures and are removed from the active catalog; their old URL IDs fall back to the default.

All five use the same field values, canonical capsules and source-session inspection. The four replacements share one paint renderer between straight/winding fields and the oval. Oval shoulder offsets follow the local normal so the endpoint remains beside the athlete on bends; loop totals still distinguish repeating positions. Offscreen capsule indicators reserve only their visible heads, rather than erasing a wake that is not drawn.

## Review

Start with `/design/boards?background=trail&progress=dots&zoom=map`, then compare `progress=cord`, `tiles`, `reveal` and `deposit`. The Dotted route is the closest response to the user’s suggested treatment; Waypoint cord is the clearest exact endpoint; Session tiles best explains the composition of the total; Revealed ground is the most environmental option. These are review judgments, not user-test results.

The [study README](../../../../apps/web/src/app/design/_studies/board-lab/README.md) describes integration boundaries. This is still a protected presentation study; activity scoring, native surfaces and account preferences are outside this round.

### Captures

- [Dotted route](round4-progress-dots.png), [Waypoint cord](round4-progress-cord.png), [Session tiles](round4-progress-tiles.png), [Revealed ground](round4-progress-reveal.png), [Banked comparison](round4-progress-deposit.png)
- [Corrected start](round4-straight-start.png) and [phone start](round4-phone-start.png)
- [White dots on Road ribbons](round4-road-dots.png), [phone Meadow Trail](round4-phone-dots.png), [phone oval](round4-oval-dots.png)

### Verification

- Monorepo `pnpm typecheck` passes; all 17 study tests pass, including bounded world samples, wake bypass and normal-aligned oval endpoints.
- `pnpm build:web` passes, including the protected study route and lazy scenic 3D boundary.
- [Recorded browser assertions](round4-verification.json) cover 135 field/progress/viewport combinations at 1440, 390 and 320 px. No repeated lane distance labels, page-level overflow or browser runtime errors.
- Interaction checks cover numbers behind the start, exact endpoint alignment for all four new traces, world-fixed breadcrumbs on pan, session inspection, persistent expansion, gain to 21.4 km, mile loops, lap rollover and URL restoration.
