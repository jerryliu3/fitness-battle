# Health, Vitals & Athlete Analytics Visualization Study

This study evaluates all health, biometric, and fitness telemetry ingested across **Strava**, **Garmin Health API / FIT / GPX / TCX**, **WHOOP v2**, **Oura Cloud v2**, **Apple HealthKit**, and **Android Health Connect**, and establishes the visual representation rules and mobile native UI layouts for **Everyday Club**.

Interactive mobile native prototype:
- **Shared analytical engine**: `packages/shared/src/analytics-lab.ts`
- **Mobile native prototype**: `apps/mobile/src/prototypes/health-analytics-lab.tsx`
- **Production Application**: Integrated into the bottom of the Overview tab under `/you` on both mobile native (`apps/mobile/src/features/athlete-telemetry-matrix.tsx`) and web (`apps/web/src/features/progress/athlete-telemetry-matrix.tsx`). Tapping any card opens its dedicated nested subpage. Full multi-concept exploratory lab remains accessible under `/ux`.

---

## 1. Data Inventory & Ingestion Taxonomy

| Domain | Ingested Signals | Primary Providers | Cadence & Shape | Scale / Polarity |
| --- | --- | --- | --- | --- |
| **1. Athlete Equity & Rating** | Verified Elo, Open Elo, Weekly Activity Milestones (+1 steps), Settled Week Deltas, Overtakes, Freezes | Internal Compete Engine + GPS/Open Ledgers | Event-driven + Weekly Monday 00:00 ET settlement | 500–2,400 pts (Higher = Better) |
| **2. Autonomic Vitals** | HRV (`rMSSD` ms), Resting HR (`bpm`), Respiratory Rate (`brpm`), Blood Oxygen (`SpO2` %), Nocturnal Skin Temp (`±°C`), `VO2max` (`mL/kg/min`) | WHOOP, Oura, Garmin, Apple Watch, Health Connect | Nightly / Morning snapshot (`snapshot` shape) | Personal 60-day corridor ($\mu \pm 1\sigma$); RHR/Resp/Temp are bidirectional or lower-is-better |
| **3. Sleep & Recovery** | Sleep Score (0–100), Total Duration, Deep (SWS), REM, Light, Awake, Efficiency %, Bedtime/Wake timestamps | Oura, WHOOP, Garmin, Apple Health, Health Connect | Nightly (`nightly` wake-day credit) | 0–100 score; 7.5–9.0h target window; 40–50% Deep+REM restorative share |
| **4. Training Volume & Load** | Distance (`m`), Moving Time (`s`), Elevation Gain (`m`), Acute Load (7D ATL), Chronic Load (28D CTL), ACWR | Strava, Garmin, Apple Health, Health Connect, Manual Open | Session stream → Daily / Weekly Eastern buckets | Cumulative within period; ACWR optimal sweet spot is `0.80x–1.30x` |
| **5. Cardio Efficiency & Pace** | Pace (`min/km` / `min/mi`), Average & Max HR (`bpm`), 5-Zone HR time, Aerobic Efficiency Factor (`Speed ÷ HR`), PR Attempts | Strava, Garmin FIT, WHOOP, Apple Watch | Per-workout + 12-week rolling adaptation | Faster pace at lower HR = higher Aerobic Efficiency (`EF`) |
| **6. Multi-Variate Synthesis** | Daily Strain × Next-Day Readiness, Deep+REM Sleep × Aerobic Efficiency, Readiness + Load + Equity Brief | Cross-provider joined ledger | Paired lag-1 (Day $t$ load → Day $t+1$ morning vitals) | Causal correlation ($r$) and daily strain ceiling |

---

## 2. Three Visual Concepts per Data Category (18 Total Concepts)

### Category 1: Athlete Market ("Health as a Stock Market")
Treating long-term athletic effort like an equity portfolio makes compound consistency tangible and rewards showing up week after week.

