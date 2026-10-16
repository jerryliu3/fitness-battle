"use client";

import type { GhostComparison } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  ghost: GhostComparison;
  onClose: () => void;
}

export function GhostTelemetryModal({ open, ghost, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>👻</span>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                Ghost Self Comparator
              </span>
              <h2 className="rd-modal-title">{ghost.ghostName}</h2>
            </div>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Delta Callout */}
        <div style={{ background: "linear-gradient(135deg, #12141a 0%, #202738 100%)", color: "#ffffff", padding: 16, borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                Live Delta
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: "var(--lime, #b7f255)" }}>
                {ghost.ahead ? `+${ghost.deltaKm} km Ahead` : `-${ghost.deltaKm} km Behind`}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                Pace Delta
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: "#ffffff" }}>
                5:08/km vs {ghost.pace}
              </p>
            </div>
          </div>
        </div>

        {/* Checkpoint Telemetry Breakdown */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--ink, #12141a)", textTransform: "uppercase" }}>
            Cutoff Telemetry Splitting
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ghost.telemetry.map((item, idx) => {
              const diff = (item.youKm - item.ghostKm).toFixed(1);
              const isLead = item.youKm >= item.ghostKm;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--paper, #eef1f4)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                    {item.checkpoint}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12 }}>
                      <b>{item.youKm} km</b> <span style={{ color: "var(--muted, #5c6578)" }}>vs {item.ghostKm} km</span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: isLead ? "var(--lime-deep, #7ab800)" : "#dc2626",
                      }}
                    >
                      {isLead ? `+${diff}` : diff} km
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button" className="rd-btn-secondary" onClick={onClose}>
          Close Comparison
        </button>
      </div>
    </div>
  );
}
