# Issue 10 — prefer actual athlete portraits

Actual profile photos now take precedence over initials/placeholder identity in:

- Web/native Crew hero avatar stacks, member lists, relay markers and scheduled
  session participants.
- Home recent-activity identity rows (recorded own-session map thumbnails retain
  their functional map preview).
- Web/native standings, plus the already-photo-aware portrait field/nameplates.
- Shell profile entries and Athlete/onboarding photo controls, with their existing
  person-icon fallback and edit/remove behavior preserved.

Shared platform avatar primitives use initials or an explicitly supplied icon
only when the URL is absent/blank or the image fails. A changed URL is tried again;
removal immediately shows the fallback. Participant highlights and full actor names
remain accessible. SVG standings also prefer photos outside the lane viewport.
Race capsules remain race markers; they are not substituted for profile identity.

Crew uses the existing authorized roster's avatar_url. Session participant images
are looked up from that same roster, without changing session writes or widening
profile reads/RLS. The current athlete's local canonical avatar wins over a stale
Crew response, including explicit removal. No migration, new backend endpoint,
external avatar lookup or native dependency is introduced by this PR.

Verification: workspace typecheck and full tests, targeted standings regression,
production web build and iOS Metro export. Photo tests cover successful URL
preference, failure fallback, source change/removal, lazy participant composition
from authorized roster data and standings beyond the viewport. Native visual and
VoiceOver checks remain outstanding. This PR is stacked after the previous UI
fixes and does not apply any production migrations from the earlier replay PR.
