"use client";

import { useState } from "react";
import type { AthleteProfile, SensorStatus } from "@fitness-battle/shared";
import {
  PROTOTYPE_ATHLETE_PROFILE,
  PROTOTYPE_SENSORS,
  PROTOTYPE_ATHLETE_ANALYTICS,
  SUPPORTED_SPORTS,
} from "@fitness-battle/shared";
import { AthleteProgressModal } from "../modals/athlete-progress-modal";
import { BackfillDialog } from "../modals/backfill-dialog";

export type AthleteVariant = "passport" | "bento" | "kinetic" | "gamer_hex" | "command";

interface Props {
  variant?: AthleteVariant;
  onVariantChange?: (variant: AthleteVariant) => void;
}

export function AthleteRedesign({ variant = "passport", onVariantChange }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<AthleteVariant>(variant);
  const [profile, setProfile] = useState<AthleteProfile>(PROTOTYPE_ATHLETE_PROFILE);
  const [sensors, setSensors] = useState<SensorStatus[]>(PROTOTYPE_SENSORS);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [allowCrewInvites, setAllowCrewInvites] = useState(true);
  const [gpsVerifiedOnly, setGpsVerifiedOnly] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);

  const activeVariant = onVariantChange ? variant : selectedVariant;

  function handleVariantSwitch(v: AthleteVariant) {
    if (onVariantChange) onVariantChange(v);
    else setSelectedVariant(v);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Variant Switcher Control */}
      <div className="rd-variant-selector-wrap">
        <div className="rd-variant-label">
          <span>Athlete Layout Design</span>
          <span className="rd-variant-name">
            {activeVariant === "passport" && "1. Pro Athlete Passport"}
            {activeVariant === "bento" && "2. Modern Bento Grid"}
            {activeVariant === "kinetic" && "3. Minimalist Kinetic Dossier"}
            {activeVariant === "gamer_hex" && "4. Gamer Telemetry & Ladder"}
            {activeVariant === "command" && "5. Command Center Profile"}
          </span>
        </div>
        <div className="rd-variant-pills">
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "passport" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("passport")}
          >
            Passport
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "bento" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("bento")}
          >
            Bento
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "kinetic" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("kinetic")}
          >
            Kinetic
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "gamer_hex" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("gamer_hex")}
          >
            Gamer
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "command" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("command")}
          >
            Command
          </button>
        </div>
      </div>

      {/* ==============================================================
          DESIGN 1: PRO ATHLETE PASSPORT
          ============================================================== */}
      {activeVariant === "passport" && (
        <>
          <div className="rd-athlete-hero">
            <div className="rd-athlete-avatar-lg">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="rd-athlete-info">
              <h2 className="rd-athlete-name-lg">{profile.name}</h2>
              <span className="rd-athlete-handle">{profile.handle} · {profile.city}</span>
              <div>
                <span className="rd-athlete-leo-badge">
                  ⚡ {profile.leoScore} Elo · {profile.division}
                </span>
              </div>
            </div>
          </div>

          {/* Preferences & Settings */}
          <div style={{ background: "var(--card, #ffffff)", border: "1px solid var(--line, #dce1ea)", borderRadius: 16, padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Athlete Preferences & Settings
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>Crew Squad Invites</span>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>Allow friends to send you squad battle invites</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowCrewInvites}
                  onChange={(e) => setAllowCrewInvites(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>Strict GPS Scoring Only</span>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>Only count outdoor GPS traces toward Elo score</span>
                </div>
                <input
                  type="checkbox"
                  checked={gpsVerifiedOnly}
                  onChange={(e) => setGpsVerifiedOnly(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>Push Nudge Alerts</span>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>Receive crew motivation notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={pushAlerts}
                  onChange={(e) => setPushAlerts(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* Sensor Connections */}
          <div style={{ background: "var(--card, #ffffff)", border: "1px solid var(--line, #dce1ea)", borderRadius: 16, padding: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Connected Trackers & Hardware
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sensors.map((sensor) => (
                <div
                  key={sensor.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: "var(--paper, #eef1f4)",
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{sensor.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: sensor.status === "connected" ? "var(--lime-deep, #7ab800)" : "#94a3b8",
                      background: sensor.status === "connected" ? "#f4faeb" : "#f1f5f9",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {sensor.status === "connected" ? "Connected ✓" : "Disconnected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ==============================================================
          DESIGN 2: MODERN ATHLETIC BENTO GRID
          ============================================================== */}
      {activeVariant === "bento" && (
        <div className="rd-bento-grid">
          <div className="rd-bento-card span-2">
            <span className="rd-bento-card-title">Athlete Profile</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{profile.name}</h3>
                <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>{profile.city} · {profile.tier}</span>
              </div>
              <span style={{ fontSize: 28 }}>🏃</span>
            </div>
          </div>

          <div className="rd-bento-card" onClick={() => setProgressModalOpen(true)} style={{ cursor: "pointer" }}>
            <span className="rd-bento-card-title">Leo Elo Rating</span>
            <span className="rd-bento-card-metric" style={{ color: "var(--lime-deep, #7ab800)" }}>
              {profile.leoScore}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Division 2 (Master) ↗</span>
          </div>

          <div className="rd-bento-card" onClick={() => setProgressModalOpen(true)} style={{ cursor: "pointer" }}>
            <span className="rd-bento-card-title">Season Volume</span>
            <span className="rd-bento-card-metric">{profile.totalDistanceKm}k</span>
            <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Across 148 workouts ↗</span>
          </div>

          <div className="rd-bento-card span-2">
            <span className="rd-bento-card-title">Biometric Recovery (Oura & Apple)</span>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Resting HR</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>49 bpm</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Sleep Avg</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>7.8 hrs</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Readiness</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>88%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          DESIGN 3: MINIMALIST KINETIC ATHLETE RECORD
          ============================================================== */}
      {activeVariant === "kinetic" && (
        <div style={{ background: "var(--card, #ffffff)", border: "1px solid var(--line, #dce1ea)", borderRadius: 16, padding: 18 }}>
          <div style={{ borderBottom: "2px solid var(--ink, #12141a)", paddingBottom: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              ATHLETE DOSSIER RECORD
            </span>
            <h2 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800 }}>{profile.name}</h2>
            <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>{profile.handle} · {profile.division}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Leo Rating</span>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{profile.leoScore} Elo</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Recorded Sessions</span>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{profile.totalWorkouts}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Total Distance</span>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{profile.totalDistanceKm} km</p>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          DESIGN 4: GAMER TELEMETRY & ATTRIBUTE HEXAGON
          ============================================================== */}
      {activeVariant === "gamer_hex" && (
        <div style={{ background: "linear-gradient(135deg, #12141a 0%, #1e2638 100%)", color: "#ffffff", borderRadius: 18, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--lime, #b7f255)", textTransform: "uppercase", fontWeight: 800 }}>
                Athlete Attributes Telemetry
              </span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{profile.name} · Level 42</h3>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--lime, #b7f255)" }}>
              {profile.leoScore} Leo
            </span>
          </div>

          {/* Hex Stats List */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: 10, borderRadius: 10 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Endurance</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>92 / 100</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: 10, borderRadius: 10 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Pace Efficiency</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>88 / 100</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: 10, borderRadius: 10 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Weekly Consistency</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>96 / 100</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: 10, borderRadius: 10 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Recovery Index</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>88 / 100</p>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          DESIGN 5: COMMAND CENTER PROFILE
          ============================================================== */}
      {activeVariant === "command" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--card, #ffffff)", border: "1px solid var(--line, #dce1ea)", borderRadius: 16, padding: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              Command Telemetry Hub
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{profile.name}</h3>
                <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>Active Hardware: Strava + Apple Health</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>
                {profile.leoScore} Elo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT PROGRESS BUTTON (Core User Requirement) */}
      <button
        type="button"
        className="rd-progress-cta-bar"
        onClick={() => setProgressModalOpen(true)}
      >
        <div className="rd-progress-cta-left">
          <div className="rd-progress-cta-icon">📈</div>
          <div>
            <h4 className="rd-progress-cta-title">Deep Dive Progress & Trends</h4>
            <p className="rd-progress-cta-sub">
              Inspect Leo score charts, weekly volume bars & recovery vitals
            </p>
          </div>
        </div>
        <span className="rd-progress-cta-arrow">→</span>
      </button>

      {/* One-Time Historical Backfill Trigger Button */}
      <button
        type="button"
        className="rd-btn-secondary"
        style={{ width: "100%", padding: "10px 0" }}
        onClick={() => setBackfillModalOpen(true)}
      >
        <span>🔄 Re-calibrate 90-Day Historical Backfill</span>
      </button>

      {/* Pop-up: Comprehensive Athlete Progress Modal */}
      <AthleteProgressModal
        open={progressModalOpen}
        analytics={PROTOTYPE_ATHLETE_ANALYTICS}
        onClose={() => setProgressModalOpen(false)}
      />

      {/* Pop-up: One-Time Onboarding & Backfill Modal */}
      <BackfillDialog
        open={backfillModalOpen}
        onClose={() => setBackfillModalOpen(false)}
        onComplete={() => {
          setBackfillModalOpen(false);
        }}
      />
    </div>
  );
}
