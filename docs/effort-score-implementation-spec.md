The open-week Effort Score chart reconstructs provisional workout changes at provider-recorded start times. Weekly training XP uses those same timestamps, so importing an older workout does not add it to the current week. Closed competition awards remain based on the facts accepted before their deadline.

> November 17 implementation amendment: Training XP replaces activity effort points and is the canonical weekly/live training input: 1,000 XP per sport reference week. Convert XP to the native-volume baseline internally; every formula, benchmark, rank, competition rule and recovery rate below is unchanged. XP is derived from eligible, deduplicated training without HR/pace bonuses and has no persisted balance. Walking uses daily tracker steps only. Session effort bars compare relative session volume and retain the Easy / Moderate / Hard / All out labels. No activity migration or legacy scoring fallback is required.

# Fitness Battle — Effort Score: Complete Implementation Specification

**Status:** Agreed product direction, proposed implementation contract (November 16, 2026).  
**Audience:** Coding agent implementing the system in the existing Fitness Battle repository.  
**Self-contained:** This document defines the scoring model completely; no knowledge of prior “v2,” “v2.1,” or “v2.2” conversations or files is required.

## 1. Objective and product rules

Fitness Battle rewards **recorded participation in sport**, not athletic skill or laboratory-measured fitness. Give users **one prominent Effort Score for their selected primary sport** (with independent scores for other supported sports). The score is a deliberately gamified combination of (a) recent sustained training volume, (b) a bounded reward for accumulated eligible training, and (c) a small, fading competition reward. It is **not** a measured population percentile, a physiological capacity estimate, or traditional Elo.

- Four supported sports: **running, cycling, walking, strength**. Running/cycling use eligible distance, walking uses eligible deduplicated steps, strength uses eligible workout duration. These are the base XP inputs. Recorded workouts from the Eastern week of November 16, 2026 use the Training XP intensity rule in the [Effort Score spec](effort-score-v2-spec.md).
- Official **scores and rank badges settle weekly**; a **live provisional score** can increase immediately after synced activities. Uncovered daily shortfalls become visible **the following local day**, not during the day. Do **not** award a separate daily currency or permanently book per-activity points.
- All eligible training contributes, whether or not it belongs to an event. Only **one designated rating-bearing competition per sport per week** contributes a placement reward.
- A full week with no eligible recorded activity is **zero volume**. Late corrections to invalid activities may correct live or settled scores outside the normal daily rule.
- **Weekly rank promotions** happen immediately at recap. **Demotions** require two consecutive settled weeks below the current badge threshold; multi-band demotions are allowed. Provisional score crossings do not change the badge.
- Rank can recognize some historical participation and competition; do **not** claim an individual's rank is an exact weekly-volume percentile. Sport benchmarks are game-design anchors, not proven population percentiles or training prescriptions.

## 2. Score scale, thresholds, and eligible units

| Index | Rank | Minimum displayed score | Running mi/wk | Cycling mi/wk | Walking steps/wk | Strength min/wk |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Beginner | 0 | 0 | 0 | 0 | 0 |
| 1 | Rookie | 1,250 | 3 | 15 | 14,000 | 60 |
| 2 | Active | 2,500 | 7 | 40 | 28,000 | 120 |
| 3 | Challenger | 3,750 | 12 | 75 | 42,000 | 180 |
| 4 | Athlete | 5,000 | 19 | 125 | 56,000 | 240 |
| 5 | Elite | 6,250 | 35 | 175 | 70,000 | 360 |
| 6 | Master | 7,500 | 55 | 250 | 84,000 | 480 |
| 7 | Olympian | 8,750 | 80 | 325 | 98,000 | 600 |
| 8 | Champion | 10,000 | 110 | 400 | 112,000 | 780 |

Champion is **not** a score ceiling: scores above 10,000 remain Champion. Distances are presented in miles for readability; internally use **metres**, with `1 mile = 1609.344 m`. Strength uses **seconds**; walking uses **steps**. Define all anchors in native units in a shared config.

