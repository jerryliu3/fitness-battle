# Sport-first onboarding — native and web

A first-time signed-out visitor opens the same journey on native `/welcome` and
web `/app/welcome`. Native `/` and web `/app` always send signed-out visitors
into this journey; the website's marketing page links into it too.

## Before account creation

1. **Choose a sport** — Running, Cycling, Walking or Strength in pastel 2×2 tiles with native emoji. Running/Strength use male emoji, Cycling/Walking use female emoji; the moving sports face right. Selecting a tile advances immediately; there is no Continue action on sport selection.
2. **Welcome athlete!** — a full-size interactive Crest, required single-line Athlete name field and
   optional Upload profile photo button. The card updates after a short edit delay, holding native bridge
   updates during rotation. No other profile questions appear here.
3. **Make training fun** — the existing competition player carries the chosen name
   and photo. Running/Cycling start in geographic 3D; Walking/Strength start in
   Timeline. A compact athlete card floats at the top-right and the
   pass result reads “You passed Alex!” without a large summary.
4. **Discover** — Growth, Crew and Vitals tabs share one page, headed See progress, Work together or Monitor health.
   Growth opens first with the 500 → 2,000 trajectory; these points are never earned
   account facts. The single score reading and card score animate from 500 to 2,000 on every
   appearance. Crew uses its product relay graphic with Play and a scrubber, plus an animated sport-specific weekly goal reaching 60%.
   Vitals defaults to the male model and includes a male/female selector. Its actual renderer mounts behind the tabs as soon as Discover opens and remains mounted across tab changes.
5. **Make it official** — the large Crest returns above email and password, with
   account creation and Terms/Privacy links. City, country and other preferences
   remain after signup. Existing-account sign-in stays on the first screen only.

One athlete-card renderer remains mounted throughout the introduction. Its loaded
portrait, rotation and WebView survive step changes; only transforms and in-memory
presentation values change. Native retains the full model inside the scene and
sends only changed fields across the bridge, avoiding repeated photo payloads
during score animation. It scales down and moves to the top-right for Overtake
and Discover, then returns to the center for signup. The practice count and growth
score update this presentation model without entering account facts. The card uses the
current product metadata/layout, with empty personal bests, unavailable podiums and
blank lifetime totals until real account data exists.

Mobile uses a 360×640 composition fitted to the available safe-area viewport. Its
controls, visuals and card scale together. There is no page ScrollView, wordmark,
card caption, or explanatory copy around Discover. A thin progress-pill row remains above
the canvas. Keyboard avoidance preserves its scale and shifts only to reveal the focused
field. Post-signup screens use a measured
content canvas for final details, tracker connections, and the combined training-volume/entry ticket.

Crew discovery reuses the product CrewRelay graphic with the guest’s name/photo.
Vitals reuses the product scan experience with in-memory preview readings;
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
guest photo replaces any existing avatar at the account-owned avatar path and the existing
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

Native `/onboarding` and web `/app/onboarding` have three pages:

1. **Almost there! Final details** — optional city/country together, unselected gender,
   time zone with a zone-specific GMT offset, and units. The country picker has flags
   and a searchable sheet on native. The saved athlete name is retained.
2. **Bring your training along** — connect/sync trackers or continue without one.
   Onboarding omits recap previews, file imports and the separate calibration action.
   First device and cloud syncs request up to 90 days of workouts after authorization;
   the existing sync flow has no separate history-range chooser. Provider/OS limits apply.
3. **Starting line** — optional weekly volume for the selected sport above a compact
   entry ticket. This question is omitted when accepted, real synced workouts exist
   for that sport. A connection with no workouts does not suppress it. Back returns
   to trackers before registration. Continue registers the event and flips the same
   ticket to its confirmed face; the final Continue enters the app. No fourth page.

Practice rivals use the same stock portrait URLs already used by Goalmaxxing:
Alex uses its male portrait and Maya its female portrait. The guest’s own chosen
photo always takes precedence for their athlete. These are presentation identities
only and never replace a real account’s profile photo.

Weekly declarations retain the shared metres/seconds/steps conversion and scoring
protections. Preview mode exercises the same pages without registration or account writes.

Ordinary signup remains available outside this journey. An incomplete account
without an account-matched completed introduction starts at sport selection.
Authenticated users complete the first four steps, then go directly into setup
without creating another account. Completed accounts are never forced back into
the introduction. The completion marker is device-local; another device may
repeat the introduction before completing setup. Restored sessions
continue setup, allowing tracker callback destinations. Completing setup clears its
account draft and the imported guest draft. Web preserves the requested return path through the introduction and setup; return paths cannot loop back into
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

Review all four sports, narrow screens, large text, keyboard field visibility, dark mode,
Reduced Motion, Back, replay, card rotation and card failure fallback. Check signup
with immediate sessions and email confirmation, failed signup, another account's
sign-in, skipping trackers, sleep-only setup, explicit registration and completed
account redirects. Live provider authorization and native device rendering require
a configured local environment.

