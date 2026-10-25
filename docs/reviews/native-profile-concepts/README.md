# Profile — four identities, owner and public

Part 4 of the sequential native study. Expo route `/study-profile`; development
link `overtaek:///study-profile`. Use `?concept=passport` or `?compare=1`.
The new `/study` native hub links all four tab studies (31 concepts total).

A profile has two jobs: make the athlete recognizable to others and give the
owner control over their account. The identity, high-level statistics and earned
highlights should work in both contexts. Email, source connections, preferences
and private crew/health information should not be mixed into the public card.
These are presentation prototypes, not a new public-profile endpoint or policy.

| Concept | Main object | Public presentation | Owner organization |
| --- | --- | --- | --- |
| Athlete Card | Portrait, biography, stat band, achievement shelf | Familiar identity with records below | Edit + Settings below the athlete content |
| Athletic Passport | Dark athletic credential, sport labels, earned stamps | A compact collectible identity | Same content with owner utilities underneath |
| Cover Story | Illustrated landscape cover and editorial biography | Story and character before numbers | Controls stay outside the public story |
| Record Cabinet | Large personal-best objects | Record-led identity and achievement collection | Settings remain a separate depth rather than dashboard tiles |

The landscape is native SVG illustration, not a pretend activity map or a
downloaded reference image. All four keep Everyday Club’s white/navy/yellow/teal
foundation, DM Sans and quiet corners. New-athlete mode replaces records and
achievements with honest empty content rather than awarding sample milestones.

## Working depth and state

- Owner/Public switching on every concept.
- Statistics → historical training chart and high-level totals.
- Achievement → milestone explanation; personal record → source summary; owner
  record detail additionally opens its earlier qualifying-performance history.
- Edit profile → name/city/biography draft → validation → Save. Saving updates
  both local owner and public identity; Back cancels the draft.
- Settings → Data Sync, Preferences, Public visibility, Scoring and Account.
- Preferences has local units and recap switches. Sources explicitly remain
  unconnected; no OAuth or health permission flow is simulated as success.
- Visibility switches change the local public and share preview. The public
  identity projection deliberately omits private fields. These switches do not
  modify production privacy or server authorization.
- Account contains a fictional owner email and a read-only account-action
  explanation. No real sign-out, support message or deletion is executed.
- Share preview shows only intended public identity, statistics and visible
  records. It does not publish, copy or send a link.

All values and identities are fictional. Each concept owns its own state. Local
edits reset when the concept is remounted or the study reloads. The bottom tabs
are orientation chrome. Native Modals retain parents and offer Back/Done.

## Inspiration and comparison questions

The supplied AllTrails, Strava, Ladder and komoot profile boards suggest four
useful patterns: a legible identity, a deliberate cover, high-level statistics,
and a browsable achievement/record collection. The layouts here are original;
they do not copy the references’ visual skins, follower graphs or feed features.
[Home #328](https://github.com/jerryliu3/fitness-battle/pull/328) informs the
concept-comparison method; [Goalmaxxing #1278](https://github.com/jerryliu3/goalmaxxing/pull/1278)
informs summary → detail → source nesting only.

Review Athlete Card as the clarity baseline and Passport as the more distinctive
alternative. Cover Story tests how much personal expression the profile needs.
Cabinet tests whether established athletes want their records to speak first.
No layout is selected for production by this PR.

## Evidence and limitations

`01-phone.jpg`–`04-phone.jpg` and `01-public.jpg`–`04-public.jpg` show all four
owner/public compositions at 390×844. `owner-settings.jpg` shows nested account
organization. `public-visibility.jpg` shows a locally edited identity with city
and records hidden. Tests render all four, validate/save edits, inspect private
owner Account, toggle visibility and assert public content excludes email,
settings, city and records. Browser checks confirm these same transitions.

Workspace typecheck, full test suite, production web build and iOS/Android Hermes exports
are recorded in the PR. These exports validate bundling, not an installed device
binary. VoiceOver, Dynamic Type, native keyboard and edge gestures need device
QA before production adoption. The final PR also brings chart point targets to
44px and lets the calendar use the page margins to retain 44px date targets on
320px phones. Stat columns also keep enough width for readable labels. These are
shared review-kit refinements, not product changes.