Historical normalization: **1 unit** of cumulative training = **20 running miles**, **100 cycling miles**, **56,000 walking steps**, or **180 strength minutes**. These are reward scales, **not** physiological equivalents.

## 3. Canonical weekly mathematical model

For user, sport, and a completed Monday–Sunday scoring week, define:

- `V` = sum of eligible recorded volume for that week, in the sport's native units.
- `B` = previously finalized weekly-volume baseline (nullable for a brand-new user).
- `M` = highest **observed/finalized** prior baseline (exclude unsupported declaration).
- `n` = number of previous calibration observations, capped at 7.
- `Q` = accumulated accepted historical volume divided by the sport's reference volume.
- `C` = previous fading competition contribution **in displayed score points**.

### 3.1 Weekly baseline update (training)

Use **exactly this branch order** when computing a completed week's new baseline `Bnew`:

```text
if B is null:
    Bnew = V                               // First observed full week; no invented baseline
else if n < 7:
    Bnew = B + (V - B) / min(7, n + 1)     // Fast provisional correction
else if V <= B:
    Bnew = B + (V - B) / 20                // Deliberately gentle downward decay
else if B < M - epsilon:
    Bnew = min(M, B + (V - B) / 3)        // Faster return toward VERIFIED old high
else:
    denominator = (B >= MasterVolumeAnchor[sport] ? 60 : 7)
    Bnew = B + (V - B) / denominator      // Slow genuinely new Master+ highs

Mnew = max(M, Bnew)
nnew = min(7, n + 1)
```

Use a small numeric `epsilon` for the `B < M` comparison, e.g. `1e-8` in native units. The recovery branch must **not overshoot** `M` in one step. The rate `1/60` is a gameplay choice intended to make new upper-rank baselines demand sustained training; it is not a claim about physiology. Under the current rule, the slow rate is selected when the **previous baseline** is already at or above the Master volume anchor. Preserve this behavior for this implementation.

Important: a verified peak is **not** a permanent rank guarantee. If training stops, `B` falls. On returning to the previously demonstrated training load, the recovery rate speeds up the return; a brand-new higher level still uses the new-high rate.

### 3.2 Map baseline volume to training points

Define `G_s(B)` as a **piecewise-linear rank position** between the nine sport-volume anchors in Section 2. At exact Rookie volume, `G=1`; at Master, `G=6`; at Champion, `G=8`. At volumes above Champion, **linearly extrapolate** using the slope of the last interval. At zero, `G=0`.

```text
trainingPoints = 1250 * G_s(Bnew)
```

Keep full floating-point precision until final display.

### 3.3 Lifetime contribution (bounded, asymptotic)

```text
Qnew = Q + V / referenceVolume[sport]
historyPoints = 1000 * (1 - exp(-Qnew / 208))
```

Use `1000 * -Math.expm1(-Qnew / 208)` for numerical stability. The contribution starts at zero and approaches **+1,000 points** as accepted training accumulates, with diminishing returns. It is never deducted for inactivity, except correction of previously invalid credited volume. Self-declaration never grants historical volume credit. Examples at **20 running miles/week**: roughly **+221 after 1 year**, **+393 after 2 years**, **+713 after 5 years**, **+918 after 10 years**.

### 3.4 Competition contribution (gamification, not true Elo)

For a qualified eight-person field with distinct placements:

| Place | New event reward |
|---:|---:|
| 1 | +100 |
| 2 | +75 |
| 3 | +50 |
| 4 | +30 |
| 5 | +15 |
| 6 | 0 |
| 7 | -15 |
| 8 | -30 |

