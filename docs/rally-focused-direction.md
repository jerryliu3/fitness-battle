# Rally: the focused direction

Prototype: `/design/rally?view=week|matchups|moves|you&ink=on|off`.

This follow-up is stacked on the five-world exploration in PR #14. It converges on the user's selected direction instead of introducing more brands.

## Decisions

- **Locked: Rally and Ace.** The original Rally mascot asset is reused without modification on every screen, activity receipt and group preview. Ace remains active, friendly and encouraging. No alternative mascot is introduced.
- **Foundation: Rally's sporting structure.** Plum/tennis palette, Archivo Black display type, an accumulating mileage matchup, commentary and finite week replay. Four practical jobs—My week, Matchups, Moves and You—make this an app-shaped prototype.
- **Borrowed from Loop: small-move rings.** Each counted import appears as a tangible ring with its distance, title and duration. The weekly view uses a compact shelf; Moves gives each outing more room.
- **Optional from Flip: visual treatment only.** Inked borders, halftones, expressive headings, speech-like stickers and panels appear on highlights and receipts. Product navigation, the matchup and the mascot stay Rally. The study control “Comic accents” compares the treatments while keeping all data and the selected opponent unchanged. There is no Flip comic chapter flow.

The earlier five worlds remain reference explorations. Roam, Tempo, Zip and Luma are not part of the focused direction.

## Experience

**My week** defaults to you versus your own previous week. The replay updates accumulated distance, exact gaps, counted outings, ring fills and the selected highlight together. A starting cutoff displays zero; later activities are disabled until their replay milestone. Groups are secondary.

**Matchups** offers the personal ghost and nearby runners, plus a selector for the full sample field. Nine stable horizontal lanes use accumulated mileage on a common scale, rather than equally spaced ranked positions. Selecting a runner updates the matchup; lane order stays fixed as positions change. Exact distance place is secondary context.

**Moves** presents the three fixture imports as rings. Opening a ring shows the import's distance/duration, cumulative distance immediately after it, and a comparison at that same activity cutoff. Monday's receipt always compares Monday snapshots, even when opened from the current Thursday view.

**You** shows the illustrative athlete snapshot, a comparison of two Thursday snapshots, and explicitly labelled sample tracker imports. The previous week's 16.0 km is its Thursday snapshot, not a fabricated full-week total. No new personal-best, fitness, readiness or streak metrics are inferred.

## Ring meaning

Each activity ring uses a shared **10 km distance scale**, preserving the visualization the user liked in Loop. The partially filled arc shows mileage. “Counted” separately records that the imported activity is complete. The ring is not a prescribed target or a completion percentage for the user's workout. During week replay an activity's arc remains empty until its milestone; it cannot be opened before that cutoff.

## Brand system

All tokens are scoped to `.rally-focus`: plum `#40234e`, tennis `#f6f253`, pale sporting surface `#fff9e9`, and light activity surface `#fffdf7`. Display: Archivo Black; body: the existing DM Sans; optional accent type: Bangers. Rings use a plum arc for contrast against the light surface, with tennis highlights for counted status. Ace is the sole character asset, from `apps/web/public/design/worlds/rally.png` in the parent PR.

The combination should feel inviting and recognizably sporting. Core chrome remains calm enough to read; the highlight is where character and expressiveness can turn up. Comic accents use Rally's palette, preserving a coherent identity rather than importing Flip's red as another competing brand color.

## Implementation and boundaries

The focused prototype remains at `/design/rally`. In production, Rally is an **additive theme + accents**, not a replacement of core compete surfaces:

- Theme default: **Rally** (plum / tennis / Ace); **Form** and **Ink** remain full alternate shells
- Rally nav labels: My week / Matchups / Moves / You (same routes as My track / The field / Splits / Athlete)
- **Kept core:** 2D lanes + 3D Pursuit `FieldStage`, race-track / Form effort UI, numbered `ActivitySplits`, Athlete card, 1v1s, join/opt-out
- **Additive under Rally:** personal Matchup scoreboard + replay, activity rings, Ace accents, receipts
- Ace asset: `apps/web/public/design/worlds/rally.png` (shared by product Ace and `/design/rally`)

Prototype helpers stay presentation-only. Scoring, periods, auth, and tracker writes are unchanged.

View URLs and comic state are whitelisted. Browser Back restores the selected view and style; navigation stops replay and returns to the current Thursday snapshot. The manual replay advances through three recorded milestones, stops after Thursday, and has no idle animation loop. Reduced-motion CSS disables travel transitions. Native activity/detail dialogs support Escape and restore focus.

## Review

Browser evidence lives in `docs/rally-reviews/`. Verify the four views in both comic treatments, the one canonical mascot, personal/rival comparisons and their exact cutoffs, zero origin, finite replay, empty/not-yet-counted rings, activity receipts, navigation, optional group preview, phone layout and reduced-motion styles. Prior domain/model tests continue to apply; this follow-up changes presentation only.
