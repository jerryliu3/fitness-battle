"use client";

import type { ReturnSyncProgress } from "@fitness-battle/shared";

interface Props {
  progress: ReturnSyncProgress;
  onDismiss: () => void;
  onViewArena: () => void;
}

export function ReturnProgressToast({ progress, onDismiss, onViewArena }: Props) {
  return (
    <div className="rd-toast-banner" role="alert">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
            {progress.newActivitiesCount} new sessions synced (+{progress.totalAddedKm} km)
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--lime, #b7f255)" }}>
            +{progress.gainedLeoScore} Leo Score · Passed {progress.passedRivalName} in Arena!
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={onViewArena}
          style={{
            border: "none",
            background: "var(--lime, #b7f255)",
            color: "var(--ink, #12141a)",
            fontSize: 11,
            fontWeight: 800,
            padding: "5px 10px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          View Arena
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            border: "none",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
            padding: "0 4px",
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
