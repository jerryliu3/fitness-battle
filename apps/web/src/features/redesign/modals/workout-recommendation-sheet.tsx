"use client";

import type { PrototypeDailyRecommendation } from "@fitness-battle/shared";
import { Ace } from "@/features/rally/ace";

interface Props {
  open: boolean;
  recommendation: PrototypeDailyRecommendation;
  onClose: () => void;
  onStartWorkout?: () => void;
}

export function WorkoutRecommendationSheet({ open, recommendation, onClose, onStartWorkout }: Props) {
  if (!open) return null;

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36 }}>
              <Ace decorative={false} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
                Coach Ember Recommends
              </span>
              <h2 className="rd-modal-title">{recommendation.title}</h2>
            </div>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: "var(--paper, #eef1f4)", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            ⏱ {recommendation.durationMin} min
          </span>
          <span style={{ background: "var(--paper, #eef1f4)", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            📍 {recommendation.targetVolume}
          </span>
          <span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            ❤️ {recommendation.targetHrZone}
          </span>
          <span style={{ background: "#ecfdf5", color: "#065f46", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
            🔥 {recommendation.effortRating} Effort
          </span>
        </div>

        <div style={{ background: "var(--paper, #eef1f4)", padding: 14, borderRadius: 14 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
            Why This Today?
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--ink, #12141a)" }}>
            {recommendation.rationale}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--ink, #12141a)" }}>
            Session Structure
          </p>

          <div style={{ borderLeft: "3px solid #94a3b8", paddingLeft: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)" }}>WARMUP</span>
            <p style={{ margin: "2px 0 0", fontSize: 13 }}>{recommendation.structure.warmup}</p>
          </div>

          <div style={{ borderLeft: "3px solid var(--lime-deep, #7ab800)", paddingLeft: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)" }}>MAIN SET</span>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600 }}>{recommendation.structure.mainSet}</p>
          </div>

          <div style={{ borderLeft: "3px solid #94a3b8", paddingLeft: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)" }}>COOLDOWN</span>
            <p style={{ margin: "2px 0 0", fontSize: 13 }}>{recommendation.structure.cooldown}</p>
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted, #5c6578)" }}>
            COACH TIPS
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--ink, #12141a)", display: "flex", flexDirection: "column", gap: 4 }}>
            {recommendation.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="rd-btn-primary"
          onClick={() => {
            if (onStartWorkout) onStartWorkout();
            onClose();
          }}
        >
          <span>Lace Up & Log Session</span>
        </button>
      </div>
    </div>
  );
}
