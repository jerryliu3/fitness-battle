"use client";

import { useState } from "react";
import { Ace } from "@/features/rally/ace";
import type { PrototypeDailyRecommendation, PrototypeHomeSession } from "@fitness-battle/shared";
import { PROTOTYPE_DAILY_RECOMMENDATION, PROTOTYPE_HOME_SESSIONS } from "@fitness-battle/shared";
import { WorkoutRecommendationSheet } from "../modals/workout-recommendation-sheet";

export type HomeVariant = "ridge" | "arcade" | "swiss" | "pebble" | "orbit";

interface Props {
  variant?: HomeVariant;
  onVariantChange?: (variant: HomeVariant) => void;
}

export function HomeRedesign({ variant = "ridge", onVariantChange }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<HomeVariant>(variant);
  const [recOpen, setRecOpen] = useState(false);
  const [emberAnim, setEmberAnim] = useState(false);
  const [inspectedSession, setInspectedSession] = useState<PrototypeHomeSession | null>(null);

  const activeVariant = onVariantChange ? variant : selectedVariant;

  function handleVariantSwitch(v: HomeVariant) {
    if (onVariantChange) onVariantChange(v);
    else setSelectedVariant(v);
  }

  function handleEmberClick() {
    setEmberAnim(true);
    setTimeout(() => {
      setEmberAnim(false);
      setRecOpen(true);
    }, 450);
  }

  const pastSessions = PROTOTYPE_HOME_SESSIONS.filter((s) => s.status === "completed");
  const currentSession = PROTOTYPE_HOME_SESSIONS.find((s) => s.status === "current");
  const futureSessions = PROTOTYPE_HOME_SESSIONS.filter((s) => s.status === "future");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Variant Switcher Control */}
      <div className="rd-variant-selector-wrap">
        <div className="rd-variant-label">
          <span>Home Layout Design</span>
          <span className="rd-variant-name">
            {activeVariant === "ridge" && "1. Alpine Ridge (Topo S-Curve)"}
            {activeVariant === "arcade" && "2. Arcade Stepper (Isometric)"}
            {activeVariant === "swiss" && "3. Swiss Minimalist (Timeline)"}
            {activeVariant === "pebble" && "4. Tactile Pebble River"}
            {activeVariant === "orbit" && "5. Constellation Orbit"}
          </span>
        </div>
        <div className="rd-variant-pills">
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "ridge" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("ridge")}
          >
            Ridge
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "arcade" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("arcade")}
          >
            Arcade
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "swiss" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("swiss")}
          >
            Swiss
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "pebble" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("pebble")}
          >
            Pebble
          </button>
          <button
            type="button"
            className={`rd-variant-btn ${activeVariant === "orbit" ? "is-active" : ""}`}
            onClick={() => handleVariantSwitch("orbit")}
          >
            Orbit
          </button>
        </div>
      </div>

      {/* Hero: Daily Exercise Suggestion Card */}
      <div className="rd-home-hero">
        <div className="rd-hero-header">
          <span className="rd-hero-kicker">
            <span>⚡</span> Coach Ember Daily Prescription
          </span>
          <span className="rd-hero-badge">Zone 2–3 Aerobic</span>
        </div>
        <h2 className="rd-hero-title">{PROTOTYPE_DAILY_RECOMMENDATION.title}</h2>
        <p className="rd-hero-subtitle">{PROTOTYPE_DAILY_RECOMMENDATION.subtitle}</p>

        <div className="rd-hero-action" onClick={handleEmberClick} role="button" tabIndex={0}>
          <div className="rd-hero-action-copy">
            <span className="rd-hero-action-label">Target Volume</span>
            <span className="rd-hero-action-val">
              {PROTOTYPE_DAILY_RECOMMENDATION.targetVolume} · {PROTOTYPE_DAILY_RECOMMENDATION.durationMin} min
            </span>
          </div>
          <span className="rd-hero-action-cta">Inspect Plan →</span>
        </div>
      </div>

      {/* ==============================================================
          DESIGN 1: ALPINE RIDGE & WINDING S-CURVE
          ============================================================== */}
      {activeVariant === "ridge" && (
        <section className="rd-path-section" aria-label="Alpine Ridge S-Curve Path">
          <div className="rd-path-section-header">
            <div>
              <span className="rd-path-section-title">Winding 10-Session Journey</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                Follow the trail through past sessions. Tap Ember on Today.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", padding: "2px 8px", borderRadius: 6 }}>
              Ridge Path
            </span>
          </div>

          <div className="rd-trail-canvas">
            {/* Smooth Winding SVG Track */}
            <svg className="rd-trail-svg" viewBox="0 0 340 680" preserveAspectRatio="none">
              <path
                d="M 170 20 C 60 70, 70 140, 170 180 S 280 260, 170 320 S 60 410, 170 480 S 270 560, 170 650"
                fill="none"
                stroke="var(--line, #dce1ea)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="4 8"
              />
              <path
                d="M 170 20 C 60 70, 70 140, 170 180 S 280 260, 170 320 S 60 410, 170 480"
                fill="none"
                stroke="var(--lime-deep, #7ab800)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>

            {/* Past 10 Sessions along the path */}
            {pastSessions.map((session, idx) => {
              // Pre-calculated coordinates along the S-curve
              const coords = [
                { x: 170, y: 35 },
                { x: 95, y: 75 },
                { x: 75, y: 125 },
                { x: 125, y: 165 },
                { x: 215, y: 195 },
                { x: 255, y: 245 },
                { x: 215, y: 290 },
                { x: 125, y: 330 },
                { x: 80, y: 375 },
                { x: 105, y: 430 },
              ][idx] || { x: 170, y: 450 };

              return (
                <button
                  key={session.id}
                  type="button"
                  className="rd-path-node"
                  style={{ left: `${(coords.x / 340) * 100}%`, top: `${(coords.y / 680) * 100}%` }}
                  onClick={() => setInspectedSession(session)}
                  aria-label={`${session.dayLabel}: ${session.volume} on ${session.sportName}`}
                >
                  <div className="rd-node-disc is-completed">
                    <span className="rd-node-check">✓</span>
                    <span className="rd-node-vol">{session.volume}</span>
                  </div>
                  <span className="rd-node-day">{session.weekdayShort}</span>
                </button>
              );
            })}

            {/* Current Day Node (Has Ember!) */}
            {currentSession && (
              <button
                type="button"
                className="rd-path-node"
                style={{
                  left: "50%",
                  top: "72%",
                  transform: emberAnim ? "translate(-50%, -50%) scale(1.2) rotate(-8deg)" : "translate(-50%, -50%)",
                  transition: "transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                onClick={handleEmberClick}
                aria-label="Today checkpoint with Ember. Tap to open daily recommendation"
              >
                <div className="rd-node-disc is-current">
                  <div className="rd-ember-avatar-wrap rd-ember-bounce">
                    <Ace decorative={false} />
                    <span className="rd-ember-star-badge">TODAY</span>
                  </div>
                </div>
                <span className="rd-node-day" style={{ fontWeight: 800, color: "var(--ink, #12141a)" }}>
                  Today · Tap Ember!
                </span>
              </button>
            )}

            {/* Future Sessions (Non-interactable blocks) */}
            {futureSessions.map((future, idx) => {
              const futureCoords = [
                { x: 235, y: 550 },
                { x: 240, y: 605 },
                { x: 170, y: 650 },
              ][idx] || { x: 170, y: 650 };

              return (
                <div
                  key={future.id}
                  className="rd-path-node"
                  style={{ left: `${(futureCoords.x / 340) * 100}%`, top: `${(futureCoords.y / 680) * 100}%` }}
                  aria-hidden="true"
                >
                  <div className="rd-node-disc is-future">
                    <span style={{ fontSize: 10, fontWeight: 700 }}>🔒</span>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{future.volume}</span>
                  </div>
                  <span className="rd-node-day">{future.weekdayShort}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ==============================================================
          DESIGN 2: ISOMETRIC ARCADE STEPPER
          ============================================================== */}
      {activeVariant === "arcade" && (
        <section className="rd-path-section" aria-label="Isometric Arcade Stepper">
          <div className="rd-path-section-header">
            <div>
              <span className="rd-path-section-title">Arcade Stepper Grid</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                3D-style stepping stones. Ember is ready on the current day plinth.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#fef08a", color: "#854d0e", padding: "2px 8px", borderRadius: 6 }}>
              Cyber Plinths
            </span>
          </div>

          <div className="rd-iso-grid">
            {pastSessions.map((session, idx) => (
              <div
                key={session.id}
                className="rd-iso-card"
                onClick={() => setInspectedSession(session)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "#f4faeb",
                      border: "2px solid var(--lime-deep, #7ab800)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      color: "var(--lime-deep, #7ab800)",
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                      {session.dayLabel} · {session.sportName}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                      {session.summary}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    {session.volume}
                  </span>
                  <span style={{ fontSize: 10, display: "block", color: "var(--lime-deep, #7ab800)", fontWeight: 700 }}>
                    COMPLETED ✓
                  </span>
                </div>
              </div>
            ))}

            {/* Current Day Plinth with Ember */}
            {currentSession && (
              <div
                className="rd-iso-card is-current"
                onClick={handleEmberClick}
                style={{
                  cursor: "pointer",
                  transform: emberAnim ? "scale(1.03)" : "none",
                  transition: "transform 200ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44 }}>
                    <Ace decorative={false} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                      Current Day Plinth
                    </span>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                      Ember Mission: 5.8 km Progression
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                      Tap Ember to reveal workout details
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, background: "var(--lime, #b7f255)", padding: "4px 8px", borderRadius: 6 }}>
                  Active ⭐
                </span>
              </div>
            )}

            {/* Future Locked Plinths */}
            {futureSessions.map((future) => (
              <div key={future.id} className="rd-iso-card is-future">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--muted, #5c6578)" }}>
                      {future.dayLabel} ({future.sportName})
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{future.summary}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{future.volume}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================
          DESIGN 3: SWISS MINIMALIST TIMELINE
          ============================================================== */}
      {activeVariant === "swiss" && (
        <section className="rd-path-section" aria-label="Swiss Minimalist Timeline">
          <div className="rd-path-section-header">
            <div>
              <span className="rd-path-section-title">Swiss Chrono Track</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                Clean editorial line with pace stamps and split data.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#e2e8f0", padding: "2px 8px", borderRadius: 6 }}>
              Editorial
            </span>
          </div>

          <div className="rd-swiss-timeline">
            {pastSessions.map((session) => (
              <div
                key={session.id}
                className="rd-swiss-item"
                onClick={() => setInspectedSession(session)}
                style={{ cursor: "pointer" }}
              >
                <div className="rd-swiss-dot is-completed" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted, #5c6578)" }}>
                    {session.dayLabel}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    {session.volume}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink, #12141a)" }}>
                  {session.sportName} {session.pace ? `· ${session.pace}` : `· ${session.durationMin}m`}
                </p>
              </div>
            ))}

            {/* Swiss Current Day with Ember */}
            {currentSession && (
              <div
                className="rd-swiss-item"
                onClick={handleEmberClick}
                style={{
                  background: "#f6fee7",
                  border: "1px solid var(--lime, #b7f255)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  margin: "6px 0",
                }}
              >
                <div className="rd-swiss-dot is-current" />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36 }}>
                    <Ace decorative={false} />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                      TODAY · EMBER REVIEWS
                    </span>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                      {PROTOTYPE_DAILY_RECOMMENDATION.title}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Swiss Future Items */}
            {futureSessions.map((future) => (
              <div key={future.id} className="rd-swiss-item" style={{ opacity: 0.5 }}>
                <div className="rd-swiss-dot" />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>{future.dayLabel}</span>
                  <span style={{ fontSize: 12, color: "var(--muted, #5c6578)" }}>{future.volume}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================
          DESIGN 4: TACTILE PEBBLE RIVERBED
          ============================================================== */}
      {activeVariant === "pebble" && (
        <section className="rd-path-section" aria-label="Tactile Pebble Riverbed">
          <div className="rd-path-section-header">
            <div>
              <span className="rd-path-section-title">Tactile Riverbed Path</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                Organic pebble stones. Completed ripples glow soft green.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#ecfdf5", color: "#065f46", padding: "2px 8px", borderRadius: 6 }}>
              Pebble River
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {pastSessions.map((session, idx) => (
              <div
                key={session.id}
                onClick={() => setInspectedSession(session)}
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 20,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--lime-deep, #7ab800)" }}>
                  {session.weekdayShort} #{idx + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink, #12141a)", margin: "2px 0" }}>
                  {session.volume}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>{session.sportName}</span>
              </div>
            ))}

            {/* Ember River Stone */}
            {currentSession && (
              <div
                onClick={handleEmberClick}
                style={{
                  gridColumn: "span 2",
                  background: "radial-gradient(circle, #fffef0 40%, #f4ffcf 100%)",
                  border: "2px solid var(--lime, #b7f255)",
                  borderRadius: 24,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(183, 242, 85, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44 }}>
                    <Ace decorative={false} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                      Today's Radiant Pebble
                    </span>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                      {PROTOTYPE_DAILY_RECOMMENDATION.title}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 20 }}>✨</span>
              </div>
            )}

            {/* Submerged Future Stones */}
            {futureSessions.map((future) => (
              <div
                key={future.id}
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 20,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: 0.6,
                }}
              >
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{future.dayLabel}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{future.volume}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================
          DESIGN 5: CONSTELLATION ORBIT TRAIL
          ============================================================== */}
      {activeVariant === "orbit" && (
        <section className="rd-path-section" aria-label="Constellation Orbit Trail">
          <div className="rd-path-section-header">
            <div>
              <span className="rd-path-section-title">Celestial Orbit Trail</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                Curved orbital stations. Ember sits in the central solar checkpoint.
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#1e293b", color: "#f8fafc", padding: "2px 8px", borderRadius: 6 }}>
              Orbit Waypoints
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Solar Ember Checkpoint */}
            {currentSession && (
              <div
                onClick={handleEmberClick}
                style={{
                  background: "linear-gradient(135deg, #12141a 0%, #1c2638 100%)",
                  color: "#ffffff",
                  borderRadius: 18,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: "rgba(183, 242, 85, 0.2)", borderRadius: "50%", padding: 4 }}>
                    <Ace decorative={false} />
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--lime, #b7f255)", textTransform: "uppercase" }}>
                      Solar Orbit Checkpoint
                    </span>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#ffffff" }}>
                      {PROTOTYPE_DAILY_RECOMMENDATION.title}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                      Tap Ember for target HR zones & guidance
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--lime, #b7f255)" }}>
                  Open ↗
                </span>
              </div>
            )}

            {/* Orbit Waypoints Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {pastSessions.map((session, idx) => (
                <div
                  key={session.id}
                  onClick={() => setInspectedSession(session)}
                  style={{
                    background: "var(--paper, #eef1f4)",
                    border: "1px solid var(--line, #dce1ea)",
                    borderRadius: 14,
                    padding: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted, #5c6578)" }}>
                      Station #{idx + 1}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>
                      ✓ LOGGED
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                    {session.volume}
                  </p>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>
                    {session.sportName} · {session.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pop-up: Workout Recommendation Sheet (Opened when clicking Ember) */}
      <WorkoutRecommendationSheet
        open={recOpen}
        recommendation={PROTOTYPE_DAILY_RECOMMENDATION}
        onClose={() => setRecOpen(false)}
      />

      {/* Past Session Detail Dialog */}
      {inspectedSession && (
        <div className="rd-modal-overlay" onClick={() => setInspectedSession(null)}>
          <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rd-modal-header">
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                  Completed Session Receipt
                </span>
                <h3 className="rd-modal-title">{inspectedSession.dayLabel} · {inspectedSession.sportName}</h3>
              </div>
              <button type="button" className="rd-modal-close-btn" onClick={() => setInspectedSession(null)}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ background: "var(--paper, #eef1f4)", padding: 12, borderRadius: 12, flex: 1 }}>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Volume</span>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{inspectedSession.volume}</p>
              </div>
              <div style={{ background: "var(--paper, #eef1f4)", padding: 12, borderRadius: 12, flex: 1 }}>
                <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Duration</span>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{inspectedSession.durationMin} min</p>
              </div>
              {inspectedSession.avgHr && (
                <div style={{ background: "var(--paper, #eef1f4)", padding: 12, borderRadius: 12, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "var(--muted, #5c6578)" }}>Avg HR</span>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{inspectedSession.avgHr} bpm</p>
                </div>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink, #12141a)", lineHeight: 1.5 }}>
              {inspectedSession.summary}
            </p>
            <button type="button" className="rd-btn-secondary" onClick={() => setInspectedSession(null)}>
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