- A field with **fewer than 4 eligible entrants** earns zero score reward. If **everyone ties**, all receive zero reward.
- For other eligible field sizes, interpolate the eight-place reward curve using normalized place index `7*(place-1)/(fieldSize-1)`; tied athletes split the **average reward for occupied places**.
- Exactly **one designated** event per sport per week may affect this component. Use eligible event totals and canonical/tie-safe standings.
- Weekly calculation: `Cnew = 0.5 * C + eventReward`, or `Cnew = 0.5 * C` if no rated event. `C` is not silently folded into training volume. A previous win or penalty fades over time, intentionally.

### 3.5 Settled Effort Score and badge

```text
unrounded = 1250 * G_s(Bnew) + historyPoints(Qnew) + Cnew
settledScore = round(max(0, unrounded))
scoreRankIndex = min(8, floor(settledScore / 1250))
```

- If `scoreRankIndex > officialRankIndex`: promote at this recap immediately.
- If `scoreRankIndex < officialRankIndex`: increment `consecutiveBelowRankWeeks`; demote to `scoreRankIndex` on the **second consecutive completed week** below the current badge threshold. Otherwise keep badge temporarily.
- If equal/above current badge: reset demotion counter to zero.
- Keep the official settled score separate from the live provisional display; do not change badge or matchmaking level on every activity sync.

## 4. Onboarding and history

- **Verified import:** Replay actual complete eligible weekly totals chronologically through the same scoring functions; imported eligible historical volume contributes to `Q`. Do not infer invented weeks of effort. Include actual recorded zero weeks as zeros. Set the resulting official badge from the established score when import calibration completes.
- **Self-declared weekly amount:** Initialize `B = min(declaredVolume, MasterVolumeAnchor[sport])`, `n=1`, `M=0`, `Q=0`, `C=0`. Set a provisional starting badge from that capped estimate. The declaration counts as **one prior observation**, not verified peak history.
- **No import/declaration:** `B=null`, `n=0`, initial score/badge = **0 / Beginner**. First completed observed week initializes `B` directly from that week's actual volume.
- No lower starting score is forced on all users. Fast provisional recalibration supersedes the normal established upward/downward/recovery branch until `n=7`.

## 5. Live intraweek score: positive immediately, negative next day

**Core requirement:** A workout first offsets the current day's implicit inactivity shortfall; only the positive remainder raises the score during that day. If a shortfall remains, it becomes visible when the next **America/New_York calendar day** begins. No separate daily debit, reward, or points ledger exists.

**Do not** re-run EWMA incrementally for each workout or persist partial baseline updates. Instead, **preview the same weekly scoring function** against two projected weekly totals, always starting from the **same frozen last-finalized week-start state**.

Let:

- `B0`, `M0`, `n0`, `Q0`, `C0` = last fully settled state at the start of the current week.
- `k` = current local weekday index: Monday `0`, ..., Sunday `6`.
- `A` = actual eligible volume **earlier this week, before today's local midnight**.
- `D` = actual eligible volume **from today's local midnight through now**.
- `R` = reference-volume normalization for the sport.
- `Bforecast` = `B0` if known, otherwise `0`.

Create two weekly-volume **what-if inputs**:

```text
morningProjectedV   = A     + ((7 - k) / 7) * Bforecast
activityProjectedV  = A + D + ((6 - k) / 7) * Bforecast
```

The morning projection assumes today's and future days produce the established daily-average volume. The activity projection treats **today as already elapsed** (no expected credit for the remainder of today), and assumes only later days produce the daily-average volume. Therefore activity must compensate for today's removed expected volume before it yields a gain.

Create a pure `previewScore(projectedV, observedQ)` function:

```text
previewBaseline = updateBaseline(B0, M0, n0, projectedV) // Section 3.1, pure only
previewTraining = 1250 * G_s(previewBaseline)
previewHistory  = 1000 * (1 - exp(-observedQ / 208))
previewScore     = round(max(0, previewTraining + previewHistory + C0))
```

For the preview **only**, keep competition `C0` frozen and **do not** apply competition decay or a new event reward until weekly settlement. Count lifetime accumulation from **real activity only**, not projected future mileage:

