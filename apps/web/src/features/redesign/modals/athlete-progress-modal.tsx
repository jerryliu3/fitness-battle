"use client";

import { useState } from "react";
import type { AthleteAnalytics } from "@fitness-battle/shared";
import { PROTOTYPE_ATHLETE_ANALYTICS } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  analytics?: AthleteAnalytics;
  onClose: () => void;
}

export function AthleteProgressModal({ open, analytics = PROTOTYPE_ATHLETE_ANALYTICS, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"leo" | "volume" | "sports" | "recovery">("leo");

  if (!open) return null;

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              Performance Dossier
            </span>
            <h2 className="rd-modal-title">Progress, Trends & Leo Score</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Analytics Tabs */}
        <div style={{ display: "flex", gap: 6, background: "var(--paper, #eef1f4)", padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            onClick={() => setActiveTab("leo")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "7px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "leo" ? "var(--card, #ffffff)" : "transparent",
              color: activeTab === "leo" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            📈 Leo Elo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("volume")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "7px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "volume" ? "var(--card, #ffffff)" : "transparent",
              color: activeTab === "volume" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            📊 Volume
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sports")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "7px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "sports" ? "var(--card, #ffffff)" : "transparent",
              color: activeTab === "sports" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            🏃 Sports
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recovery")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "7px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "recovery" ? "var(--card, #ffffff)" : "transparent",
              color: activeTab === "recovery" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            ❤️ Recovery
          </button>
        </div>

        {/* Tab 1: Leo Score Trend */}
        {activeTab === "leo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "linear-gradient(135deg, #12141a 0%, #1f2738 100%)", color: "#ffffff", padding: 16, borderRadius: 14 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                Current Leo Rating
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 28, fontWeight: 800, color: "var(--lime, #b7f255)" }}>
                1,842 Elo <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff" }}>· Division 2 (Master)</span>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>
                +222 Elo gained over the last 8 weekly seasons.
              </p>
            </div>

            {/* Visual Sparkline Bars */}
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                8-Week Historical Progression
              </span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 110, marginTop: 12, gap: 8 }}>
                {analytics.leoTrend.map((item, idx) => {
                  const min = 1500;
                  const max = 1900;
                  const heightPercent = Math.max(15, Math.min(100, ((item.score - min) / (max - min)) * 100));
                  const isLatest = idx === analytics.leoTrend.length - 1;
                  return (
                    <div key={item.period} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, marginBottom: 4, color: isLatest ? "var(--lime-deep, #7ab800)" : "var(--muted, #5c6578)" }}>
                        {item.score}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 24,
                          height: `${heightPercent}%`,
                          borderRadius: "6px 6px 0 0",
                          background: isLatest ? "var(--lime-deep, #7ab800)" : "var(--ink, #12141a)",
                          transition: "height 300ms ease",
                        }}
                      />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted, #5c6578)", marginTop: 4 }}>
                        {item.period.replace("Week ", "W")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Weekly Volume Bars */}
        {activeTab === "volume" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                Weekly Mileage (Kilometers)
              </span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 12, gap: 8 }}>
                {analytics.weeklyVolume.map((vol, idx) => {
                  const maxKm = 65;
                  const heightPercent = Math.min(100, (vol.km / maxKm) * 100);
                  const isLatest = idx === analytics.weeklyVolume.length - 1;
                  return (
                    <div key={vol.weekLabel} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: isLatest ? "var(--lime-deep, #7ab800)" : "var(--ink, #12141a)" }}>
                        {vol.km}k
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 28,
                          height: `${heightPercent}%`,
                          borderRadius: "6px 6px 0 0",
                          background: isLatest ? "var(--lime-deep, #7ab800)" : "#94a3b8",
                        }}
                      />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted, #5c6578)", marginTop: 4 }}>
                        {vol.weekLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #5c6578)" }}>
              Weekly volume averaged 47.2 km over the past 6 weeks across 31 total sessions.
            </p>
          </div>
        )}

        {/* Tab 3: Sport Distribution */}
        {activeTab === "sports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              Discipline Breakdown & GPS Verification
            </p>
            {analytics.sportBreakdown.map((item) => (
              <div
                key={item.sportId}
                style={{
                  background: "var(--paper, #eef1f4)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{item.isGps ? "🛰" : "⚡"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                      {item.sportName}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: item.isGps ? "#dcfce7" : "#f1f5f9", color: item.isGps ? "#166534" : "#475569", padding: "1px 6px", borderRadius: 4 }}>
                      {item.isGps ? "GPS Verified" : "Open Score"}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    {item.percentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.percentage}%`, background: item.isGps ? "var(--lime-deep, #7ab800)" : "var(--ink, #12141a)", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Recovery Telemetry */}
        {activeTab === "recovery" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                Resting Heart Rate
              </span>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                {analytics.recoveryTelemetry.restingHr} <span style={{ fontSize: 13 }}>bpm</span>
              </p>
              <span style={{ fontSize: 11, color: "var(--lime-deep, #7ab800)", fontWeight: 700 }}>
                ↓ -3 bpm vs baseline
              </span>
            </div>
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                Sleep Duration Avg
              </span>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                {analytics.recoveryTelemetry.sleepHoursAvg} <span style={{ fontSize: 13 }}>hrs</span>
              </p>
              <span style={{ fontSize: 11, color: "var(--lime-deep, #7ab800)", fontWeight: 700 }}>
                88% Sleep Efficiency
              </span>
            </div>
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                Heart Rate Variability
              </span>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                {analytics.recoveryTelemetry.hrvMs} <span style={{ fontSize: 13 }}>ms</span>
              </p>
              <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>
                Optimal autonomic balance
              </span>
            </div>
            <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                Daily Readiness
              </span>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>
                {analytics.recoveryTelemetry.readinessScore} <span style={{ fontSize: 13 }}>/ 100</span>
              </p>
              <span style={{ fontSize: 11, color: "var(--lime-deep, #7ab800)", fontWeight: 700 }}>
                Ready for tempo progression
              </span>
            </div>
          </div>
        )}

        <button type="button" className="rd-btn-secondary" onClick={onClose}>
          Close Performance Dossier
        </button>
      </div>
    </div>
  );
}
