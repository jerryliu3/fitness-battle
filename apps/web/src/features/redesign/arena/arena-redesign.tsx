"use client";

import { useState } from "react";
import type { ArenaCompetitor, AvailableCompetition } from "@fitness-battle/shared";
import {
  PROTOTYPE_ARENA_LEADERBOARD,
  PROTOTYPE_GHOST_COMPARISON,
  PROTOTYPE_ACHIEVEMENTS,
  PROTOTYPE_AVAILABLE_COMPETITIONS,
} from "@fitness-battle/shared";
import { RegistrationDialog } from "../modals/registration-dialog";
import { AllTimeRankingsModal } from "../modals/all-time-rankings-modal";
import { GhostTelemetryModal } from "../modals/ghost-telemetry-modal";

export type ArenaVariant = "split_duel" | "podium" | "cyber_radar" | "track_circuit" | "card_deck";

interface Props {
  variant?: ArenaVariant;
  onVariantChange?: (variant: ArenaVariant) => void;
}

export function ArenaRedesign({ variant = "split_duel", onVariantChange }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ArenaVariant>(variant);
  const [isRegistered, setIsRegistered] = useState(true);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [rankingsModalOpen, setRankingsModalOpen] = useState(false);
  const [ghostModalOpen, setGhostModalOpen] = useState(false);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const [filterSport, setFilterSport] = useState<"all" | "gps" | "open">("all");

  const activeVariant = onVariantChange ? variant : selectedVariant;

  function handleVariantSwitch(v: ArenaVariant) {
    if (onVariantChange) onVariantChange(v);
    else setSelectedVariant(v);
  }

  const you = PROTOTYPE_ARENA_LEADERBOARD.find((c) => c.isYou);
  const ghost = PROTOTYPE_ARENA_LEADERBOARD.find((c) => c.isGhost);
  const topThree = PROTOTYPE_ARENA_LEADERBOARD.filter((c) => !c.isGhost).slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Variant Switcher Control */}
      <div className="rd-variant-selector-wrap">
        <div className="rd-variant-label">
          <span>Arena Layout Design</span>
          <span className="rd-variant-name">
            {activeVariant === "split_duel" && "1. Split-Lane Ghost Duel"}
            {activeVariant === "podium" && "2. Podium Stadium & Division"}
            {activeVariant === "cyber_radar" && "3. Cyber Heatmap & Radar"}
            {activeVariant === "track_circuit" && "4. Head-to-Head Track Circuit"}
            {activeVariant === "card_deck" && "5. Streamlined Cards Deck"}
          </span>
        </div>
        <div className="rd-variant-pills">
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "split_duel" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("split_duel")}
          >
            Split
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "podium" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("podium")}
          >
            Podium
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "cyber_radar" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("cyber_radar")}
          >
            Cyber
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "track_circuit" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("track_circuit")}
          >
            Circuit
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "card_deck" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("card_deck")}
          >
            Deck
          </button>
        </div>
      </div>

      {/* Action Bar: Registration CTA, All-Time Rankings & Trophy Shelf */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        <button
          type="button"
          className="rd-btn-primary"
          style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }}
          onClick={() => setRegModalOpen(true)}
        >
          <span>📋 Register Solo or Crew</span>
        </button>
        <button
          type="button"
          className="rd-btn-secondary"
          style={{ padding: "8px 12px", fontSize: 12, flexShrink: 0 }}
          onClick={() => setRankingsModalOpen(true)}
        >
          <span>🌐 All-Time Global</span>
        </button>
        <button
          type="button"
          className="rd-btn-secondary"
          style={{ padding: "8px 12px", fontSize: 12, flexShrink: 0 }}
          onClick={() => setAchievementsModalOpen(true)}
        >
          <span>🏆 Awards ({PROTOTYPE_ACHIEVEMENTS.length})</span>
        </button>
        <button
          type="button"
          className="rd-btn-secondary"
          style={{ padding: "8px 12px", fontSize: 12, flexShrink: 0 }}
          onClick={() => setGhostModalOpen(true)}
        >
          <span>👻 Ghost Telemetry</span>
        </button>
      </div>

      {/* Empty State CTA (If athlete is not registered) */}
      {!isRegistered && (
        <section className="rd-empty-cta">
          <span style={{ fontSize: 32 }}>🏟</span>
          <h3>You Are Not in an Active Arena</h3>
          <p>Register solo or team up with your crew for this week's Division 2 Grand Prix.</p>
          <button
            type="button"
            className="rd-btn-primary"
            style={{ margin: "0 auto" }}
            onClick={() => setRegModalOpen(true)}
          >
            <span>Open Registration Panel →</span>
          </button>
        </section>
      )}

      {/* When registered, render the selected design */}
      {isRegistered && (
        <>
          {/* ==============================================================
              DESIGN 1: SPLIT-LANE GHOST DUEL
              ============================================================== */}
          {activeVariant === "split_duel" && (
            <div className="rd-arena-card">
              {/* Ghost Telemetry Header */}
              <div className="rd-ghost-banner" onClick={() => setGhostModalOpen(true)} style={{ cursor: "pointer" }}>
                <div className="rd-ghost-left">
                  <div className="rd-ghost-badge">👻</div>
                  <div>
                    <h4 className="rd-ghost-title">Ghost Self: Week 41 Cutoff</h4>
                    <p className="rd-ghost-desc">5:16/km pace · Tap to inspect split telemetry</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="rd-ghost-delta">+3.6 km</span>
                  <span style={{ fontSize: 10, display: "block", color: "#94a3b8" }}>AHEAD OF GHOST</span>
                </div>
              </div>

              {/* Split-Lane Progress Bars */}
              <div className="rd-lane-track">
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
                  Telemetry Split Lanes
                </span>
                {PROTOTYPE_ARENA_LEADERBOARD.slice(0, 5).map((comp) => (
                  <div key={comp.id} className="rd-lane-row">
                    <span className="rd-lane-name">{comp.name.split(" ")[0]}</span>
                    <div className="rd-lane-progress-bg">
                      <div
                        className={`rd-lane-progress-bar ${comp.isYou ? "is-you" : ""} ${comp.isGhost ? "is-ghost" : ""}`}
                        style={{ width: `${(comp.distanceKm / 50) * 100}%` }}
                      />
                    </div>
                    <span className="rd-lane-val">{comp.distanceKm}k</span>
                  </div>
                ))}
              </div>

              {/* Full Standings Table */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 8px" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                  Division 2 Active Standings
                </span>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>12 Athletes · Closes in 3d</span>
              </div>

              <div className="rd-leaderboard-list">
                {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                  <div
                    key={comp.id}
                    className={`rd-athlete-row ${comp.isYou ? "is-you" : ""} ${comp.isGhost ? "is-ghost" : ""}`}
                  >
                    <div className="rd-athlete-left">
                      <span className={`rd-athlete-rank ${comp.rank <= 3 ? `top-${comp.rank}` : ""}`}>
                        {comp.isGhost ? "👻" : `#${comp.rank}`}
                      </span>
                      <div className="rd-athlete-avatar">
                        {comp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="rd-athlete-name">
                          {comp.name}
                          {comp.crewTag && <span className="rd-crew-tag">[{comp.crewTag}]</span>}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>
                          {comp.pace} · {comp.leoScore} Elo
                        </span>
                      </div>
                    </div>
                    <div className="rd-athlete-right">
                      <span className="rd-athlete-metric">{comp.distanceKm} km</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: comp.rankTrend === "up" ? "var(--lime-deep, #7ab800)" : comp.rankTrend === "down" ? "#dc2626" : "var(--muted, #5c6578)",
                        }}
                      >
                        {comp.rankTrend === "up" ? "▲ GAINING" : comp.rankTrend === "down" ? "▼ DROPPING" : "● STEADY"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              DESIGN 2: PODIUM STADIUM & DIVISION ROSTER
              ============================================================== */}
          {activeVariant === "podium" && (
            <div className="rd-arena-card">
              {/* Top 3 Podium Hero Banner */}
              <div
                style={{
                  background: "linear-gradient(180deg, #12141a 0%, #1e2638 100%)",
                  borderRadius: 16,
                  padding: "20px 12px 14px",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  marginBottom: 16,
                }}
              >
                {/* 2nd Place */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>🥈</span>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#94a3b8", color: "#12141a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    {topThree[1]?.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{topThree[1]?.name.split(" ")[0]}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--lime, #b7f255)" }}>{topThree[1]?.distanceKm} km</span>
                  <div style={{ width: 64, height: 45, background: "rgba(255,255,255,0.12)", borderRadius: "8px 8px 0 0", marginTop: 6 }} />
                </div>

                {/* 1st Place */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 26 }}>👑</span>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#f59e0b", color: "#12141a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
                    {topThree[0]?.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>{topThree[0]?.name.split(" ")[0]}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--lime, #b7f255)" }}>{topThree[0]?.distanceKm} km</span>
                  <div style={{ width: 76, height: 70, background: "rgba(255,255,255,0.2)", borderRadius: "8px 8px 0 0", marginTop: 6 }} />
                </div>

                {/* 3rd Place (You) */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>🥉</span>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#d97706", color: "#12141a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    YOU
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>You</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--lime, #b7f255)" }}>{topThree[2]?.distanceKm} km</span>
                  <div style={{ width: 64, height: 30, background: "rgba(255,255,255,0.12)", borderRadius: "8px 8px 0 0", marginTop: 6 }} />
                </div>
              </div>

              {/* Ghost Benchmark Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  cursor: "pointer",
                }}
                onClick={() => setGhostModalOpen(true)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>👻</span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Past-Self Ghost: 34.2 km</span>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--muted, #5c6578)" }}>You are beating your past pace by 8s/km</p>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>+3.6 km Ahead</span>
              </div>

              {/* Remainder Leaderboard */}
              <div className="rd-leaderboard-list">
                {PROTOTYPE_ARENA_LEADERBOARD.slice(3).map((comp) => (
                  <div key={comp.id} className="rd-athlete-row">
                    <div className="rd-athlete-left">
                      <span className="rd-athlete-rank">#{comp.rank}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{comp.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{comp.distanceKm} km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              DESIGN 3: CYBER HEATMAP & DIVISION RADAR
              ============================================================== */}
          {activeVariant === "cyber_radar" && (
            <div className="rd-arena-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Division 2 Radar Roster</h3>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>1750–1950 Leo Rating Bracket</span>
                </div>
                <span style={{ background: "var(--ink, #12141a)", color: "var(--lime, #b7f255)", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>
                  LIVE WAVE
                </span>
              </div>

              {/* Data Grid with Columns */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)" }}>
                  <span>ATHLETE & CREW</span>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span>PACE</span>
                    <span>DISTANCE</span>
                  </div>
                </div>
                {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: comp.isYou ? "#f6fee7" : "var(--paper, #eef1f4)",
                      border: comp.isYou ? "1px solid var(--lime, #b7f255)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, width: 20 }}>{comp.isGhost ? "👻" : comp.rank}</span>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, display: "block" }}>{comp.name}</span>
                        <span style={{ fontSize: 10, color: "var(--muted, #5c6578)" }}>{comp.leoScore} Leo</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>{comp.pace}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, width: 55, textAlign: "right" }}>{comp.distanceKm}k</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              DESIGN 4: HEAD-TO-HEAD TRACK CIRCUIT
              ============================================================== */}
          {activeVariant === "track_circuit" && (
            <div className="rd-arena-card">
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                  Oval Pursuit Circuit
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800 }}>Weekly 50K Circuit</h3>
              </div>

              {/* Oval Track Representation */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 180,
                  borderRadius: 90,
                  border: "12px solid #e2e8f0",
                  background: "#f8fafc",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Circuit Inner Hub */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", textTransform: "uppercase", fontWeight: 700 }}>
                    You vs Ghost
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    +3.6 km Lead
                  </p>
                  <button
                    type="button"
                    onClick={() => setGhostModalOpen(true)}
                    style={{
                      border: "none",
                      background: "var(--lime, #b7f255)",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      marginTop: 4,
                    }}
                  >
                    Inspect Splits
                  </button>
                </div>

                {/* Runner position markers on the circuit */}
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "60%",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--lime-deep, #7ab800)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                  title="You (37.8 km)"
                >
                  YOU
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "45%",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#94a3b8",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    border: "2px dashed #ffffff",
                  }}
                  title="Ghost (34.2 km)"
                >
                  👻
                </div>
              </div>

              {/* Roster Cards */}
              <div className="rd-leaderboard-list">
                {PROTOTYPE_ARENA_LEADERBOARD.slice(0, 4).map((comp) => (
                  <div key={comp.id} className="rd-athlete-row">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      #{comp.rank} {comp.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{comp.distanceKm} km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              DESIGN 5: STREAMLINED CARDS DECK
              ============================================================== */}
          {activeVariant === "card_deck" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                <div
                  key={comp.id}
                  style={{
                    background: comp.isYou ? "#f6fee7" : "var(--card, #ffffff)",
                    border: comp.isYou ? "2px solid var(--lime, #b7f255)" : "1px solid var(--line, #dce1ea)",
                    borderRadius: 16,
                    padding: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--muted, #5c6578)" }}>
                        {comp.isGhost ? "👻" : `#${comp.rank}`}
                      </span>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                          {comp.name}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>
                          {comp.crewTag ? `Crew [${comp.crewTag}] · ` : ""}{comp.pace} avg
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                        {comp.distanceKm} km
                      </span>
                      <span style={{ fontSize: 11, color: "var(--lime-deep, #7ab800)", fontWeight: 700, display: "block" }}>
                        {comp.leoScore} Leo
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pop-up: Registration Modal */}
      <RegistrationDialog
        open={regModalOpen}
        competitions={PROTOTYPE_AVAILABLE_COMPETITIONS}
        crewName="Neon Gazelles"
        onClose={() => setRegModalOpen(false)}
        onConfirmRegistration={(compId, format, sportId) => {
          setIsRegistered(true);
        }}
      />

      {/* Pop-up: All-Time Global Rankings */}
      <AllTimeRankingsModal
        open={rankingsModalOpen}
        onClose={() => setRankingsModalOpen(false)}
      />

      {/* Pop-up: Ghost Telemetry Comparator */}
      <GhostTelemetryModal
        open={ghostModalOpen}
        ghost={PROTOTYPE_GHOST_COMPARISON}
        onClose={() => setGhostModalOpen(false)}
      />

      {/* Pop-up: Achievements and Awards Shelf */}
      {achievementsModalOpen && (
        <div className="rd-modal-overlay" onClick={() => setAchievementsModalOpen(false)}>
          <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                  Trophy Cabinet
                </span>
                <h3 className="rd-modal-title">Past Achievements & Awards</h3>
              </div>
              <button type="button" className="rd-modal-close-btn" onClick={() => setAchievementsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PROTOTYPE_ACHIEVEMENTS.map((ach) => (
                <div
                  key={ach.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "var(--paper, #eef1f4)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {ach.tier === "gold" ? "🥇" : ach.tier === "silver" ? "🥈" : "🥉"}
                  </span>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800 }}>{ach.title}</p>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                      {ach.subtitle} · {ach.earnedDate}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--ink, #12141a)" }}>{ach.description}</span>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="rd-btn-secondary" onClick={() => setAchievementsModalOpen(false)}>
              Close Trophy Cabinet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
