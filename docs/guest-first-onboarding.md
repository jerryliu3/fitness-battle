# Sport-first onboarding — native and web

A first-time signed-out visitor opens the same journey on native `/welcome` and
web `/app/welcome`. Native `/` and web `/app` route returning guests to Home;
the website's marketing page links into the journey.

## Before account creation

1. **Choose a sport** — Running, Cycling, Walking or Strength in a two-column grid.
2. **Make your first overtake** — the existing competition player uses the selected
   sport. Running/Cycling support geographic 3D and 2D; Walking/Strength use points
   in 2D. Playback, replay, speed and Continue belong to the existing player.
3. **See your potential** — a possible Effort Score trajectory from 1,000 to 1,210
   and the existing Active → Challenger rank art. Potential values never become
   account facts and do not promise a particular result.
4. **Create your athlete** — name and primary sport update the existing interactive
   3D Crest. City and country are optional profile preparation. Native retains a
   readable card while the remote scene loads or fails.
5. **Save your athlete** — retain the Crest, then enter the existing email/password
   signup. Sign in and Explore remain available. No new auth providers are added.

Both platforms use the shared step order, titles, growth model, draft parser and
account matching rule in `packages/shared/src/onboarding-journey.ts`. The selected
Everyday Club tokens, chart components, rank artwork and athlete renderer remain
the visual foundation. The supplied storyboard informs sequence and composition.

## Draft and account handoff

Native AsyncStorage and web localStorage persist only sport/name/city/country,
including edits before leaving a step. The guest draft has no account writes,
registration, activity, score, rank, awards or tracker permissions. Parsing discards
extra fields and invalid sports.

On signup, save the latest name and intended email before auth can navigate.
Post-account setup imports a guest draft only for a matching email. Failed signup
clears the pending marker; email confirmation can complete later on the same
device/browser. Unrelated signed-in accounts do not inherit the guest profile.
A new browser/device cannot recover the device-local draft.

The existing authenticated reducer and persistence path remain the only writers.
No scoring, period, OAuth or database semantics change. Missing integrations keep
their existing unavailable/not-connected states. Production and preview copy match;
preview mode remains read-only in the data layer.

## After account creation

Native `/onboarding` and web `/app/onboarding` have three stages:

1. Connect trackers, or skip until later.
2. Finish profile and preferences: name, optional city/country/gender, time zone,
   sports, primary sport, distance units and sleep tracking.
3. Review choices and explicitly **Finish setup & register** for the next wave.

Existing incomplete accounts can finish without a guest draft. Restored sessions
continue setup, allowing tracker callback destinations. Completing setup clears its
account draft and the imported guest draft. Web return paths cannot loop back into
onboarding or welcome. No account signup, tracker connection or registration is
performed by the guest journey.

## Local review

From `/Users/jerryliu/.codex/worktrees/58bd/fitness-battle`:

```sh
pnpm dev:web
# Open http://localhost:3000/app/welcome

pnpm --filter @fitness-battle/mobile exec expo start --dev-client --port 8082
# Press i for the current-worktree iOS development client.
```

For a fresh native build, first check Mapbox credentials in `apps/mobile/.env`
and `~/.netrc`, then `cd apps/mobile && pnpm ios --port 8082`.
Use the existing development client if native dependencies are unchanged.

Review all four sports, narrow screens, large text, keyboard scrolling, dark mode,
Reduced Motion, Back, replay, card rotation and card failure fallback. Check signup
with immediate sessions and email confirmation, failed signup, another account's
sign-in, skipping trackers, sleep-only setup, explicit registration and completed
account redirects. Live provider authorization and native device rendering require
a configured local environment.
