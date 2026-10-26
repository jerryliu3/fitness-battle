# Product-derived native refinement

The [field-first follow-up](field-first-followup.md), [PR #379](https://github.com/jerryliu3/fitness-battle/pull/379), rebuilds all three Compete directions around the actual 2D/3D field and adds one direction each for Progress, Crew and Profile. Open `/refine-next` for the follow-up collection. The earlier nine-screen stack below remains its foundation; validation recorded below predates the follow-up.

Nine focused native screens following the October 25 owner review of #340–343. This new stack starts from current `main` and the actual product components; it does not import the previous study kit or those 31 layouts. These are implementation candidates for visual review, not selected production layouts.

| Order | Tab | Directions | PR |
| --- | --- | --- | --- |
| 1 | [Compete](compete.md) | Weekly board / swipeable meets / sport rooms | [#345](https://github.com/jerryliu3/fitness-battle/pull/345) |
| 2 | [Progress](progress.md) | Training portfolio / training mix | [#351](https://github.com/jerryliu3/fitness-battle/pull/351) |
| 3 | [Crew](crew.md) | Shared clubhouse / together first | [#352](https://github.com/jerryliu3/fitness-battle/pull/352) |
| 4 | [Profile](profile.md) | Club passport / field pass | [#355](https://github.com/jerryliu3/fitness-battle/pull/355) |

Each PR builds on the previous PR in this new stack so the review shell and exact production primitives can be shared. No dependency on the former study PRs. Merge/review in order; use the Profile branch to run all four tabs together.

## Review locally

```sh
OVERTAEK_STUDY_PREVIEW=1 pnpm --filter @fitness-battle/mobile exec expo start --web --localhost --port 8083
```

Open `http://localhost:8083/refine`. Routes: `/refine-compete`, `/refine-progress`, `/refine-crew`, `/refine-profile`. `?concept=1` selects the first direction; the review toolbar switches concepts. `&compare=1` displays independent phones side by side. `&clean=1` shows only the product composition. Profile also supports `&public=1`.

Native uses the same components through `overtaek:///refine`. The existing four-tab bar is reused on Compete/Progress/Crew; Athlete is a full-screen native-stack destination. The Home tab opens current Home. Other tabs and the header avatar link to their new refinements.

The current product supplies AppText, sections, segments, sheets, avatars, Tabler icons, integration marks, chart scrubbing, capsule artwork, Crew trail and tab bar. New files live under `src/prototypes/product-refinement`. Local detail stacks retain parent scroll and selections; Back pops and Done closes. CrewRelay adds optional compact/readout and member-selection presentation props with unchanged defaults for production.

## What changed from the first exploration

- Compete: event scope and source lens have a deliberate hierarchy; leaderboards lead, meet cards actually swipe, chase/podium are supporting/closed-week visuals.
- Progress: visual comparisons and inspectable training are on the page; drilldowns expose matching dates, the journey and receipts. The atlas is a destination rather than the homepage.
- Crew: preserve the real shared trail; merge it with identity or center it. Plans, people and recaps are visible inline before navigation.
- Profile: a coherent athlete passport with three PB visuals inside it, shared between owner and public presentation.

Fictional fixtures never touch live auth, account, tracker, crew or scoring APIs. New UI uses current shared period/training readers; period/scoring rules are unchanged. Account, sharing, invitations and notification settings are explicitly previews where a real backend action would otherwise be required.

## Checks and limits

Workspace typecheck, complete mobile tests, UI contract, iOS/Android/Web export and Expo-web visual/interaction review. Reviewed at normal/narrow phone sizes and a desktop comparison. Native compilation/export is not installed-device QA: VoiceOver, larger text, edge gestures and native keyboard/safe-area behavior remain to review on device. Expo development overlays can show existing production SVG/React Native Web attribute warnings; screenshots dismiss those overlays without suppressing application errors.
