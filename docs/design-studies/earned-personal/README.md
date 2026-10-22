# Earned and personal — interactive UX review

Companion to [the October 21 exploration](../../ux-exploration-2026-10-21.md).

Open `review.html` in a browser, or serve this directory:

```sh
python3 -m http.server 8797 --bind 127.0.0.1 --directory docs/design-studies/earned-personal
```

Visit http://127.0.0.1:8797/review.html. The top controls select the topic, one of its three concepts, and (for Sessions) zero, one or two recorded sessions. Expand session rows, select racers and tap crew members or relay segments to inspect their contribution. Activity-entry and sync buttons illustrate handoffs only; they never write account data.

This standalone version adds explicit controls because the original conversation prototype was not interactive for the user. It does not rely on the conversation's design-controls panel. `concepts.fragment.html` is the editable standalone-review source; `review.html` is its generated browser wrapper. Data and portrait placeholders are fictional; Ember uses the existing project artwork. This is not a production application change.

Verified in a browser: all 18 concept selections, three session states, session expansion, crew contribution selection and the 390 px layout. No JavaScript errors or horizontal overflow were detected.

Regenerate using the Visualize skill renderer:

```sh
python3 "$VISUALIZE_SKILL_DIR/scripts/render.py" \
  docs/design-studies/earned-personal/concepts.fragment.html \
  docs/design-studies/earned-personal/review.html \
  --title 'Overtaek — UX concept review' --force
```
