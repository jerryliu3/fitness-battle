"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  buildAnalyticsLabModel,
  formatMinutesAsHoursMins,
  type AnalyticsDomainId,
  type AnalyticsLabModel,
  type AnalyticsTimeLens,
  type CompeteState,
  type VitalId,
  type VitalMetricModel,
} from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";

const c = {
  ink: "#142b3b",
  card: "#ffffff",
  line: "#e5eae6",
  soft: "#eef3ef",
  fieldTeal: "#176c75",
  tennis: "#f7c948",
  statusSuccess: "#24765c",
  statusSuccessSoft: "#e2f2eb",
  statusWarning: "#c77700",
  statusWarningSoft: "#fff3db",
  statusError: "#b93826",
  muted: "#637482",
};

export function getDomainTitle(domain?: string | null): string {
  switch (domain) {
    case "market":
      return "Athlete Market";
    case "vitals":
      return "Autonomic Vitals";
    case "sleep":
      return "Sleep & Recovery";
    case "load":
      return "Workload Ratio";
    case "performance":
      return "Cardio & Pace";
    case "combined":
      return "Readiness Brief";
    default:
      return "Athlete Telemetry";
  }
}

const TIME_LENSES: Array<{ id: AnalyticsTimeLens; label: string }> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

export function TelemetryPage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading telemetry lab…</p>}>
      <TelemetryPageContent />
    </Suspense>
  );
}

