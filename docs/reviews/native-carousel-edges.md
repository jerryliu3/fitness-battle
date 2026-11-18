# Native carousel edges — November 18

Source audit for the inset clipping reported across iOS tabs:

- Registered events, event registration, Crew events and the award shelf had
  horizontal ScrollViews bounded by the page's 20-point gutter.
- Crew mates extended only the right edge, leaving the left inset.
- Sync review activity cards had the same issue inside a 16-point padded page.

Expand these scroll viewports by the containing page gutter and restore that
same gutter as content padding. Cards retain their resting alignment, widths,
selection and snap intervals; moving content reaches both viewport edges.
The award shelf change covers Athlete and competition history.

Other horizontal surfaces were inspected in source: PR distance controls,
benchmark filters, training/history sport filters, Crew setup choices,
weekly-social athlete choices, competition quick-focus chips and the Crew relay
scene belong to their containing cards, filters or charts. Home's update deck
already allows its translated cards to overflow its stage. The old EventCarousel
has no production callers. These are not page-level card clipping boundaries.

No simulator, screenshots, tests, type checks, builds or runtime verification
were run, as requested. This is a source audit and implementation record.
