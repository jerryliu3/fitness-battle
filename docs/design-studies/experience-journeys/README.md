# A little more feeling

Three interactive storyboards for review, using Everyday Club's palette and the existing canonical Ember renderer. All sample totals and finishes are fictional. No account-store actions, tracker connections, scoring, rewards or enrollment writes run from these prototypes.

Open [the portable review](review.html), or use **Debug → Onboarding · concept preview** / **Experience concepts** in the app. Web route: `/app/experience-lab?flow=onboarding`; native: `/experience-lab?flow=onboarding`. Other flow values are `overtake` and `week`. On web, Debug retains its existing development-only visibility.

| Concept | Story | Interaction |
| --- | --- | --- |
| Your first little win | Meet Ember → choose a sport → try a pass → starting line | Sport selection, sample-effort slider on web / sample-session button on native, animated racer, progress, Back |
| Make the pass the hero | Session receipt → chase → crossing → finish | Frame both racers, animate through the crossing, reveal +1 and place change |
| A week worth remembering | Weekly trail → finish → consistency → next chapter | Session trail, third-place medal, seven-day volume chart and activity streak, explicit next-round sample registration |

The user asked for the feeling of Duolingo flows: short steps, graphics throughout, and an engaging payoff. These are original proposals, not findings about Duolingo. Mobbin reference lookup was unavailable because the connection requires a paid plan; no external screens were used or cited.

The real onboarding remains unchanged while these concepts are reviewed. The final preview button completes only the storyboard. Restart, previous-step controls and flow switching are available; native uses a sample-session toggle instead of a drag slider. Both platforms respect Reduced Motion. Web also exposes direct beat selection. Native layouts are implemented but still need release-device visual verification.

The separate production replay fix retains every captured lane and its actual value. Its presentation window fits the active pair vertically and horizontally; passive oval playback fits the course. UI panels sit outside the actor stage. The normal interactive field geometry and width floor remain unchanged.

## Rebuild

Run `node docs/design-studies/experience-journeys/build-review.mjs` from the repository root. This bundles the actual React component and canonical Ember scene into the self-contained HTML. It uses the existing esbuild dependency through Vite/Vitest and embeds the installed Manrope fonts when present.

## Verification

- Workspace typecheck and production web build.
- Shared field geometry and competition moment regression tests; native/web skip, Reduced Motion, and confirmation tests.
- Browser walkthrough across all three storyboards at desktop, 390 px and 320 px; verify sport selection, effort input, completion, restart and Reduced Motion.
