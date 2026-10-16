"use client";

import { useState } from "react";
import type { GlobalRecordRank } from "@fitness-battle/shared";
import { PROTOTYPE_GLOBAL_RECORDS } from "@fitness-battle/shared";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AllTimeRankingsModal({ open, onClose }: Props) {
  const [category, setCategory] = useState<"5k" | "10k">("5k");

  if (!open) return null;

  const records = PROTOTYPE_GLOBAL_RECORDS.filter((r) => r.category === category);

  return (
    <div className="rd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime-deep, #7ab800)", textTransform: "uppercase" }}>
              All-Time Global Standings
            </span>
            <h2 className="rd-modal-title">OpenTrack Pace Leaderboard</h2>
          </div>
          <button type="button" className="rd-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 8, background: "var(--paper, #eef1f4)", padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            onClick={() => setCategory("5k")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: category === "5k" ? "var(--card, #ffffff)" : "transparent",
              color: category === "5k" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            ⚡ 5K Benchmark
          </button>
          <button
            type="button"
            onClick={() => setCategory("10k")}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: category === "10k" ? "var(--card, #ffffff)" : "transparent",
              color: category === "10k" ? "var(--ink, #12141a)" : "var(--muted, #5c6578)",
            }}
          >
            🏔 10K Benchmark
          </button>
        </div>

        {/* Rankings Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {records.map((rec) => (
            <div
              key={`${rec.category}-${rec.rank}-${rec.athleteName}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 12,
                background: rec.isYou ? "#f6fee7" : "var(--card, #ffffff)",
                border: rec.isYou ? "1px solid var(--lime, #b7f255)" : "1px solid var(--line, #dce1ea)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    width: 28,
                    textAlign: "center",
                    color: rec.rank <= 3 ? "#f59e0b" : "var(--muted, #5c6578)",
                  }}
                >
                  #{rec.rank}
                </span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ink, #12141a)" }}>
                    {rec.athleteName} <span style={{ fontSize: 10, color: "var(--muted, #5c6578)" }}>({rec.country})</span>
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted, #5c6578)" }}>
                    {rec.avgPace} · {rec.date}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink, #12141a)" }}>
                  {rec.finishTime}
                </span>
                <div style={{ fontSize: 10, color: "var(--lime-deep, #7ab800)", fontWeight: 700 }}>
                  GPS Verified
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="rd-btn-secondary" onClick={onClose}>
          Close Global Rankings
        </button>
      </div>
    </div>
  );
}