1. **Concept A · Net Athlete Equity Curve & Moving Average Ribbon (`$ATHL`)**
   - **Visual**: Area/line chart of Net Athlete Index (`NAV`) overlaid with a fast **4-Week SMA** (yellow) and a slow **12-Week EMA** (dashed muted), plus a lower **Drawdown Floor** strip showing dips from all-time peak.
   - **1-Point vs. Trend**: In 1-Point mode, shows live ticker (`1,428 ▲ +42.8% All-Time`), 4W vs 12W momentum spread ("Golden Cross" status), and weekly dividend yield. In Trend mode, unfolds the full equity trajectory.
2. **Concept B · Weekly OHLC Candlesticks & Volume Bars**
   - **Visual**: Financial candlesticks for each Eastern competition week—**Open** (`lockElo`), **High** (intra-week milestone peak), **Low** (intra-week dip/decay floor), **Close** (`eloAfter` settlement)—paired with bottom moving-time volume bars.
   - **1-Point vs. Trend**: 1-Point shows the current open week's live range candle; Trend shows 12 settled weekly candles.
3. **Concept C · Portfolio Asset Allocation & Dividend Yield Ledger**
   - **Visual**: Horizontal proportional allocation bar (`$RUN`, `$CYC`, `$STR`, `$SLP`) paired with a holdings table showing hours invested, total point return, and **Yield per Hour** (`pts/hr`).

### Category 2: Vitals & Biometric Health Monitoring (Dedicated Section)
Raw vital numbers (e.g., `68 ms` HRV) are meaningless without personal context because HRV and RHR vary wildly between individuals.

1. **Concept A · Personal Baseline Corridor Band (7D Rolling vs. 60D $\pm 1\sigma$)**
   - **Visual**: Shaded alpine-teal horizontal tunnel representing the athlete's personal 60-day normal range ($\mu \pm 1\sigma$), daily reading dots (highlighted in yellow/red when outside the tunnel), and a bold 7-day rolling average curve.
   - **1-Point vs. Trend**: 1-Point renders a horizontal normal-corridor bullet gauge showing where today's reading sits inside the tunnel; Trend unfolds the 14–90 day corridor chart.
2. **Concept B · 6-Vital Sparkline Telemetry Matrix**
   - **Visual**: 2×3 native grid covering **HRV**, **Resting HR**, **VO2 Max**, **Respiratory Rate**, **SpO2**, and **Wrist Temp Deviation**. Each tile shows status badge (`Peak`, `Baseline`, `Elevated`), current reading, 14-day sparkline, and normal corridor bounds.
3. **Concept C · Normalized Z-Score Deviation Bars & Autonomic State Quadrant**
   - **Visual**: Places all 6 vitals on a single normalized $-2\sigma \dots +2\sigma$ diverging bullet chart (inverting RHR and Resp Rate so right-of-center always means healthier adaptation), paired with a 2D **HRV × RHR Autonomic Quadrant** (*Peak Readiness*, *Normal Baseline*, *Parasympathetic Fatigue*, *Sympathetic Strain*).

### Category 3: Sleep & Nightly Recovery Architecture
1. **Concept A · Nightly Stage Ribbon & Restorative Split (1-Night Focus)**
   - **Visual**: Proportional segmented bar (`Deep SWS` · `REM` · `Light` · `Awake`), efficiency badge, restorative ratio (`(Deep + REM) / Total`), and Sleep Contest rank.
2. **Concept B · 14-Night Stacked Architecture Bars vs. 8.0h Target**
   - **Visual**: Vertical stacked bars encoding both total duration (height) and stage composition (color segments) against a dashed `8.0h` recovery line.
3. **Concept C · Circadian Bedtime Window & Cumulative Sleep Debt Curve**
   - **Visual**: Floating vertical capsules from bedtime (`10:45 PM`) to wake (`6:45 AM`) revealing circadian regularity ("social jetlag"), paired with rolling sleep debt (`min`).

