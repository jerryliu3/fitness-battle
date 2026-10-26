# Profile — product refinement

Two athletic passports built from the current Athlete screen's native stack header, Everyday Club palette, five-style typography, UserAvatar, settings rows and integration marks. The Profile destination covers the tab shell, matching the actual product rather than inventing a fifth tab.

The direct reference is the goalmaxxing [membership card](https://github.com/jerryliu3/goalmaxxing/blob/4996ada50bdd8b10dca473e53e7621d44781e4dd/src/features/social/profile-membership-card.tsx) at the user-provided #1284 tip: identity and a restrained decorative horizon, a pinned three-record row inside the card, and the same card reused publicly. The [showcase distinction](https://github.com/jerryliu3/goalmaxxing/blob/4996ada50bdd8b10dca473e53e7621d44781e4dd/src/features/social/public-profile/showcase-tile.tsx) informs the separate achievement shelf. Native SVG artwork and layouts are newly implemented; productivity features and material-rendering dependencies are not imported.

| Direction | Card and content | What to compare |
| --- | --- | --- |
| Club passport | Light, centered portrait and horizon, identity/bio, effort badge and three inset PB trend visuals. Owner edits sit immediately below; stats and earned milestones follow. | More personal, generous identity composition; taller primary card. |
| The field pass | Compact horizontal identity on navy, three gold/platinum PB medallions in the same card, restrained yellow detail. Same public card and account controls. | Denser, more athletic membership object; more content visible on first view. |

## Interactive scope

- Three PBs are built into each card, not separate settings destinations. Tap any for its attempt/milestone history and source session. Data sources are the same fictional recorded rows used by Progress. The longest-run summary is aligned to those fixtures (6.9 mi / 11.1 km).
- Edit name/city/bio with bounds and required-name validation. Save affects owner/public views locally. Missing city/bio is omitted gracefully.
- Choose up to three highlights; switches enforce the limit and the saved selection updates both versions of the card.
- Public preview has identity, high-level training statistics and achievements. Owner controls, email and account actions are absent. Public city and card-highlight switches update the preview without publishing anything.
- Owner settings include Data Sync, Preferences, Notifications, Public profile, Scoring and Account. Miles/kilometers update profile distance labels and the longest-run chart/source receipt. Notification preferences are local previews. Tracker screens remain explicitly unconnected.
- Sharing is a preview of the public card with an example URL; no real public link or external message. Sign out/support/deletion remain within Account and do not execute against the real account.

Review `/refine-profile?concept=1|2`. Use Public preview in the owner screen or `&public=1`; `&compare=1` compares cards; `&clean=1` hides the review toolbar. Native route: `overtaek:///refine-profile`.

Screenshots: [light passport](profile-1.png), [field pass](profile-2.png), [public view](profile-public.png), [record](profile-record.png), [highlight editor](profile-highlights.png).

## Validation

Workspace typecheck, mobile tests, UI typography contract and combined iOS/Android/Web exports; Expo-web phone review including editing, highlight limit, source receipts and public visibility. Installed-device VoiceOver, Dynamic Type, edge-swipe Back and safe-area review remain. These are visual implementation candidates with isolated fixtures, not a backend/profile publishing rollout.