```text
morningScore  = previewScore(morningProjectedV,  Q0 + A / R)
activityScore = previewScore(activityProjectedV, Q0 + (A + D) / R)
liveScore     = max(morningScore, activityScore)
```

Within the same local day, as `D` grows, `activityScore` can rise and `liveScore` will not decline for normal new eligible activities. At local midnight, recompute `k`, `A`, and `D=0`: any remaining uncovered loss from the previous day is now reflected in the new `morningScore`. The next day's activities can then earn positive increases again. **No day-boundary job or stored daily penalty is required**; calculate deterministically on read and after sync.

**User's example (illustrative point values, not a formula override):** Morning score `5000`; with no workout, today's underlying projected result would be `4995` (a hidden `-5`). A small workout improves that result to `4998`, so the display remains `5000`. More activity raises the candidate to `5002`, so the display rises to `5002` (`+2`). Another workout raises it to `5009`, so it adds `+7` immediately. If the day's activity never compensates for the loss, it shows up **tomorrow**.

**Important invariants:**

1. Today's computation always uses a **frozen week-start state**; never apply 7 copies of EWMA or commit partial baseline changes.
2. Preview historical credit uses **actual** `A+D`; never include assumed future training in `Q`.
3. Preview competition offset is frozen until weekly recap.
4. On Sunday with the complete week known, the activity-side training projection uses **exactly actual weekly volume**; weekly settlement uses that same volume but additionally applies the official competition update, badge rules, and state persistence.
5. A workout may yield `+0` whole displayed points because of the daily shortfall or rounding; don't invent a minimum `+1` award. Valid corrections and deletions may cause mid-day negative adjustments.
6. The day's morning floor is **not necessarily yesterday's highest provisional display**. It reflects completed days and the remaining forecast; that is what permits deferred daily decreases.
7. Use actual **local calendar-day boundaries**, not `elapsedHours/24`, so DST changes do not shift the reset.

## 6. Data model and server integration

Reuse current canonical activity/period/standings tables and RPCs where possible. The names below are **logical fields**, not instructions to create duplicate schemas.

Persist one state per `(user_id, sport)`:

```text
baselineWeeklyVolume              number | null
peakObservedBaselineWeeklyVolume  number
calibrationSamples                int [0..7]
cumulativeNormalizedVolume        number
competitionOffsetPoints          number
officialRankIndex                 int [0..8]
consecutiveBelowRankWeeks         int [0..1]
lastSettledWeekId                 YYYY-MM-DD | null
scoringVersion                    string
```

Inputs computed on read for live preview:

```text
weekStartLocalDate                YYYY-MM-DD
localDayIndex                     0..6
eligibleVolumeBeforeToday         number
eligibleVolumeToday               number
frozenWeekStartEffortState        state above
```

Return score reads with at least:

```text
settledScore, liveScore, officialRank, liveIsProvisional,
currentDayGain = max(0, liveScore - morningScore),
weekStartLocalDate, scoringVersion
```

The live-score calculation is **read-only**, with no database writes to `B`, `M`, `Q`, `C`, or badge. The authoritative eligible activities and their timestamps must drive both day aggregation and weekly settlement, with the same sport-specific eligibility/deduplication rules. The week is **Monday 00:00 America/New_York** to next Monday 00:00, half-open. Settle even zero-activity full weeks in sequence, exactly once, in an atomic transaction. Use an existing receipt/unique `(user_id,sport,week)` constraint or equivalent idempotent mechanism. Late corrections to settled history require controlled replay or audited score correction.

**Critical integration:** If the current score displayed in the app is stored in a database and used for matchmaking, don't overwrite that official score on workout sync. Publish `liveScore` as a derived field. The official rank and matchmaking continue to use the finalized rating until recap.

## 7. Repository integration constraints

