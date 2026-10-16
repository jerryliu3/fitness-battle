# Product design guide — Focus

The selected production direction is **Focus**, with Trail's crew hierarchy and top-of-profile benchmarks/Elo (user decision, October 16, 2026). The older direction studies remain available for reference.

## Shared visual language

The palette lives in `packages/shared/src/shell.ts`, is exported to native `src/theme.ts`, and is mirrored in web Focus CSS and native HeroUI variables. Legacy token keys remain compatible with existing components:

| Token | Value | Role |
| --- | --- | --- |
| ink / plum | `#26382d` | Typography and primary actions |
| tennis | `#d4ee89` | Selected navigation, own lane, progress accents |
| paper | `#fafbf8` | Page background |
| card | `#ffffff` | Controls, sheets, cards |
| muted | `#768172` | Secondary labels |
| line | `#e0e5dd` | Quiet borders and separators |
| starEmber | `#f5c451` | Existing Ember artwork; unchanged |

Use DM Sans for product UI, restrained display sizes, readable supporting copy, 44px+ touch controls, and generous spacing. Cards have soft 20–28px corners; the winding path and the lanes remain custom product components. Respect reduced motion. Browser dialogs use Radix focus management; native detail panels support back/dismiss and keyboard avoidance.

## Information architecture

The visible tabs are **Home / Arena / Crew / Athlete**. Stable route IDs remain `/today`, `/arena`, `/field`, and `/you` so existing deep links continue to work.

- Home: one recommendation, an expandable summary, then the winding recent counted-session path. Empty and future sessions never invent activity.
- Arena: active sports, registration panel (solo / eligible crew), separate score tracks, current vertical lanes, prior-self ghost, awards, and benchmark links. No replay or hypothetical effort controls.
- Crew: Trail-style club identity, shared week progress, activity/standings, members, invites and existing supported crew actions. Empty/live/demo states remain honest.
- Athlete: centered identity; **season summary, Elo, and benchmarks near the top**; progress, connections, preferences and account settings behind focused sections.

## Lane viewport contract

2D and 3D use the same athlete values and viewport. Lane identity stays fixed when standings change; the user's lane is centered among peers. Default longitudinal range is ±3 km (±10 effort points for non-GPS) around the user, independently of the most distant competitor. Zoom and pan only change presentation. Center me restores the athlete-following window; Fit field explicitly widens to include everyone. Out-of-range 2D markers show arrows and true totals rather than pretending those athletes sit at the edge distance. Past you is never ranked.

Web retains the real Three.js renderer. Native 2D is SVG; native 3D embeds the same web renderer and receives bounded, credential-free presentation messages. It requires the corresponding web deployment and a configured `EXPO_PUBLIC_API_URL`. An unavailable renderer falls back to native 2D. New native binaries must include the Expo-supported `react-native-webview` dependency.

Account data, periods, scoring, and backend eligibility rules are not replaced by prototype fixtures. Existing live-connection and synthetic-peer disclosures must remain accurate.
