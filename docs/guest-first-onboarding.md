# Guest-first onboarding (native)

This flow reuses Overtaek's real competition playback, illustrative score chart, and 3D Athlete Crest. Guest previews **never** create a recorded workout, a score, a rank, a registration, or a friend activity.

## Before account creation

A fresh signed-out install routes from `/index` to `/welcome`. An existing session or returning guest opens `/today`.

1. **Choose your sport**: Running / Cycling / Walking / Strength. One starting sport, not yet a registration.
2. **Try an overtake**: the existing CompetitionMoment and LaneTrack, driven by an illustrative moment for that sport; Running/Cycling can switch to 3D, Walking/Strength use effort points in 2D.
3. **See your potential**: an example effort score of 1,000 → 1,210 and actual rank ladder names Active → Challenger. Always explicitly marked illustrative and not earned.
4. **Create your athlete**: enter display name, optional city/country, and view the live preview in AthleteCrest. A read-only profile card is visible while its 3D scene loads or is unavailable. No actual effort score is assigned.
5. **Save your athlete**: Create account opens the existing native email/password sign-up form; Sign in and Explore remain available. Apple/Google social login are not introduced by this PR.

There are no health permissions or tracker requests in this sequence. The welcome preview is resumable only as a local draft; reopening the app after leaving it uses the normal Home entry.

## Guest → new account handoff

- `overtaek-guest-intro-draft-v1` stores the selected sport, display name, city and country code on device.
- `overtaek-guest-intro-seen-v1` marks the guest introduction dismissed when leaving it.
- On a **new signup attempt only**, `overtaek-guest-signup-email-v1` records the intended email before Supabase auth can navigate. Failed signup clears that marker. Email confirmation can happen later.
- After authentication, the incomplete account's onboarding imports the guest draft only when that account's email matches the pending signup email. Logging into an unrelated existing account does not import the guest profile.
- The draft and signup marker are removed after successful onboarding. No preview scores, activities, permissions or ranking data are transferred.

## After account creation

Existing `/onboarding` now has three stages:

1. **Connect trackers (optional)**, using the current tracker integrations.
2. **Finish personal details and select actual competition events**: prefilled guest name, city, country and sport can be edited. Gender is optional; time zone, additional sports, units, sleep preference are available here.
3. **Confirm and register**: user explicitly finishes with `Finish setup & register`. Selected events register for the next wave as the existing onboarding did. These are live data actions and happen only after authentication.

Existing incomplete accounts without a guest draft can complete onboarding normally.

## Manual QA

- Clear AsyncStorage and sign out: /index → /welcome sport grid. Try all four sports; practice sport and km/pts units must agree. 2D/3D toggle available only for Running/Cycling.
- Progress through replay, example growth, athlete card and account. Example score remains clearly hypothetical; card uses no fictional rank.
- Edit name, city and country: the card updates. If the 3D scene fails, a readable fallback is visible.
- Create an account and complete confirmation if required. Post-auth onboarding should prefill name, city, country and the chosen sport. The user must be able to skip tracker linking and later finish remaining details.
- Try existing-account sign-in instead: it must not overwrite that account's profile with the guest draft.
- Restart after visiting Home: do not force welcome again; authenticated accounts continue to Home or pending setup as appropriate.
- Finish setup: user enters chosen events only after the explicit registration action; guest demo does not create competition data.
- Test reduced motion, narrow phone screens, keyboard focus, VoiceOver/TalkBack, and the 3D scene offline/failure fallback.

## Verification

Run the existing shared Vitest suite (includes `packages/shared/src/onboarding-overtake.test.ts`) and mobile typecheck only after all changes have been reviewed. Perform the above device tests before merging. This branch does not include an A/B flag or onboarding analytics; add those before interpreting conversion or retention.