function TelemetryPageContent() {
  const searchParams = useSearchParams();
  const compete = useCompete();
  const state = compete?.state;
  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const domainParam = (searchParams.get("domain") as AnalyticsDomainId) || "market";
  const model = useMemo(() => buildAnalyticsLabModel(state, timeLens), [state, timeLens]);
  const title = getDomainTitle(domainParam);

  return (
    <div className="club-detail-page">
      <header className="club-detail-heading">
        <Link href="/you" className="club-icon-button" aria-label="Return to Progress">
          ‹
        </Link>
        <h1>{title}</h1>
      </header>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {TIME_LENSES.map((l) => {
          const isActive = timeLens === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setTimeLens(l.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "1px solid",
                borderColor: isActive ? c.fieldTeal : c.line,
                backgroundColor: isActive ? c.fieldTeal : c.card,
                color: isActive ? "#ffffff" : c.ink,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
        {domainParam === "market" && <WebMarketDetailView model={model} />}
        {domainParam === "vitals" && <WebVitalsDetailView model={model} />}
        {domainParam === "sleep" && <WebSleepDetailView model={model} />}
        {domainParam === "load" && <WebLoadDetailView model={model} />}
        {domainParam === "performance" && <WebPerformanceDetailView model={model} />}
        {domainParam === "combined" && <WebCombinedDetailView model={model} />}
      </div>
    </div>
  );
}

/* ============================================================================
 * 1. WEB ATHLETE MARKET (INTERACTIVE CHART & INSPECTION)
 * ========================================================================== */

function WebMarketDetailView({ model }: { model: AnalyticsLabModel }) {
  const m = model.market;
  const series = m.equitySeries;
  const [selectedIdx, setSelectedIdx] = useState(series.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, series.length - 1));
  const selectedPoint = series[safeIdx] ?? series[0];
  const lastPoint = series[series.length - 1] ?? series[0];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <h2 className="fb-section-title">Equity Curve</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div style={boxStyle}>
            <span style={labelStyle}>Current NAV</span>
            <span style={valStyle}>{m.currentIndex.toLocaleString()} pts</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>All-Time Return</span>
            <span style={{ ...valStyle, color: c.statusSuccess }}>
              +{m.allTimeReturnPct}%
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Max Drawdown</span>
            <span style={{ ...valStyle, color: c.statusError }}>
              {m.maxDrawdownPct}%
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>4W SMA</span>
            <span style={valStyle}>{lastPoint?.sma4 ?? 0} pts</span>
          </div>
        </div>

        <div style={{ margin: "14px 0" }}>
          <WebMarketEquityChart
            model={model}
            selectedIdx={safeIdx}
            onSelectIdx={setSelectedIdx}
          />
        </div>

        {/* Selected Week Inspection */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedPoint?.label ?? "Selected Point"}</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: selectedPoint?.drawdownPct === 0 ? c.statusSuccess : c.statusError,
              }}
            >
              {selectedPoint?.drawdownPct === 0 ? "Peak NAV" : `${selectedPoint?.drawdownPct ?? 0}% Drawdown`}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {(selectedPoint?.nav ?? 0).toLocaleString()} pts
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              {selectedPoint?.volumeHours ?? 0} hrs · +{selectedPoint?.dividendPts ?? 0} bonus pts
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
            <span className="fb-small" style={{ color: c.muted }}>
              4W SMA: {selectedPoint?.sma4 ?? 0} pts
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              12W EMA: {selectedPoint?.ema12 ?? 0} pts
            </span>
          </div>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">Asset Holdings by Sport</h2>
        <div style={{ marginTop: 8 }}>
          {m.holdings.map((h, idx) => (
            <div
              key={h.sport}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${c.line}`,
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: c.ink }}>{h.sport}</p>
                <p className="fb-small" style={{ margin: 0, color: c.muted }}>
                  {h.hours} hrs · {h.sharePct}% allocation
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: 700, color: c.ink }}>{h.returnPts} pts</p>
                <p className="fb-small" style={{ margin: 0, color: c.muted }}>
                  {h.yieldPerHour} pts/hr
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. WEB AUTONOMIC VITALS (INTERACTIVE CORRIDOR & INSPECTION)
 * ========================================================================== */

function WebVitalsDetailView({ model }: { model: AnalyticsLabModel }) {
  const vitals = model.vitals.metrics;
  const [activeVitalId, setActiveVitalId] = useState<VitalId>("hrv");
  const selectedVital = vitals.find((v) => v.id === activeVitalId) ?? vitals[0]!;
  const [selectedDayIdx, setSelectedDayIdx] = useState(selectedVital.series.length - 1);

  const safeDayIdx = Math.max(0, Math.min(selectedDayIdx, selectedVital.series.length - 1));
  const selectedDayPoint = selectedVital.series[safeDayIdx] ?? selectedVital.series[0];
  const inCorridor =
    (selectedDayPoint?.value ?? 0) >= (selectedDayPoint?.baselineLow ?? 0) &&
    (selectedDayPoint?.value ?? 0) <= (selectedDayPoint?.baselineHigh ?? 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Vital Selector Chips */}
      <div className="fb-card">
        <h2 className="fb-section-title">Autonomic Baseline Corridors</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          {vitals.map((v) => {
            const isSelected = v.id === activeVitalId;
            const status = statusColors(v.status);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setActiveVitalId(v.id);
                }}
                style={{
                  background: c.soft,
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  border: isSelected ? `2px solid ${c.fieldTeal}` : "2px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span className="fb-small" style={{ color: c.muted }}>
                  {v.shortName}
                </span>
                <span style={{ fontWeight: 800, color: c.ink, fontSize: "1.1rem" }}>
                  {v.formattedCurrent}
                </span>
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 99,
                    backgroundColor: status.bg,
                    color: status.fg,
                  }}
                >
                  {v.statusLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Vital Interactive Card */}
      <div className="fb-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 className="fb-section-title">{selectedVital.name}</h2>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              backgroundColor: statusColors(selectedVital.status).bg,
              color: statusColors(selectedVital.status).fg,
            }}
          >
            {selectedVital.statusLabel}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            margin: "8px 0 12px",
          }}
        >
          <span style={{ fontSize: "1.5rem", fontWeight: 800, color: c.ink }}>
            {selectedVital.formattedCurrent}
          </span>
          <span className="fb-small" style={{ color: c.muted }}>
            Corridor: {selectedVital.baselineMin}–{selectedVital.baselineMax} {selectedVital.unit}
          </span>
        </div>

        <div style={{ margin: "10px 0" }}>
          <WebVitalInteractiveCorridorChart
            vital={selectedVital}
            selectedIdx={safeDayIdx}
            onSelectIdx={setSelectedDayIdx}
          />
        </div>

        {/* Selected Day Inspection Readout */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedDayPoint.label}</span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 6,
                backgroundColor: inCorridor ? c.statusSuccessSoft : c.statusWarningSoft,
                color: inCorridor ? c.statusSuccess : c.statusWarning,
              }}
            >
              {inCorridor ? "Normal" : "Out of band"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {selectedDayPoint.value} {selectedVital.unit}
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              Baseline: {selectedDayPoint.baselineLow}–{selectedDayPoint.baselineHigh} {selectedVital.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. WEB SLEEP & RECOVERY (INTERACTIVE TIMELINE & STAGE RIBBON)
 * ========================================================================== */

function WebSleepDetailView({ model }: { model: AnalyticsLabModel }) {
  const sData = model.sleep;
  const nights = sData.nights;
  const [selectedNightIdx, setSelectedNightIdx] = useState(nights.length - 1);
  const safeNightIdx = Math.max(0, Math.min(selectedNightIdx, nights.length - 1));
  const selectedNight = nights[safeNightIdx] ?? nights[0];

  const tot = Math.max(1, selectedNight?.durationMin ?? 480);
  const deepP = ((selectedNight?.deepMin ?? 0) / tot) * 100;
  const remP = ((selectedNight?.remMin ?? 0) / tot) * 100;
  const lightP = ((selectedNight?.lightMin ?? 0) / tot) * 100;
  const awakeP = ((selectedNight?.awakeMin ?? 0) / tot) * 100;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <h2 className="fb-section-title">Sleep & Recovery Architecture</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div style={boxStyle}>
            <span style={labelStyle}>Avg Sleep Score</span>
            <span style={valStyle}>{sData.avgScore} / 100</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Restorative %</span>
            <span style={{ ...valStyle, color: c.fieldTeal }}>
              {sData.avgRestorativePct}%
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Cumulative Debt</span>
            <span
              style={{
                ...valStyle,
                color: sData.cumulativeDebtMin > 45 ? c.statusWarning : c.statusSuccess,
              }}
            >
              {sData.cumulativeDebtMin} min
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Efficiency</span>
            <span style={valStyle}>{sData.lastNight.efficiencyPct}%</span>
          </div>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">Daily Sleep Stages</h2>
        <div style={{ margin: "14px 0" }}>
          <WebSleepScoreTimelineChart
            nights={nights}
            selectedIdx={safeNightIdx}
            onSelectIdx={setSelectedNightIdx}
          />
        </div>

        {/* Selected Night Detailed Stage Ribbon */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedNight?.label ?? "Selected Night"}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {selectedNight?.score ?? 80} pts
            </span>
          </div>

          <div
            style={{
              display: "flex",
              height: 18,
              borderRadius: 4,
              overflow: "hidden",
              backgroundColor: c.soft,
              margin: "8px 0",
            }}
          >
            <div style={{ width: `${deepP}%`, backgroundColor: c.fieldTeal }} />
            <div style={{ width: `${remP}%`, backgroundColor: c.tennis }} />
            <div style={{ width: `${lightP}%`, backgroundColor: c.ink }} />
            <div style={{ width: `${awakeP}%`, backgroundColor: c.statusWarning }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="fb-small" style={{ color: c.muted }}>
              Total {formatMinutesAsHoursMins(selectedNight?.durationMin ?? 480)} · Deep{" "}
              {formatMinutesAsHoursMins(selectedNight?.deepMin ?? 90)} · REM{" "}
              {formatMinutesAsHoursMins(selectedNight?.remMin ?? 90)}
            </span>
            <span
              className="fb-small"
              style={{
                fontWeight: 600,
                color: (selectedNight?.debtMin ?? 0) > 0 ? c.statusWarning : c.statusSuccess,
              }}
            >
              {(selectedNight?.debtMin ?? 0) > 0 ? `+${selectedNight?.debtMin}m debt` : "Surplus"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. WEB TRAINING LOAD (INTERACTIVE ACWR & BURN-UP)
 * ========================================================================== */

function WebLoadDetailView({ model }: { model: AnalyticsLabModel }) {
  const l = model.load;
  const buckets = l.series;
  const [selectedIdx, setSelectedIdx] = useState(buckets.length - 1);
  const safeIdx = Math.max(0, Math.min(selectedIdx, buckets.length - 1));
  const selectedBucket = buckets[safeIdx] ?? buckets[0];
  const lastBucket = buckets[buckets.length - 1] ?? buckets[0];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <h2 className="fb-section-title">Workload Ratio (ACWR)</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div style={boxStyle}>
            <span style={labelStyle}>Current ACWR</span>
            <span style={{ ...valStyle, color: c.statusSuccess }}>
              {l.acwrCurrent.toFixed(2)}x
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Acute (7D)</span>
            <span style={valStyle}>{lastBucket?.acuteLoad ?? 0} pts</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Chronic (28D)</span>
            <span style={valStyle}>{lastBucket?.chronicLoad ?? 0} pts</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Status</span>
            <span style={{ ...valStyle, color: c.statusSuccess }}>
              {l.acwrStatusLabel}
            </span>
          </div>
        </div>

        <div style={{ margin: "14px 0" }}>
          <WebLoadAcwrInteractiveChart
            buckets={buckets}
            selectedIdx={safeIdx}
            onSelectIdx={setSelectedIdx}
          />
        </div>

        {/* Selected Bucket Inspection */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedBucket?.label ?? "Selected Week"}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {(selectedBucket?.acwr ?? 1).toFixed(2)}x ACWR
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <span className="fb-small" style={{ color: c.muted }}>
              Acute: {selectedBucket?.acuteLoad ?? 0} pts · Chronic: {selectedBucket?.chronicLoad ?? 0} pts
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              {selectedBucket?.totalHours ?? 0} hrs total
            </span>
          </div>
          <p className="fb-small" style={{ margin: "4px 0 0", color: c.muted }}>
            Run {selectedBucket?.runningHours ?? 0}h · Bike {selectedBucket?.cyclingHours ?? 0}h · Strength {selectedBucket?.strengthHours ?? 0}h
          </p>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">Period Volume Burn-Up</h2>
        <div style={{ margin: "14px 0" }}>
          <WebLoadBurnUpChart model={model} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 5. WEB CARDIO & PACE (INTERACTIVE EF & ZONES)
 * ========================================================================== */

function WebPerformanceDetailView({ model }: { model: AnalyticsLabModel }) {
  const p = model.performance;
  const runs = p.series;
  const [selectedRunIdx, setSelectedRunIdx] = useState(runs.length - 1);
  const safeRunIdx = Math.max(0, Math.min(selectedRunIdx, runs.length - 1));
  const selectedRun = runs[safeRunIdx] ?? runs[0];

  const [selectedZone, setSelectedZone] = useState<number>(2);
  const activeZone = p.zones.find((z) => z.zone === selectedZone) ?? p.zones[0] ?? {
    zone: 2,
    name: "Z2 · Aerobic Base",
    bpmRange: "127–145 bpm",
    sessionPct: 50,
    monthPct: 50,
    targetPct: 50,
    minutes30d: 500,
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <h2 className="fb-section-title">Aerobic Efficiency (EF)</h2>
        <div style={{ margin: "14px 0" }}>
          <WebPerformanceEfInteractiveChart
            runs={runs}
            selectedIdx={safeRunIdx}
            onSelectIdx={setSelectedRunIdx}
          />
        </div>

        {/* Selected Run Inspection */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedRun?.label ?? "Selected Session"}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {(selectedRun?.efficiencyFactor ?? 1).toFixed(2)} EF
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <span className="fb-small" style={{ color: c.muted }}>
              Pace: {(selectedRun?.paceMinKm ?? 5).toFixed(2)} min/km
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              Avg HR: {selectedRun?.avgHr ?? 140} bpm
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              VO2 max: {selectedRun?.vo2Max ?? 50}
            </span>
          </div>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">Heart Rate Polarization</h2>
        <div style={{ margin: "14px 0" }}>
          <div
            style={{
              display: "flex",
              height: 20,
              borderRadius: 4,
              overflow: "hidden",
              backgroundColor: c.soft,
            }}
          >
            {p.zones.map((z, i) => {
              const zoneColors = [c.soft, c.fieldTeal, c.tennis, c.statusWarning, c.statusError];
              return (
                <button
                  key={z.zone}
                  type="button"
                  onClick={() => setSelectedZone(z.zone)}
                  style={{
                    width: `${z.sessionPct}%`,
                    backgroundColor: zoneColors[i],
                    opacity: selectedZone === z.zone ? 1 : 0.65,
                    border: selectedZone === z.zone ? `2px solid ${c.ink}` : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title={`Zone ${z.zone}: ${z.name}`}
                />
              );
            })}
          </div>
        </div>

        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>
              Zone {activeZone.zone} · {activeZone.name}
            </span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {activeZone.sessionPct}% session
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <span className="fb-small" style={{ color: c.muted }}>
              {activeZone.bpmRange}
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              30D Target: {activeZone.monthPct}%
            </span>
          </div>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">PR Staircase & Critical Pace</h2>
        <div style={{ marginTop: 8 }}>
          {p.prCurve.map((pr, idx) => (
            <div
              key={pr.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${c.line}`,
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: c.ink }}>{pr.distanceLabel}</span>
                <p className="fb-small" style={{ margin: 0, color: c.muted }}>
                  Prior {pr.priorFormatted}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: 700, color: c.ink }}>{pr.currentFormatted}</span>
                <p className="fb-small" style={{ margin: 0, color: c.statusSuccess, fontWeight: 600 }}>
                  {pr.deltaFormatted}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. WEB MULTI-METRIC (INTERACTIVE STRAIN VS RECOVERY)
 * ========================================================================== */

function WebCombinedDetailView({ model }: { model: AnalyticsLabModel }) {
  const cmb = model.combined;
  const v = model.vitals;
  const sData = model.sleep;
  const days = cmb.series;
  const [selectedDayIdx, setSelectedDayIdx] = useState(days.length - 1);
  const safeDayIdx = Math.max(0, Math.min(selectedDayIdx, days.length - 1));
  const selectedDay = days[safeDayIdx] ?? days[0];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="fb-card">
        <h2 className="fb-section-title">Morning Readiness Brief</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <div style={boxStyle}>
            <span style={labelStyle}>Composite Readiness</span>
            <span style={{ ...valStyle, color: c.statusSuccess }}>
              {v.readinessComposite}%
            </span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Strain Ceiling</span>
            <span style={valStyle}>{cmb.optimalStrainCeiling} / 21</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Last Night Sleep</span>
            <span style={valStyle}>{sData.lastNight.score} score</span>
          </div>
          <div style={boxStyle}>
            <span style={labelStyle}>Target Bedtime</span>
            <span style={valStyle}>10:30 PM</span>
          </div>
        </div>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title">Daily Training Strain vs Next-Day Recovery</h2>
        <div style={{ margin: "14px 0" }}>
          <WebCombinedStrainReadinessInteractiveChart
            days={days}
            selectedIdx={safeDayIdx}
            onSelectIdx={setSelectedDayIdx}
          />
        </div>

        {/* Selected Day Inspection */}
        <div style={inspectionBoxStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: c.ink }}>{selectedDay?.label ?? "Selected Day"}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: c.ink }}>
              {selectedDay?.nextDayReadiness ?? 80}% Readiness
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
            <span className="fb-small" style={{ color: c.muted }}>
              Day Strain: {selectedDay?.strainScore ?? 10} / 21
            </span>
            <span className="fb-small" style={{ color: c.muted }}>
              Next-Day HRV: {selectedDay?.nextDayHrv ?? 70} ms
            </span>
          </div>
          <p className="fb-small" style={{ margin: "4px 0 0", color: c.muted }}>
            {selectedDay?.workoutNote ?? "Training Session"} ({selectedDay?.sleepRestorativeHr ?? 3}h restorative sleep)
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * WEB INTERACTIVE SVG CHARTS
 * ========================================================================== */

