"use client";

import { useState } from "react";
import type { ScreenId } from "@fitness-battle/shared";
import {
  PROTOTYPE_WEEK_COMPLETION,
  PROTOTYPE_RETURN_PROGRESS,
  PROTOTYPE_AVAILABLE_COMPETITIONS,
  PROTOTYPE_GHOST_COMPARISON,
  SUPPORTED_SPORTS,
} from "@fitness-battle/shared";
import { HomeRedesign, type HomeVariant } from "./home/home-redesign";
import { ArenaRedesign, type ArenaVariant } from "./arena/arena-redesign";
import { CrewRedesign, type CrewVariant } from "./crew/crew-redesign";
import { AthleteRedesign, type AthleteVariant } from "./athlete/athlete-redesign";
import { BackfillDialog } from "./modals/backfill-dialog";
import { WeekCompletionModal } from "./modals/week-completion-modal";
import { ReturnProgressToast } from "./modals/return-progress-toast";
import { RegistrationDialog } from "./modals/registration-dialog";
import { GhostTelemetryModal } from "./modals/ghost-telemetry-modal";
import "./redesign.css";

export function RedesignShell({ initialScreen = "home" }: { initialScreen?: ScreenId }) {
  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialScreen);
  const [homeVariant, setHomeVariant] = useState<HomeVariant>("ridge");
  const [arenaVariant, setArenaVariant] = useState<ArenaVariant>("split_duel");
  const [crewVariant, setCrewVariant] = useState<CrewVariant>("clubhouse");
  const [athleteVariant, setAthleteVariant] = useState<AthleteVariant>("passport");

  // Supporting Flow Modals
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [weekCompleteOpen, setWeekCompleteOpen] = useState(false);
  const [returnProgressOpen, setReturnProgressOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [ghostTelemetryOpen, setGhostTelemetryOpen] = useState(false);
  const [sportFilterOpen, setSportFilterOpen] = useState(false);
  const [selectedSportCategory, setSelectedSportCategory] = useState<"all" | "gps" | "non_gps" | "tracking">("all");

  return (
    <div className="rd-container">
      {/* Top Header & Fast Testing Bar */}
      <header className="rd-header">
        <div className="rd-header-top">
          <div className="rd-screen-title">
            <span>Fitness Battle</span>
            <span className="rd-screen-badge">
              {activeScreen === "home" && "Tab 1: Home"}
              {activeScreen === "arena" && "Tab 2: Arena"}
              {activeScreen === "crew" && "Tab 3: Crew"}
              {activeScreen === "athlete" && "Tab 4: Athlete"}
            </span>
          </div>

          <button
            type="button"
            className="rd-btn-secondary"
            style={{ fontSize: 11, padding: "4px 8px" }}
            onClick={() => setSportFilterOpen(true)}
          >
            🏃 Sports Filter
          </button>
        </div>

        {/* Quick Testing Actions Bar */}
        <div className="rd-test-toolbar">
          <button type="button" className="rd-test-btn" onClick={() => setReturnProgressOpen(true)}>
            ⚡ Return with Progress
          </button>
          <button type="button" className="rd-test-btn" onClick={() => setWeekCompleteOpen(true)}>
            🏆 Week Settled (Podium)
          </button>
          <button type="button" className="rd-test-btn" onClick={() => setBackfillOpen(true)}>
            🔄 90-Day Backfill
          </button>
          <button type="button" className="rd-test-btn" onClick={() => setRegistrationOpen(true)}>
            📋 Register (Solo / Crew)
          </button>
          <button type="button" className="rd-test-btn" onClick={() => setGhostTelemetryOpen(true)}>
            👻 Ghost Comparator
          </button>
        </div>
      </header>

      {/* Return With Progress Toast */}
      {returnProgressOpen && (
        <ReturnProgressToast
          progress={PROTOTYPE_RETURN_PROGRESS}
          onDismiss={() => setReturnProgressOpen(false)}
          onViewArena={() => {
            setReturnProgressOpen(false);
            setActiveScreen("arena");
          }}
        />
      )}

      {/* Active Screen Tab Content */}
      <main className="rd-content">
        {activeScreen === "home" && (
          <HomeRedesign variant={homeVariant} onVariantChange={setHomeVariant} />
        )}
        {activeScreen === "arena" && (
          <ArenaRedesign variant={arenaVariant} onVariantChange={setArenaVariant} />
        )}
        {activeScreen === "crew" && (
          <CrewRedesign variant={crewVariant} onVariantChange={setCrewVariant} />
        )}
        {activeScreen === "athlete" && (
          <AthleteRedesign variant={athleteVariant} onVariantChange={setAthleteVariant} />
        )}
      </main>

      {/* Modern Bottom Navigation Bar */}
      <nav className="rd-bottom-nav" aria-label="Bottom Screen Navigation">
        <button
          type="button"
          className={`rd-nav-item ${activeScreen === "home" ? "is-active" : ""}`}
          onClick={() => setActiveScreen("home")}
          aria-label="Tab 1: Home"
        >
          {activeScreen === "home" && <div className="rd-nav-pill-active" />}
          <span className="rd-nav-icon">🏡</span>
          <span className="rd-nav-label">Home</span>
        </button>

        <button
          type="button"
          className={`rd-nav-item ${activeScreen === "arena" ? "is-active" : ""}`}
          onClick={() => setActiveScreen("arena")}
          aria-label="Tab 2: Arena"
        >
          {activeScreen === "arena" && <div className="rd-nav-pill-active" />}
          <span className="rd-nav-icon">🏟️</span>
          <span className="rd-nav-label">Arena</span>
        </button>

        <button
          type="button"
          className={`rd-nav-item ${activeScreen === "crew" ? "is-active" : ""}`}
          onClick={() => setActiveScreen("crew")}
          aria-label="Tab 3: Crew"
        >
          {activeScreen === "crew" && <div className="rd-nav-pill-active" />}
          <span className="rd-nav-icon">🛡️</span>
          <span className="rd-nav-label">Crew</span>
        </button>

        <button
          type="button"
          className={`rd-nav-item ${activeScreen === "athlete" ? "is-active" : ""}`}
          onClick={() => setActiveScreen("athlete")}
          aria-label="Tab 4: Athlete"
        >
          {activeScreen === "athlete" && <div className="rd-nav-pill-active" />}
          <span className="rd-nav-icon">👤</span>
          <span className="rd-nav-label">Athlete</span>
        </button>
      </nav>

      {/* Global Modals for Supporting Flows */}
      <BackfillDialog
        open={backfillOpen}
        onClose={() => setBackfillOpen(false)}
        onComplete={() => {
          setBackfillOpen(false);
          setActiveScreen("home");
        }}
      />

      <WeekCompletionModal
        open={weekCompleteOpen}
        completion={PROTOTYPE_WEEK_COMPLETION}
        onClose={() => setWeekCompleteOpen(false)}
      />

      <RegistrationDialog
        open={registrationOpen}
        competitions={PROTOTYPE_AVAILABLE_COMPETITIONS}
        crewName="Neon Gazelles"
        onClose={() => setRegistrationOpen(false)}
        onConfirmRegistration={(compId, format, sportId) => {
          setRegistrationOpen(false);
          setActiveScreen("arena");
        }}
      />

      <GhostTelemetryModal
        open={ghostTelemetryOpen}
        ghost={PROTOTYPE_GHOST_COMPARISON}
        onClose={() => setGhostTelemetryOpen(false)}
      />

      {/* Sport Category Filter Dialog */}
      {sportFilterOpen && (
        <div className="rd-modal-overlay" onClick={() => setSportFilterOpen(false)}>
          <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                  Supported Disciplines
                </span>
                <h3 className="rd-modal-title">GPS vs Open Elo & Tracking</h3>
              </div>
              <button type="button" className="rd-modal-close-btn" onClick={() => setSportFilterOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, background: "var(--paper, #eef1f4)", padding: 4, borderRadius: 12 }}>
              <button
                type="button"
                onClick={() => setSelectedSportCategory("all")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedSportCategory === "all" ? "var(--card, #ffffff)" : "transparent",
                  color: selectedSportCategory === "all" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedSportCategory("gps")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedSportCategory === "gps" ? "var(--card, #ffffff)" : "transparent",
                  color: selectedSportCategory === "gps" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                }}
              >
                🛰 GPS
              </button>
              <button
                type="button"
                onClick={() => setSelectedSportCategory("non_gps")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedSportCategory === "non_gps" ? "var(--card, #ffffff)" : "transparent",
                  color: selectedSportCategory === "non_gps" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                }}
              >
                ⚡ Non-GPS
              </button>
              <button
                type="button"
                onClick={() => setSelectedSportCategory("tracking")}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedSportCategory === "tracking" ? "var(--card, #ffffff)" : "transparent",
                  color: selectedSportCategory === "tracking" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
                }}
              >
                ❤️ Tracking
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUPPORTED_SPORTS.filter(
                (s) => selectedSportCategory === "all" || s.category === selectedSportCategory,
              ).map((sport) => (
                <div
                  key={sport.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--paper, #eef1f4)",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {sport.isGps ? "🛰 " : sport.category === "tracking" ? "❤️ " : "⚡ "}
                      {sport.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted, #5c6578)", display: "block" }}>
                      {sport.description}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                    Unit: {sport.unit}
                  </span>
                </div>
              ))}
            </div>

            <button type="button" className="rd-btn-secondary" onClick={() => setSportFilterOpen(false)}>
              Close Disciplines Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