### Category 4: Training Volume, Load & Injury Guard
1. **Concept A · Cumulative Period Burn-Up vs. Past-Self Ghost**
   - **Visual**: Step-up cumulative hours curve raced against last week/month's dashed ghost trajectory.
2. **Concept B · Acute:Chronic Workload Ratio (ACWR) & Sweet-Spot Gauge**
   - **Visual**: Plots 7-day Acute Fatigue (`ATL`) against 28-day Chronic Fitness (`CTL`) with a `0.8x–1.3x` sweet-spot gauge to prevent overreaching (`>1.35x`).
3. **Concept C · Multi-Sport Volume Stack**
   - **Visual**: Weekly stacked column chart partitioning total moving hours across Running, Cycling, Strength, and Walking.

### Category 5: Cardio Performance, Aerobic Efficiency & HR Zones
1. **Concept A · Pace-at-HR Aerobic Efficiency Trend (`EF`)**
   - **Visual**: Plots `Speed (m/min) ÷ Avg HR (bpm)` over time—proving that the athlete is running/cycling faster per heartbeat even during submaximal weeks.
2. **Concept B · 5-Zone HR Distribution & 80/20 Polarization Meter**
   - **Visual**: Horizontal 5-zone bars comparing Aerobic Base (`Z1–Z2`) against Tempo (`Z3` gray zone) and Threshold/VO2 (`Z4–Z5`).
3. **Concept C · PR Staircase & Critical Pace Decay Curve**
   - **Visual**: Multi-distance benchmark table and velocity curve across `5K · 10K · Half · Marathon`.

### Category 6: Multi-Variate Combined Overlays ("Together vs. Isolated")
1. **Concept A · Daily Strain Bars × Next-Morning Readiness Line**
   - **Visual**: Dual-encoded bar + line chart showing how high-strain days dip next-morning readiness/HRV and how recovery days trigger supercompensation.
2. **Concept B · Restorative Sleep (Deep+REM) × Next-Day Aerobic Efficiency**
   - **Visual**: Paired lag-1 response view demonstrating positive correlation ($r = +0.72$) between restorative sleep hours and next-day cardio efficiency.
3. **Concept C · 1-Point Morning Readiness Brief vs. Synchronized Telemetry Stack**
   - **Visual**: Directly contrasts a synthesized 1-Point executive action card with the multi-track historical stack.

---

## 3. Evaluation Matrix: When to Combine vs. Keep Separate

| Pairing | Combine or Separate? | Why & Visual Rule |
| --- | --- | --- |
| **Daily Reading + 60D Personal Baseline** | **Always Combine** | A single HRV (`68 ms`) or RHR (`51 bpm`) point is unreadable without the athlete's personal $\pm 1\sigma$ corridor. |
| **Acute Load (7D) + Chronic Load (28D)** | **Always Combine** | Shared workload axis; their crossover and ratio (`ACWR`) directly indicate ramp rate and injury risk. |
| **Current Period Volume + Past-Self Ghost** | **Always Combine** | Shared cumulative hours/distance axis; answers "Am I ahead or behind my normal pace?" |
| **Pace + Heart Rate** | **Combine via Derived Ratio (`EF`)** | Raw Pace and HR move in opposite directions on hard vs. easy days; combining into `Speed ÷ HR` (`Aerobic Efficiency`) reveals true fitness gains. |
| **Today's Strain + Tomorrow's Readiness** | **Combine (Bar + Line Overlay)** | Cause-and-effect lag-1 pair; vertical bars for Strain + overlaid line for Readiness clearly separates action from autonomic response. |
| **Raw HRV (`ms`) + SpO2 (`%`) + Temp (`°C`)** | **Keep Separate (or Z-Score Normalize)** | Incompatible units and scales create spaghetti charts. Use the **2×3 Sparkline Matrix** or normalize all to **Z-Scores ($-2\sigma \dots +2\sigma$)**. |
| **GPSVerified Elo + Open Manual Volume** | **Keep Separate Ledgers (Lens Toggle)** | Preserves competitive integrity; use a clean segment switch rather than summing verified and unverified tracks. |

