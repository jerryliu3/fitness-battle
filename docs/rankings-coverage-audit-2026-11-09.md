# Hosted rankings coverage audit — November 9, 2026

Read-only aggregate inspection of the connected project named `rankings` (`nevwdslqilysyeaccptz`). No personal result rows, credentials, source content or production changes were needed. This inventory is not a completeness certification and does not establish which project each deployed environment targets.

| Edition | Published female | Published male | Published other |
| --- | ---: | ---: | ---: |
| Estonian 10K 2025 | 16 | 28 | 0 |
| Boston 2025 | 12,228 | 16,105 | 71 |
| London 2025 | 24,146 | 30,999 | 0 |
| Berlin Marathon 2025 | 17,227 | 31,062 | 56 |
| Chicago 2025 | 24,561 | 29,548 | 0 |
| Berlin 5K 2025 | 4,912 | 4,236 | 20 |

All returned rows have result dates. No half-marathon rows were returned. London's 81 other-category results in the October import report are absent here. Berlin 5K has 20 other-category results beyond that report's total. Chicago still has 54,109 published rows; the October source-page count of 54,315 has not been freshly reconciled against adult/eligible/category exclusions. Do not label these differences as missing finishers until population definitions are checked.

Only `init_race_rankings` and `rankings_distance_stats` are applied according to the hosted migration history. The current PR stack's API, report, saved-result and coverage migrations remain unapplied.

## Review procedure

1. Select one edition, exact distance and source-recorded category.
2. Establish the source's eligible adult finisher count, accounting for youth, DNF/DNS/DQ, duplicates and unknown ages; retain the evidence link and explanation.
3. Complete and reconcile its import. Check source snapshots and pagination termination; raw row count alone is insufficient.
4. A privileged operator records `expected_eligible_count`, the successful `ingestion_run_id`, evidence URL and review notes in `rankings_coverage_reviews`, using the database's current review timestamp.
5. The public read checks the expected count, every row's import ID and latest result update against that review. A refresh or correction invalidates it until reconciled again. Source suppression applies before public counts and can never be overridden by a coverage review.

No review records or percentile certifications are seeded by this change. The review is scoped to published observations, not unique people or worldwide runner coverage.