function WebMarketEquityChart({
  model,
  selectedIdx,
  onSelectIdx,
}: {
  model: AnalyticsLabModel;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const series = model.market.equitySeries;
  const allVals = series.flatMap((p) => [p.nav, p.sma4, p.ema12]);
  const minV = Math.min(...allVals) - 20;
  const maxV = Math.max(...allVals) + 20;
  const span = Math.max(1, maxV - minV);
  const W = 500;
  const H = 160;
  const L = 36;
  const R = 480;
  const T = 14;
  const B = 124;

  const toX = (i: number) => L + (i / Math.max(1, series.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const navPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(" ");
  const smaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.sma4).toFixed(1)}`).join(" ");
  const emaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.ema12).toFixed(1)}`).join(" ");
  const areaPoints = `${L},${B} ${navPoints} ${toX(series.length - 1).toFixed(1)},${B}`;
  const safeIdx = Math.max(0, Math.min(selectedIdx, series.length - 1));
  const activeX = toX(safeIdx);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
        <line x1={L} y1={T} x2={R} y2={T} stroke={c.line} strokeWidth={1} strokeDasharray="3,3" />

        <polygon points={areaPoints} fill={c.tennis} fillOpacity={0.16} />
        <path d={`M ${emaPoints}`} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="4,3" />
        <path d={`M ${smaPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2} />
        <path d={`M ${navPoints}`} fill="none" stroke={c.ink} strokeWidth={2.5} />

        {/* Vertical Hairline */}
        <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

        {series.map((p, i) => (
          <circle
            key={p.id}
            cx={toX(i)}
            cy={toY(p.nav)}
            r={i === safeIdx ? 5.5 : 2.5}
            fill={i === safeIdx ? c.tennis : c.ink}
            stroke={c.card}
            strokeWidth={i === safeIdx ? 2 : 1.5}
          />
        ))}

        {/* Click Strips */}
        {series.map((p, i) => {
          const colW = (R - L) / Math.max(1, series.length);
          return (
            <rect
              key={`click-${p.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectIdx(i)}
            />
          );
        })}
      </svg>

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.ink }} />
          <span className="fb-small">NAV</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.fieldTeal }} />
          <span className="fb-small">4W SMA</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.muted }} />
          <span className="fb-small">12W EMA</span>
        </div>
      </div>
    </div>
  );
}

