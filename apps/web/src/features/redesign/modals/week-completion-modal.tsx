"use client";

import type { WeekCompletionPodium } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  completion: WeekCompletionPodium;
  onClose: () => void;
}

export function WeekCompletionModal({ open, completion, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div style={{ margin: "10px auto 0", fontSize: 48 }}>
          🥈
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
            {completion.weekLabel}
          </span>
          <h2 className="rd-modal-title" style={{ fontSize: 22, marginTop: 4 }}>
            Week Settled: Podium Finish!
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #5c6578)" }}>
            You placed <b>#{completion.place}</b> out of {completion.fieldSize} contenders in Division 2
          </p>
        </div>

        {/* Podium Highlight Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, background: "var(--paper, #eef1f4)", padding: 12, borderRadius: 14 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              Total Effort
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "var(--ink, #12141a)" }}>
              {completion.effortKm} km
            </p>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              Leo Delta
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "var(--lime-deep, #7ab800)" }}>
              +{completion.leoDelta} Elo
            </p>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted, #5c6578)", textTransform: "uppercase" }}>
              Placement
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "var(--ink, #12141a)" }}>
              {completion.place} / {completion.fieldSize}
            </p>
          </div>
        </div>

        {/* Award Unlocked */}
        <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: 12, borderRadius: 12, textAlign: "left" }}>
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 800, color: "#854d0e" }}>
            🏆 Award Unlocked: {completion.badgeAwarded}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#a16207" }}>
            Vanquished rival {completion.rivalDefeated}. Added to your Athlete Trophy Cabinet.
          </p>
        </div>

        <button type="button" className="rd-btn-primary" onClick={onClose}>
          <span>Claim Award & Enter New Week</span>
        </button>
      </div>
    </div>
  );
}
