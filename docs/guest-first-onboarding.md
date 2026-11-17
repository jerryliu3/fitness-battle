# Sport-first onboarding — native and web

A first-time signed-out visitor opens the same journey on native `/welcome` and
web `/app/welcome`. Native `/` and web `/app` always send signed-out visitors
into this journey; the website's marketing page links into it too.

## Before account creation

1. **Choose a sport** — Running, Cycling, Walking or Strength in a visual 2×2 grid.
2. **Welcome athlete!** — a full-size interactive Crest, required single-line Athlete name field and
   optional photo. The card updates after a short edit delay, holding native bridge
   updates during rotation. No other profile questions appear here.
3. **Make training fun** — the existing competition player carries the chosen name
   and photo. Running/Cycling start in geographic 3D; Walking/Strength start in
   Timeline. A compact athlete card floats at the top-right and the
   pass result reads “You passed Alex!” without a large summary.
4. **Your story is just starting** — Growth, Crew and Health Lab tabs share one page.
   Growth opens first with the 500 → 2,000 trajectory; these points are never earned
   account facts. The single score reading and card score animate from 500 to 2,000 on every
   appearance. Crew uses its product relay graphic with Play and a scrubber.
   Health Lab includes a male/female model selector.
5. **Make it official** — the large Crest returns above email and password, with
   Create account and Terms/Privacy links. City, country and other preferences
   remain after signup. Existing-account sign-in stays on the first screen only.

One athlete-card renderer remains mounted throughout the introduction. Its loaded
portrait, rotation and WebView survive step changes; only transforms and in-memory
presentation values change. Native retains the full model inside the scene and
sends only changed fields across the bridge, avoiding repeated photo payloads
during score animation. It scales down and moves to the top-right for Overtake
and Discover, then returns to the center for signup. The practice count and growth
score update this presentation model without entering account facts.

Mobile uses a 360×640 composition fitted to the available safe-area viewport. Its
controls, visuals and card scale together. There is no page ScrollView, wordmark,
progress-bar row, card caption, or explanatory copy around Discover. Keyboard
avoidance can resize the fitted composition. Post-signup screens use a measured
content canvas; the long preferences form is divided into identity, event selection
and training-volume groups to keep each page usable without scrolling.

Crew discovery reuses the product CrewRelay graphic with the guest’s name/photo.
Health Lab reuses the product scan experience with in-memory preview readings;
neither preview activity nor health readings enter account or health state.

Back is a compact icon beside the primary action; the sign-in page puts it beside
the wordmark. Athlete card models are memoized and update after a short typing pause or when editing ends. Native queues model changes while held and deduplicates bridge
messages before painting the latest model on release.

Both platforms use the shared step order, titles, growth model, draft parser and
account matching rule in `packages/shared/src/onboarding-journey.ts`. The selected
Everyday Club tokens, chart components, rank artwork and athlete renderer remain
the visual foundation. The supplied storyboard informs sequence and composition.

Signed-in reviewers can open native `/welcome?preview=1` or web `/app/welcome?preview=1` to start at sport selection.
This uses fresh in-memory choices, does not save guest drafts or change the account,
and continues into the read-only post-account setup preview.

Sign in opened from onboarding has a Back control. Web preserves the preview
return path, opens outside the account shell's startup animation, and does not redirect an already-active session until Sign in is
explicitly submitted; other login entry points retain their normal behavior.
Native pushes the account screen onto the welcome stack, with a direct welcome
fallback when no navigation history exists. Successful onboarding sign-in resolves
account setup before Home, avoiding an intermediate Home flash.

## Draft and account handoff

Native AsyncStorage and web localStorage persist sport/name/city/country and an optional bounded JPEG data URL,
including edits before leaving a step. The guest draft has no account writes,
registration, activity, score, rank, awards or tracker permissions. Parsing discards
extra fields and invalid sports.

Photos stay device-local before signup. On explicit setup completion, a matching
guest photo uploads to the existing account-owned avatar path and the existing
`set-avatar` action persists it. A failed upload retains the draft for retry; account
switches cannot apply its result to another user.

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
2. Finish profile and preferences (three fitted pages on mobile): name, optional city/country/gender, time zone,
   sports, primary sport, distance units, optional typical weekly training volume
   and sleep tracking. Declarations are saved in the account draft, converted
   to metres/seconds/steps and sent through the existing `declare-effort` action
   only on explicit completion; the scorer retains its caps and verified-history
   protections.
3. Review choices and explicitly **Finish setup & register** for the next wave.

Ordinary signup remains available outside this journey. An incomplete account
without an account-matched completed introduction starts at sport selection.
Authenticated users complete the first four steps, then go directly into setup
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

pnpm --filter @fitness-battle/mobile exec expo start --dev-client --port 8089
# Press i for the current-worktree iOS development client.
```

For a fresh native build, first check Mapbox credentials in `apps/mobile/.env`
and `~/.netrc`, then `cd apps/mobile && pnpm ios --port 8089`.
Use the existing development client if native dependencies are unchanged.

Review all four sports, narrow screens, large text, keyboard scrolling, dark mode,
Reduced Motion, Back, replay, card rotation and card failure fallback. Check signup
with immediate sessions and email confirmation, failed signup, another account's
sign-in, skipping trackers, sleep-only setup, explicit registration and completed
account redirects. Live provider authorization and native device rendering require
a configured local environment.