function WebVitalInteractiveCorridorChart({
  vital,
  selectedIdx,
  onSelectIdx,
}: {
  vital: VitalMetricModel;
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const series = vital.series;
  const vals = series.map((p) => p.value);
  const minV = Math.min(vital.baselineMin, ...vals) - (vital.id === "temp" ? 0.3 : 4);
  const maxV = Math.max(vital.baselineMax, ...vals) + (vital.id === "temp" ? 0.3 : 4);
  const span = Math.max(0.1, maxV - minV);
  const W = 500;
  const H = 95;
  const L = 36;
  const R = 480;
  const T = 10;
  const B = 80;

  const toX = (i: number) => L + (i / Math.max(1, series.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const topCorridorY = toY(vital.baselineMax);
  const botCorridorY = toY(vital.baselineMin);
  const corridorH = Math.max(2, botCorridorY - topCorridorY);

  const linePoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");
  const safeIdx = Math.max(0, Math.min(selectedIdx, series.length - 1));
  const activeX = toX(safeIdx);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect
        x={L}
        y={topCorridorY}
        width={R - L}
        height={corridorH}
        fill={c.fieldTeal}
        fillOpacity={0.12}
        rx={3}
      />
      <line x1={L} y1={topCorridorY} x2={R} y2={topCorridorY} stroke={c.fieldTeal} strokeWidth={1} strokeDasharray="3,3" />
      <line x1={L} y1={botCorridorY} x2={R} y2={botCorridorY} stroke={c.fieldTeal} strokeWidth={1} strokeDasharray="3,3" />

      {/* Hairline */}
      <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />
      <path d={`M ${linePoints}`} fill="none" stroke={c.ink} strokeWidth={2} />

      {series.map((p, i) => (
        <circle
          key={p.day}
          cx={toX(i)}
          cy={toY(p.value)}
          r={i === safeIdx ? 5.5 : 2.5}
          fill={i === safeIdx ? c.fieldTeal : c.ink}
          stroke={c.card}
          strokeWidth={i === safeIdx ? 2 : 1.5}
        />
      ))}

      {series.map((p, i) => {
        const colW = (R - L) / Math.max(1, series.length);
        return (
          <rect
            key={`click-${p.day}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectIdx(i)}
          />
        );
      })}
    </svg>
  );
}

function WebSleepScoreTimelineChart({
  nights,
  selectedIdx,
  onSelectIdx,
}: {
  nights: AnalyticsLabModel["sleep"]["nights"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const scores = nights.map((n) => n.score);
  const minV = Math.min(...scores) - 5;
  const maxV = 100;
  const span = Math.max(1, maxV - minV);
  const W = 500;
  const H = 120;
  const L = 36;
  const R = 480;
  const T = 12;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, nights.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const linePoints = nights.map((n, i) => `${toX(i).toFixed(1)},${toY(n.score).toFixed(1)}`).join(" ");
  const safeIdx = Math.max(0, Math.min(selectedIdx, nights.length - 1));
  const activeX = toX(safeIdx);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
      <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

      <path d={`M ${linePoints}`} fill="none" stroke={c.ink} strokeWidth={2} />

      {nights.map((n, i) => (
        <circle
          key={n.id}
          cx={toX(i)}
          cy={toY(n.score)}
          r={i === safeIdx ? 5.5 : 3}
          fill={i === safeIdx ? c.tennis : c.ink}
          stroke={c.card}
          strokeWidth={i === safeIdx ? 2 : 1}
        />
      ))}

      {nights.map((n, i) => {
        const colW = (R - L) / Math.max(1, nights.length);
        return (
          <rect
            key={`click-${n.id}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectIdx(i)}
          />
        );
      })}
    </svg>
  );
}

function WebLoadAcwrInteractiveChart({
  buckets,
  selectedIdx,
  onSelectIdx,
}: {
  buckets: AnalyticsLabModel["load"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const W = 500;
  const H = 120;
  const L = 36;
  const R = 480;
  const T = 12;
  const B = 98;

  const minV = 0.5;
  const maxV = 2.0;
  const span = maxV - minV;

  const toX = (i: number) => L + (i / Math.max(1, buckets.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const sweetTop = toY(1.3);
  const sweetBot = toY(0.8);
  const sweetH = Math.max(2, sweetBot - sweetTop);

  const acwrPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.acwr).toFixed(1)}`).join(" ");
  const safeIdx = Math.max(0, Math.min(selectedIdx, buckets.length - 1));
  const activeX = toX(safeIdx);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect
          x={L}
          y={sweetTop}
          width={R - L}
          height={sweetH}
          fill={c.statusSuccess}
          fillOpacity={0.12}
          rx={4}
        />
        <line x1={L} y1={toY(1.5)} x2={R} y2={toY(1.5)} stroke={c.statusWarning} strokeWidth={1} strokeDasharray="3,3" />
        <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

        <path d={`M ${acwrPoints}`} fill="none" stroke={c.ink} strokeWidth={2.5} />

        {buckets.map((b, i) => (
          <circle
            key={b.id}
            cx={toX(i)}
            cy={toY(b.acwr)}
            r={i === safeIdx ? 6 : 3.5}
            fill={b.acwr > 1.4 ? c.statusWarning : c.statusSuccess}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}

        {buckets.map((b, i) => {
          const colW = (R - L) / Math.max(1, buckets.length);
          return (
            <rect
              key={`click-${b.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectIdx(i)}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.statusSuccess }} />
          <span className="fb-small">Sweet Spot (0.8–1.3x)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.statusWarning }} />
          <span className="fb-small">Danger Zone (&gt;1.5x)</span>
        </div>
      </div>
    </div>
  );
}

