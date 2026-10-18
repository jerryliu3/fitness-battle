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

## Selected material and interaction exploration

The [material and motion study](material-and-motion-concepts.md) records the October 16 user review: Glass Track, dimensional weekly results, PR history, cooperative crew goals, weekly training history, a conditional daily clock, and a return moment integrated into Compete. Its [standalone review](design-studies/material-motion/review.html) uses fictional data. These are candidates for later implementation; Focus remains the production direction. Personal Home targets are a separate optional feature proposal and do not define competition completion or alter scoring.
