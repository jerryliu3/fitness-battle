# Weekly close and shared starts

Read the [reviewed proposal](../../social-next-steps.md) for decisions and scope. This directory saves an independent follow-up to [PR #121](https://github.com/jerryliu3/fitness-battle/pull/121).

## Preview

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/design-studies/social-next-steps
```

Open [the local review](http://127.0.0.1:8765/review.html). GitHub shows HTML source; clone/download and open the portable review using the local server. No application server, package installation, credentials or database is required. Google Fonts supplies DM Sans when available; a local sans-serif fallback is included.

## Active review

- **Week Close:** a settled personal result and an inspector for every other athlete in the field. “Congrats” and “Race again” are independent, retain state per athlete, and can be toggled in the sample.
- **Pairing scenarios:** controls outside the phone demonstrate one-sided interest, mutual interest and an unsuccessful pairing. A sample counterpart's choice is not a real person's response. Mutual interest is never presented as a confirmed assignment.
- **Start Line:** a structured Crew invitation/RSVP example. It remains a near-term candidate with timing undecided. Joining the sample list does not count as a workout.

All people, results and interactions are fictional and local. No congratulation, repeat request, invitation, notification or application write is sent. The prototype does not implement scoring, settlement, result persistence, authentication, matching, seating or real RSVP behavior.

## Saved files

- `concepts.fragment.html`: editable refined source, with two active sketches.
- `review.html`: generated portable wrapper, with concept navigation and fallback review-state handling.
- `archive/round-two.fragment.html`: original five concepts. The file is explicitly archival. The proposal supersedes its fixed-season Rival Circuit, Training Kit, Fresh Start and standalone Sideline scope; none is silently promoted into the active review.

## Regeneration

The review is exported with Codex's Visualize skill renderer. Set its directory for the current machine, then run:

```sh
python3 "$VISUALIZE_SKILL_DIR/scripts/render.py" \
  docs/design-studies/social-next-steps/concepts.fragment.html \
  docs/design-studies/social-next-steps/review.html \
  --title 'Overtaek — weekly close and shared starts' --force
```

The wrapper is committed so viewing does not require that skill. The only optional host calls in the active source are `window.openai.widgetState` and `window.openai.setWidgetState`; the wrapper supplies fallback state handling. Its generic host-reference export warning is expected.

## Validation

October 16, 2026:

- JavaScript syntax passed `node --check`. IDs are unique and every queried ID resolves; there are exactly two active review views.
- Browser checks covered independent congratulations and repeat selection, per-athlete state retention using the native athlete selector, withdrawing a choice, one-sided/mutual/unpaired sample states, and the absence of a confirmed-assignment claim for mutual interest.
- Start Line RSVP and leaving updated the sample participant list from three to four and back to three.
- Both refined views were inspected at 390px and 320px browser widths. Neither had horizontal content overflow at the narrow width. No browser JavaScript errors were reported.
- `git diff --check` passed. No production application, dependency, schema, period or scoring change was made; production builds, typecheck and monorepo tests were not run for this artifact-only PR.

These checks validate local presentation behavior, not real messages, persistence, mutual consent, matching, seating or physical-device material rendering.
