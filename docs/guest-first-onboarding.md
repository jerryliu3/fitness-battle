# Sport-first onboarding — native and web

A first-time signed-out visitor opens the same journey on native `/welcome` and
web `/app/welcome`. Native `/` and web `/app` always send signed-out visitors
into this journey; the website's marketing page links into it too.

## Before account creation

1. **Choose a sport** — Running, Cycling, Walking or Strength in a two-column grid.
2. **Make training a game** — the existing competition player uses the selected
   sport. Running/Cycling start in geographic 3D; Walking/Strength start in Timeline,
   showing steps/hours. View switching, playback, replay, speed and Continue
   belong to the existing competition player and shared field policy. Native uses
   the full remaining screen rather than a fixed-height card inside a scroll view.
   Charts size from their actual container so embedded Strength/Walking replays
   are not cropped by a taller window.
3. **See your potential** — a possible Effort Score trajectory from 500 to 2,000,
   focused on how training adds up. No rank ladder is introduced here and the
   potential values never become account facts.
4. **Explore features** — Crew goals and weekly leaderboard examples follow the
   chosen sport, with tabs for Crews, Leaderboards and Vitals Lab.
5. **Create your athlete** — name and primary sport update the existing interactive
   3D Crest. City and country are optional profile preparation. Native retains a
   readable card while the remote scene loads or fails.
6. **Save your athlete** — email and password appear directly beneath the Crest,
   with a Create account confirmation and the existing Terms/Privacy links.
   Existing-account sign-in remains on the first screen only. There is no
   guest-exploration exit or dismissed-introduction flag. No new auth providers
   are added.

Back is a compact icon beside the primary action; the sign-in page puts it beside
the wordmark. Athlete card models are memoized and update when editing ends, not
on every keystroke. Native queues model changes while held and deduplicates bridge
messages before painting the latest model on release.

Both platforms use the shared step order, titles, growth model, draft parser and
account matching rule in `packages/shared/src/onboarding-journey.ts`. The selected
Everyday Club tokens, chart components, rank artwork and athlete renderer remain
the visual foundation. The supplied storyboard informs sequence and composition.

Signed-in reviewers can open `/app/welcome?preview=1` to start at sport selection.
This uses fresh in-memory choices, does not save guest drafts or change the account,
and continues into the read-only post-account setup preview.

Sign in opened from onboarding has a Back control. Web preserves the preview
return path, opens outside the account shell's startup animation, and does not redirect an already-active session until Sign in is
explicitly submitted; other login entry points retain their normal behavior.
Native pushes the account screen onto the welcome stack, with a direct welcome
fallback when no navigation history exists. Successful onboarding sign-in resolves
account setup before Home, avoiding an intermediate Home flash.

## Draft and account handoff

Native AsyncStorage and web localStorage persist only sport/name/city/country,
including edits before leaving a step. The guest draft has no account writes,
registration, activity, score, rank, awards or tracker permissions. Parsing discards
extra fields and invalid sports.

On inline signup, save `introCompleted: true`, the latest profile and intended
email before auth can navigate. Email confirmation is shown on the same screen.
Post-account setup imports a guest draft only for a matching email. Failed signup
clears the pending marker; email confirmation can complete later on the same
device/browser. Unrelated signed-in accounts do not inherit the guest profile.
A new browser/device cannot recover the device-local draft.

The existing authenticated reducer and persistence path remain the only writers.
The merged weekly Effort Score, period, OAuth and database semantics are retained. Missing integrations keep
their existing unavailable/not-connected states. Production and preview copy match;
preview mode remains read-only in the data layer.

## After account creation

Native `/onboarding` and web `/app/onboarding` have three stages:

1. Connect trackers, or skip until later.
2. Finish profile and preferences: name, optional city/country/gender, time zone,
   sports, primary sport, distance units, optional typical weekly training volume
   and sleep tracking. Declarations are saved in the account draft, converted
   to metres/seconds/steps and sent through the existing `declare-effort` action
   only on explicit completion; the scorer retains its caps and verified-history
   protections.
3. Review choices and explicitly **Finish setup & register** for the next wave.

Ordinary signup remains available outside this journey. An incomplete account
without an account-matched completed introduction starts at sport selection.
Authenticated users complete the first five steps, then go directly into setup
without creating another account. Completed accounts are never forced back into
the introduction. The completion marker is device-local; another device may
repeat the introduction before completing setup. Restored sessions
continue setup, allowing tracker callback destinations. Completing setup clears its
account draft and the imported guest draft. Web return paths cannot loop back into
onboarding or welcome. Tracker connections and competition registration remain in post-account setup.

## Local review

From `/Users/jerryliu/.codex/worktrees/58bd/fitness-battle`:

```sh
pnpm dev:web
# Open http://localhost:3000/app/welcome?preview=1

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

