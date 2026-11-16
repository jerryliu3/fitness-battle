# Guest-first entry (native)

## Flow

On first app entry without an account, `/index` routes to `/welcome`.
Returning signed-in users and guests who have already dismissed the intro go to `/today`.

The welcome experience is:
1. Explain Overtaek in one sentence and invite the visitor to try an overtake.
2. Show the existing interactive overtake scene in 2D initially (3D is optional).
3. After the visitor taps Continue, clarify that it was a practice sequence and offer Create account, Explore, and Sign in.

The preview is **not** a real recorded workout, registration, or leaderboard result. No health permissions or tracker credentials are required. Authenticated onboarding and the existing daily competition registration remain unchanged.

## State

`overtaek-guest-intro-seen-v1` is an AsyncStorage preference written when the visitor leaves the welcome flow. It is not an identity, score, account, or activity record. If storage is unavailable, the visitor can still enter the app, but the preview may appear again after restart.

## Manual checks

- Fresh install, signed out: index -> welcome -> practice overtake -> complete -> Create account opens registration mode.
- Welcome -> Explore: /today, and reopening does not force the preview.
- Existing account: /today with no guest preview; incomplete accounts still follow normal onboarding.
- Returning signed-out guest: /today, with account entry still available from Athlete and protected competition actions.
- Practice preview creates no score, reward, real friend activity, or server-side record.
- Both 2D/3D switch and reduced motion remain usable in the overtake preview.

A/B assignment, install-level conversion events, and a real first-workout achievement are not implemented here; this first pass reuses the existing practice mechanic to test the sign-up timing without changing scoring or authentication infrastructure.
