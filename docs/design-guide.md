# Product design guide — Open Field

The selected production direction is **Open Field** (with Everyday Club's warm neutral palette and Focus IA, user decision October 17, 2026).

## Brand and character exploration

The [Brand & Ember study](brand-study/brand-and-ember-studio.md) is available at `/design/brand` under the existing design access gate. It preserves ten brand territories, adds the current Ember in a Chain Reaction-inspired setting, and explores Everyday Club, Open Field and Pocket Arena as calmer foundations for customizable star finishes. The October 17 review selects Open Field’s structure with Everyday Club’s warm white, charcoal and gold. Ember’s preferred art references are The Pass / Challenger, Marginal Gains and Higher Ground, with shared anatomy and adjustable finishes. The study locker uses local fictional ownership and proposed unlock examples; it does not establish production rewards, entitlement, scoring or storage rules.

## Shared visual language

The palette lives in `packages/shared/src/shell.ts`, is exported to native `src/theme.ts`, and is mirrored in web Focus CSS and native HeroUI variables. Legacy token keys remain compatible with existing components:

| Token | Value | Role |
| --- | --- | --- |
| ink / plum | `#282f2c` | Charcoal typography and primary actions |
| tennis / gold | `#f1c75b` | Selected navigation, own lane, live indicator, and warm gold accents |
| paper | `#fafaf7` | Warm white page background |
| card | `#ffffff` | Controls, sheets, cards |
| muted | `#616c63` | Calmer secondary labels |
| line | `#e0e5dc` | Quiet borders and separators |
| starEmber | `#f1c75b` | Canonical warm gold Ember artwork |
| secondary | `#819486` | Historical comparisons / baseline |
| soft | `#eef0e9` | Subtle highlights, badges, and pill backgrounds |

Use DM Sans for product UI, restrained display sizes, readable supporting copy, 44px+ touch controls, and generous spacing. Cards have clean 16px corners with 3px bottom borders; primary buttons have a 3px tactile base. Respect reduced motion. Browser dialogs use Radix focus management; native detail panels support back/dismiss and keyboard avoidance.

## Information architecture

The visible tabs are **Home / Compete / Crew / Athlete**. Stable route IDs remain `/today`, `/arena`, `/field`, and `/you` so existing deep links continue to work. Tab label is **Compete** (not Arena).

- Home: one recommendation (expands in-place for detail), then the winding recent counted-session path. Empty paths stay quiet — no invented activity and no “connect/sync” empty copy on the path itself.
- Compete (`/arena`): active sports, registration panel (join / eligible crew — never “solo” wording), separate score tracks, current vertical lanes, prior-self ghost, awards, and benchmark links. A disabled **1v1 · Coming soon** teaser is allowed; no live 1v1 yet.
- Crew: Trail-style club identity, shared week progress, activity/standings, members, invites and existing supported crew actions. Signed-out/demo states preview what crews unlock. Empty/live states remain honest.
- Athlete: profile card with portrait, name, city, and email; **season summary, Elo, and benchmarks near the top**. Account controls follow Strava/Duolingo-style IA: a short list on Athlete that opens a Settings hub and separate screens (not a wall of expanders).

## Lane viewport contract

2D and 3D use the same athlete values and viewport. Lane identity stays fixed when standings change; the user's lane is centered among peers. Default longitudinal range is ±3 km (±10 effort points for non-GPS) around the user, independently of the most distant competitor. Zoom and pan only change presentation. Center me restores the athlete-following window; Fit field explicitly widens to include everyone. Out-of-range 2D markers show arrows and true totals rather than pretending those athletes sit at the edge distance. Past you is never ranked.

Web retains the real Three.js renderer. Native 2D is SVG; native 3D embeds the same web renderer and receives bounded, credential-free presentation messages. It requires the corresponding web deployment and a configured `EXPO_PUBLIC_API_URL`. An unavailable renderer falls back to native 2D. New native binaries must include the Expo-supported `react-native-webview` dependency.

Account data, periods, scoring, and backend eligibility rules are not replaced by prototype fixtures. Existing live-connection and synthetic-peer disclosures must remain accurate.

Athlete's Account settings destination contains Sign out, Report an issue and Delete account on web and native. These actions belong inside Account rather than on the Athlete overview or in Preferences.

## Production motion implementation

One live lane canvas should change bounds when expanding, retaining its selection, zoom and horizontal anchor. Expanded web lanes live in a root dialog with attached controls, Escape, scroll locking and focus return. Embedded touch lanes allow page scrolling; vertical field exploration requires fullscreen web lanes or native's explicit Explore mode. Programmatic viewport changes interpolate center and span together; direct manipulation interrupts immediately. Center me restores following.

Give each transform one animation owner. Fade sheet scrims independently, retain surfaces through exit, preserve parent scroll behind settings, and respect reduced motion. Haptics follow deliberate actions or confirmed outcomes, not decorative animation callbacks. The [production repair review](reviews/motion-regressions-2026-10-19.md) tracks remaining gaps against the 18-flow prototype, including native fullscreen expansion and medal detail.

## Selected material and interaction exploration

The [material and motion study](material-and-motion-concepts.md) records the October 16 user review: Glass Track, dimensional weekly results, PR history, cooperative crew goals, weekly training history, a conditional daily clock, and a return moment integrated into Compete. Its [standalone review](design-studies/material-motion/review.html) uses fictional data. These are candidates for later implementation; Focus remains the production direction. Personal Home targets are a separate optional feature proposal and do not define competition completion or alter scoring.

The [overtake motion study](design-studies/overtake-motion.md) records the user’s selected motion direction: Photo Finish on every pass combined with combo/+1 overtake feedback; The Chase logo arrival with Split Second’s afterimage; and Afterimage typography. Round 2 explores staggered over / taek rows and continuous glyph-to-jetstream trails. These remain presentation prototypes; production scoring, tracker behavior, and brand assets are unchanged.

The [Art of the Pass study](design-studies/the-pass/README.md) at `/design/pass` explores 15 app icons and 8 vertical lane treatments. It connects the moment of overtaking to a small, text-free symbol, alongside three typographic alternatives, with ten trail/wake directions, small-size comparisons and a browser-local shortlist. Everyday Club’s neutral product shell remains the backdrop. These are candidates for review, not a selected production icon or a change to the lane viewport contract.

The next review narrows the candidates to **Twin trails, Afterimage and Open Track**, with the user leaning toward Afterimage and Open Track. Round 2 adds eight Afterimage variants, four Open Track variants, matching icon/field geometry, and independently flowing backward wakes on all three shortlisted fields. Dense slower-racer echoes, no-rival-wake, gold, canonical Ember, lane-marker and light/charcoal treatments remain presentation alternatives. Continuous flow is illustrative rather than a live speed measurement; reduced motion and a manual trail pause are preserved.

The user selects **Afterimage as the identity direction** in Round 3 and drops lane lines from the logo. The remaining form decision is hollow versus solid circles, with filled Ember (always showing its canonical face) and an outlined Ember as the only character alternatives. The study compares eight yellow/gold pairings across white, grey and black, plus equal wakes and a subtly slower rival wake. These controls update the icon and sample field together. This locks the design territory; final head treatment, colors and production asset integration remain open.

The October 18 decision settles **hollow circles on white, no lane rules in the logo, and the subtly slower rival wake**. Gold/silver is the working palette, with rich gold/silver retained as the immediate alternative; the exact gold shade remains under consideration. The review defaults to this selection, preserves the earlier gold/violet favourite and all exploration history, and records the decision in the study README. Production icon packaging and integration are not part of this documentation PR.

The finalized production icon is **rich gold (#dfad3c) / silver (#9fa5af)** on white with hollow circles and the subtly slower rival. The production mark is now **Shared Start**: six gold echoes extending to the endpoint of the silver racer’s four-echo wake. Both circles stay hollow. The canonical master and platform packaging are documented in `assets/brand/README.md`; the other wake treatments remain exploration history.

The followup [material objects study](design-studies/the-pass/MATERIALS.md) explores eight finishes and five silhouettes on the bold 135% geometry, paired with matching animated fields. It is a presentation study stacked on the background/scale comparisons; Shared Start remains the production icon and no material has been selected for rollout.

The [Round 6 glass exploration](design-studies/the-pass/GLASS.md) narrows the new forms to capsules and open loops and follows the supplied Photos reference through uniform tinted faces, polished edges and alpha overlap. Eight variations retain Amber Capsule, Glazed Ceramic and Frosted Pebble as comparison options. This remains a study; production Shared Start assets are unchanged.

The focused followup at `/design/pass?view=finishes` compares standard capsule and fine loop across uniform glass, original Amber tinted glass, satin glass and fired glaze. Uniform glass defaults to matched 50% alpha for gold/silver, with 38% and 64% presets on a fixed palette. Earlier favorites and study rounds remain available; this does not change production icon selection.

The identity exploration now selects the standard 40×58 capsule as its form. The active color lab retains all four finishes, offers 26/38/50% uniform glass, excludes wakes from live heads, and provides 10 independent gold and silver/platinum choices each. Material and color selection remain open; production app-icon packaging follows that final selection.

The Pass capsule study (`?view=finishes`, October 19) adds three Photos-inspired perimeter-lighting options alongside its four existing finishes. All use the satin wake and curved head exclusion in icon and lane previews. Materials and palette remain exploratory; see `docs/design-studies/the-pass/GLASS.md`.

The active finalist comparison is now Satin glass, Fired glaze, Rolled glass and Polished glass. Rolled/Polished face opacity spans 26%, 38%, 50%, 60%, 70%, 80% and 90%; their shared satin wake is independent of face opacity.

Selected production identity: **Polished glass at 80% alpha**, Solar Gold `#ffc400` and Cool Platinum `#c9d6e3`, with four fading echoes. Capsule heads are scaled to **162.5%**, with their centers held at the selected positions from the scale study. The same icon identity now appears in web metadata, install icons and native app icons, and the same capsule renderer replaces the former circle markers in the web and native 2D lanes. The wake flows backwards, is clipped at the capsule's curved outline, and pauses for reduced motion or inactive screens. See `assets/brand/README.md` for generated asset locations and regeneration instructions.