Fitness Battle is a **pnpm monorepo**: `apps/mobile` (Expo Router), `apps/web` (Next.js App Router/API), `packages/shared` (platform-independent domain logic), and `supabase/` for persistence, RLS, and RPCs. Put pure formulas in `@fitness-battle/shared`; call them from the existing server-side activity ingestion, scoring, period, and recap pathways. Avoid parallel score-write paths between web and mobile. Use established repo conventions for environment access, design tokens, and migrations; use additive migrations, preserve existing access control, and keep security-definer RPCs hardened if touched. Before making Next.js API changes, inspect the project-installed Next.js docs because this repository's version may differ from commonly documented APIs.

**Important source-code mismatch:** An earlier standalone implementation was labeled *Effort Score v2.2* and used a `1/13` downward denominator. The agreed decision **after that code was written** is `1/20`; this document is authoritative on that change. The proposed live-score presentation was also agreed *after* v2.2. Do not assume the earlier generated scoring files are already installed in the repository: discover the current code and integrate rather than blindly replacing it.

## 8. Implementation sequence

1. Inspect existing shared scoring, activity ingestion, period, rank, recap, and persistence paths. Reuse existing primitives; do not create parallel scoring systems.
2. Implement a **pure, platform-agnostic** scorer in `@fitness-battle/shared` for sport benchmark conversion, baseline update, history bonus, placement reward, `settleEffortWeek`, and `calculateLiveEffortScore`. Adopt the **latest 1/20 downward rule**; an earlier v2.2 source draft used `1/13` and is obsolete on this point.
3. Add/reuse the per-user-per-sport state and an idempotent weekly settlement path. Maintain `peakObservedBaselineWeeklyVolume` only from actual settled observations, not self-declaration.
4. Expose a server-derived live preview using week-start state and canonical activity volume split at today's **Eastern-local midnight**. Refresh on screen load, date rollover, and successful activity sync. Avoid changing official state until weekly recap.
5. Update the web/mobile score UI: animate positive live gains, allow deferred drops on the next day, keep the badge fixed until recap, label the number as provisional where appropriate, and show the weekly final score/delta on recap.
6. Add tests, run representative activity replay, and remove obsolete milestone/Elo score-write paths to prevent double awards. Respect the repo's existing additive migration, RLS, and shared-package conventions.

## 9. Acceptance tests (must pass)

**Core:** All 9 score thresholds; sport native-unit conversion; interpolation/extrapolation; history bonus `0..1000`; full 8-player rewards and ties; small field/all-tie neutral; week idempotency; no double credits; weekly badge promotion and two-week demotion protection.

**Calibration:** No-history initial 0; self-declaration capped at Master and treated as 1 observation; imported observed history; provisional rates; decline exactly `1/20` when established; `1/7` ordinary increase; `1/60` new Master+ high; `1/3` verified recovery capped at old peak.

**Live:** No-workout Monday shows no drop before midnight; below-budget workout gives `+0`; above-budget workouts show only net gain; multiple same-day syncs are monotone and order-independent; tomorrow exposes today's uncovered deficit; Sunday preview uses actual total, not projected future training; the next settlement matches the actual weekly core calculation (apart from the explicit new competition contribution); DST boundaries; duplicates/late activities/corrections; no daily DB write; no provisional badge changes.

**Regression:** Compare 6- and 12-month prior-training runners who stop for several weeks and resume the same load. Check that recovery uses the verified peak rather than the slow new-elite path; do not claim exact score recovery time is guaranteed for every scenario.

## 10. Non-goals / release note

Do not introduce physiological fitness estimation, a separate public Lifetime Effort currency, rank-specific mileage multipliers, daily persistent point awards, per-workout EWMA updates, a new true-Elo/MMR system, or automatic live population-percentile recalibration. The rank-entry volume anchors and performance constants are explicit **product tuning values** and may be versioned later.

**Delivery:** An end-to-end implementation integrated with the *existing* project, with small additive migrations only where required, shared pure scoring tests, idempotent weekly settlement, live read path, UI, and a concise list of changed files and remaining integration concerns.