function WebLoadBurnUpChart({ model }: { model: AnalyticsLabModel }) {
  const buckets = model.load.series;
  const maxH = Math.max(...buckets.map((b) => Math.max(b.cumCurrentHours, b.cumGhostHours, b.cumTargetHours))) + 2;
  const W = 500;
  const H = 120;
  const L = 36;
  const R = 480;
  const T = 12;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, buckets.length - 1)) * (R - L);
  const toY = (v: number) => B - (v / maxH) * (B - T);

  const curPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.cumCurrentHours).toFixed(1)}`).join(" ");
  const ghostPoints = buckets.map((b, i) => `${toX(i).toFixed(1)},${toY(b.cumGhostHours).toFixed(1)}`).join(" ");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
        <path d={`M ${ghostPoints}`} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="3,3" />
        <path d={`M ${curPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} />
        {buckets.map((b, i) => (
          <circle
            key={b.id}
            cx={toX(i)}
            cy={toY(b.cumCurrentHours)}
            r={i === buckets.length - 1 ? 4 : 2.5}
            fill={c.fieldTeal}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.fieldTeal }} />
          <span className="fb-small">Current Week ({buckets[buckets.length - 1]?.cumCurrentHours ?? 0}h)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.muted }} />
          <span className="fb-small">Ghost Prior Week ({buckets[buckets.length - 1]?.cumGhostHours ?? 0}h)</span>
        </div>
      </div>
    </div>
  );
}