---

## 4. Mobile Native UI Layout Architectures

1. **Layout 1: Everyday Focus Stack (Recommended Default for Progress / Vitals)**
   - **Structure**: Single-column 20px cards (`#ffffff` on `#f8f9f6` warm canvas), one primary interactive `ChartScrubber` per viewport, progressive disclosure for secondary tables.
   - **Why it wins**: Zero horizontal cramping on 375–390pt phones, 44pt touch targets, and immediate clarity.
2. **Layout 2: Bento Telemetry Matrix (Primary Mobile Architecture)**
   - **Structure**: 2×3 compact native summary tiles with 14-day micro-sparklines and status pills (`Peak`, `Baseline`, `Elevated`). Tapping any tile opens a dedicated nested subpage (with an inline/nested toggle to allow both inspection styles).
   - **Why it wins**: Lets an athlete scan all 6 physiological vitals in under 3 seconds without scrolling through 6 separate full-size charts, then drill deep into specific domains without page clutter.
3. **Layout 3: Financial Terminal / Telemetry Ribbon (Telemetry Scrubber)**
   - **Structure**: Pinned dark navy (`#142b3b`) live ticker strip (`$ATHL`, `HRV`, `RHR`, `SLEEP`, `ACWR`, `EF`) above stacked synchronized time-series panes.
   - **Why it wins**: Reinforces the "Health as a Stock Market" mental model and keeps headline KPIs visible while scrubbing historical trends.

---

## 5. Locked Implementation Directions & Production Synthesis

Based on evaluation of the 18 concepts and layout architectures, the following directions are locked for the core mobile application:

| Domain | Locked Visual Representation | Functional & Interaction Mechanics |
| --- | --- | --- |
| **Global Mobile Layout** | **Bento Matrix with Subpage Drill-Down** | 2-column native summary matrix with micro-sparklines. Tapping any card opens its full-width nested subpage (with back button) rather than pushing the UI down. An inline toggle is provided for quick toggling. |
| **1. Athlete Market** | **Equity Curve & Ribbon (`$ATHL`)** | Net Athlete Index (`NAV`) with 4-Week SMA vs. 12-Week EMA momentum ribbon and drawdown floor. Golden Cross and Dividend Yield pills. |
| **2. Vitals Lab** | **Personal Baseline Corridor (60D $\pm 1\sigma$) + 6-Vital Matrix** | All 6 vitals represented in summary tiles; selecting any vital displays its 60-day baseline tunnel with Z-score deviation and daily readings. |
| **3. Sleep & Recovery** | **Circadian Bedtime Window & Debt + Interactive Stage Ribbon** | Circadian regularity capsules (bedtime-to-wake) + cumulative sleep debt curve. Tapping any night dynamically unpacks the detailed Sleep Stage Ribbon (Deep SWS / REM / Light / Awake) for that exact night, making static stacked bars redundant by derivation. |
| **4. Training Load** | **ACWR Workload Ratio & Sweet Spot + Ghost Burn-Up** | 7D Acute Fatigue vs. 28D Chronic Fitness with the optimal `0.80x–1.30x` sweet-spot band, paired with period step burn-up against the prior week ghost trajectory. |
| **5. Cardio & Pace** | **3-Tier Temporal Matrix (All 3 Concepts by Role)** | 1) **Rolling Trend**: Pace-at-HR Aerobic Efficiency (`EF`) over weeks.<br>2) **Per-Session Discipline**: 5-Zone HR Distribution & 80/20 polarization.<br>3) **All-Time Milestones**: PR Staircase & Critical Pace Decay Curve. |
| **6. Multi-Metric Synthesis** | **Strain × Recovery Overlay + 1-Point Morning Brief** | 1) Dual-encoded daily strain bars against next-morning readiness line.<br>2) Unified Morning Readiness Brief card with green/amber light, strain ceiling, and key recommendations. |

