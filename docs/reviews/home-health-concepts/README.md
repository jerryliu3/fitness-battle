# Issue 5 — five Home health prototypes

Review `/design/home-health` under the existing design access gate. This is an
isolated, responsive coded study; production Home and native screens are unchanged.
Phone-width layouts are intended for reviewing future web/native composition,
not a claim of native implementation. All readings, sessions and athlete names
are fictional and labeled. No health-data integration or score is introduced.

1. **Portfolio:** cumulative training line with a quiet previous-week comparison;
   daily health as a compact watchlist beneath the chart.
2. **Daily Orbit:** active-day arc, spacious center and four rounded daily signals.
3. **Ledger:** editorial receipt, daily training bars and divided tabular metrics.
4. **Signal Room:** dark time-of-day activity grid and four mini-chart instruments.
5. **Tempo:** calendar/session ribbon with a single horizontal daily-health strip.

Compare all five or focus one. Select a day to inspect session/cumulative time;
select a metric for its source/meaning note. Missing-readings mode shows explicit
unavailable values rather than zeros. No diagnostic thresholds or readiness score
is inferred. Any production version needs real source timestamps and availability.

References: [Oura app structure](https://support.ouraring.com/hc/en-us/articles/42987005571859-How-to-Use-the-Oura-App),
[WHOOP Health Monitor](https://support.whoop.com/s/article/WHOOP-Health-Monitor-Report?language=en_US),
[Robinhood charts](https://robinhood.com/us/en/support/articles/using-charts/).
Mobbin was unavailable without a paid plan; these are original layouts, not copied screens.

Verification: workspace typecheck, production web build, browser comparison at
1280px and focused layouts at 390px; metric expansion and missing-reading mode;
no horizontal overflow. Screenshots accompany this document. Native implementation
is deliberately deferred pending concept selection.

## Round 2 — selected foundation, two visual metric concepts

The October 25 selection is Portfolio's chart with Signal Room's health panel.
Production implementation lives in the separate Home PR. This follow-up extends
the same `/design/home-health` files from #328, which has since merged.

The study now opens with two new alternatives; the original five remain available
from the concept chooser and Compare all seven. Both new phones retain the quiet
Portfolio chart and omit the weekday picker/receipt below it.

6. **Signal Dials:** four open circular scales, each with a gold dot positioning
   the latest reading within its own observed seven-day min/max. The background
   arc stays unfilled, so this does not imply goal completion or a health score.
   Each observed range is printed beneath the dial.
7. **Seven-Day Halo:** seven observations run clockwise around the latest value.
   Dot size encodes relative value within the displayed sample's range. The latest
   dot is gold and the earlier dots are sage. It shows variation without a trend
   line; gold means latest, not best.

All observations remain fictional (October 18–24), with no live source or medical
reference range. Expand any metric to inspect the seven exact values and the
visual's meaning. Missing mode removes markers/readings and leaves neutral empty
scales; missing data is never represented as zero. These are alternatives for
review, with no production renderer, health integration or scoring changes.

Round 2 validation: web typecheck/build; desktop comparison at 1280px and focused
phone layouts at 390px/320px. Verified seven-day reading detail, missing-state
labels with no gold/current markers, no horizontal overflow, all seven concepts
accessible and no weekday picker in either new concept. Screenshots:
`round-2-comparison.png`, `dials-phone.png`, `halos-phone.png`, and
`halos-missing-320.png`. These remain coded responsive studies rather than native
production components.