function WebPerformanceEfInteractiveChart({
  runs,
  selectedIdx,
  onSelectIdx,
}: {
  runs: AnalyticsLabModel["performance"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const efs = runs.map((p) => p.efficiencyFactor);
  const minV = Math.min(...efs) - 0.05;
  const maxV = Math.max(...efs) + 0.05;
  const span = Math.max(0.01, maxV - minV);
  const W = 500;
  const H = 120;
  const L = 36;
  const R = 480;
  const T = 10;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, runs.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const linePoints = runs.map((p, i) => `${toX(i).toFixed(1)},${toY(p.efficiencyFactor).toFixed(1)}`).join(" ");
  const safeIdx = Math.max(0, Math.min(selectedIdx, runs.length - 1));
  const activeX = toX(safeIdx);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={L} y1={B} x2={R} y2={B} stroke={c.line} strokeWidth={1} />
      <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

      <path d={`M ${linePoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2.5} />
      {runs.map((p, i) => (
        <circle
          key={p.id}
          cx={toX(i)}
          cy={toY(p.efficiencyFactor)}
          r={i === safeIdx ? 5.5 : 2.5}
          fill={c.fieldTeal}
          stroke={c.card}
          strokeWidth={i === safeIdx ? 2 : 1.5}
        />
      ))}

      {runs.map((p, i) => {
        const colW = (R - L) / Math.max(1, runs.length);
        return (
          <rect
            key={`click-${p.id}`}
            x={toX(i) - colW / 2}
            y={0}
            width={colW}
            height={H}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={() => onSelectIdx(i)}
          />
        );
      })}
    </svg>
  );
}

function WebCombinedStrainReadinessInteractiveChart({
  days,
  selectedIdx,
  onSelectIdx,
}: {
  days: AnalyticsLabModel["combined"]["series"];
  selectedIdx: number;
  onSelectIdx: (idx: number) => void;
}) {
  const W = 500;
  const H = 120;
  const L = 30;
  const R = 480;
  const T = 12;
  const B = 98;

  const toX = (i: number) => L + (i / Math.max(1, days.length - 1)) * (R - L);
  const toYReadiness = (v: number) => B - (v / 100) * (B - T);
  const toYStrain = (v: number) => B - (v / 21) * (B - T);

  const readPoints = days.map((p, i) => `${toX(i).toFixed(1)},${toYReadiness(p.nextDayReadiness).toFixed(1)}`).join(" ");
  const safeIdx = Math.max(0, Math.min(selectedIdx, days.length - 1));
  const activeX = toX(safeIdx);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Hairline */}
        <line x1={activeX} y1={T} x2={activeX} y2={B} stroke={c.ink} strokeWidth={1} strokeDasharray="3,3" />

        {days.map((p, i) => {
          const x = toX(i);
          const barH = B - toYStrain(p.strainScore);
          return (
            <rect
              key={p.id}
              x={x - 4}
              y={B - barH}
              width={8}
              height={barH}
              fill={i === safeIdx ? c.tennis : c.soft}
              rx={2}
            />
          );
        })}
        <path d={`M ${readPoints}`} fill="none" stroke={c.fieldTeal} strokeWidth={2} />

        {days.map((p, i) => (
          <circle
            key={`dot-${p.id}`}
            cx={toX(i)}
            cy={toYReadiness(p.nextDayReadiness)}
            r={i === safeIdx ? 5 : 2.5}
            fill={c.fieldTeal}
            stroke={c.card}
            strokeWidth={1.5}
          />
        ))}

        {days.map((p, i) => {
          const colW = (R - L) / Math.max(1, days.length);
          return (
            <rect
              key={`click-${p.id}`}
              x={toX(i) - colW / 2}
              y={0}
              width={colW}
              height={H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectIdx(i)}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.soft }} />
          <span className="fb-small">Day Strain</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c.fieldTeal }} />
          <span className="fb-small">Next-Day Readiness</span>
        </div>
      </div>
    </div>
  );
}

function statusColors(status: "optimal" | "normal" | "caution") {
  if (status === "optimal") {
    return { bg: c.statusSuccessSoft, fg: c.statusSuccess };
  }
  if (status === "caution") {
    return { bg: c.statusWarningSoft, fg: c.statusWarning };
  }
  return { bg: c.soft, fg: c.ink };
}

const boxStyle = {
  background: c.soft,
  borderRadius: 8,
  padding: "10px 12px",
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: 4,
};

const inspectionBoxStyle = {
  background: c.soft,
  borderRadius: 8,
  padding: "12px 14px",
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: 4,
  marginTop: 8,
};

const labelStyle = {
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: c.muted,
};

const valStyle = {
  fontSize: "1.1rem",
  fontWeight: 800,
  color: c.ink,
};
