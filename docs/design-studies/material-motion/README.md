# Material and motion review

This is an isolated design artifact for the [selected-direction proposal](../../material-and-motion-concepts.md). It does not run inside the product or mutate account data.

## Preview

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/design-studies/material-motion
```

Open [the local review](http://127.0.0.1:8765/review.html). GitHub displays HTML source rather than running this review; use the local server after cloning/downloading the files. No Next server, package install, credentials or application database is needed. DM Sans is requested from Google Fonts; a local sans-serif fallback remains available if offline.

## Contents and scope

- `concepts.fragment.html`: editable source for seven concepts, with inline product-specific styles, fictional fixtures and local interactions.
- `review.html`: generated standalone wrapper, including carousel controls and a fallback for local review state. This is the portable file to open in a browser.

The source retains only the selected directions. Session Anatomy is removed. Weekly Training compares bars and a line with an external study control. Forged Week opens on a settled medal and offers an explicitly optional Home goal comparison. PR Timeline has four dated milestones per distance. Finish-Line Moment is shown inside the normal Compete composition with a dismissible banner.

Sample records are not tracker imports. “Verified” labels illustrate how a future sourced-result model would be presented. Weekly session rows are synthetic and sum to their displayed totals. Missing-history, over-goal, full-field, real source receipts and actual return-trigger integration remain requirements in the proposal rather than implemented product states.

## Regenerate after editing

The standalone wrapper is exported using Codex's Visualize skill renderer. If that skill is installed, set its directory for the current machine and run:

```sh
python3 "$VISUALIZE_SKILL_DIR/scripts/render.py" \
  docs/design-studies/material-motion/concepts.fragment.html \
  docs/design-studies/material-motion/review.html \
  --title 'Overtaek — selected material and motion directions' --force
```

The generated wrapper is committed so opening the review does not require the skill. The only optional host APIs in the source are `window.openai.widgetState` and `window.openai.setWidgetState`; the exported wrapper supplies fallback state handling. Presentation controls make no network writes.

## Checks on the refined revision

October 16, 2026:

- JavaScript syntax passed `node --check`; source IDs are unique and every queried ID resolves. Seven concept sections are present and the rejected experience is absent.
- Browser interactions checked: athlete selection; default settled medal; optional goal and foil switching; flip to record; weekly bar selection; partial-week labels; session disclosure; bars/line selection preservation; clock event selection; PR distance and historical milestone selection; crew contribution selection; Compete replay completion, skip and dismissal.
- All seven concepts inspected at a 320px browser viewport with no horizontal content overflow; revised components were also exercised at 390px. Expanded session details increase document height naturally. No browser JavaScript errors were reported.
- `git diff --check` passed. No production application code, dependency, schema or scoring rule changed, so monorepo tests, typecheck and web build were not run for this design-artifact PR.

The renderer's warning about host API references is expected: only the supported optional state APIs remain. This review is a CSS/SVG material and interaction sketch; it does not verify native Liquid Glass, real 3D geometry, physical-device haptics or production data integration.
