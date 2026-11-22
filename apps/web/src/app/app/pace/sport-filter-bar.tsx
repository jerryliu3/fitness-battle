"use client";

import type { ReactNode } from "react";
import { RACE_CATEGORY_FILTERS, RACE_DISTANCES, type RaceSplitAnalysis } from "@fitness-battle/shared";
import { OvtPillSelect } from "./ovt-pill-select";

export type SportId = "running" | "ironman" | "hyrox" | "cycling";

export const SPORTS: Array<{ id: SportId; label: string; formats: Array<{ value: string; label: string }> }> = [
  { id: "running", label: "Running", formats: [...RACE_DISTANCES].reverse().map(d => ({ value: d.slug, label: d.label })) },
  {
    id: "ironman",
    label: "Ironman",
    formats: [
      { value: "full-140-6", label: "Full 140.6" },
      { value: "half-70-3", label: "70.3 Half" },
    ],
  },
  {
    id: "hyrox",
    label: "Hyrox",
    formats: [
      { value: "open", label: "Open" },
      { value: "pro", label: "Pro" },
      { value: "doubles", label: "Doubles" },
    ],
  },
  {
    id: "cycling",
    label: "Cycling",
    formats: [
      { value: "gran-fondo", label: "Gran Fondo" },
      { value: "100k", label: "100K" },
      { value: "tt", label: "Time Trial" },
    ],
  },
];

export function computeSplitMetrics(analysis: Extract<RaceSplitAnalysis, { status: "ready" }>, finishMs: number) {
  let pct: number | null = null;
  if (analysis.halfDeltaMs !== null && finishMs > 0) {
    const firstHalfMs = (finishMs - analysis.halfDeltaMs) / 2;
    if (firstHalfMs > 0) pct = (analysis.halfDeltaMs / firstHalfMs) * 100;
  } else {
    const validPaces = analysis.rows
      .map(r => r.paceMsPerKm)
      .filter((p): p is number => p !== null && Number.isFinite(p) && p > 0);
    if (validPaces.length >= 2) {
      const mid = Math.floor(validPaces.length / 2);
      const firstAvg = validPaces.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
      const secondAvg = validPaces.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, validPaces.length - mid);
      if (firstAvg > 0) pct = ((secondAvg - firstAvg) / firstAvg) * 100;
    }
  }

  if (pct === null || !Number.isFinite(pct)) {
    return { stroke: "#C88A00", badge: null as string | null, tone: "even" as const };
  }
  if (pct < -0.15) {
    return { stroke: "#16a34a", badge: `${pct.toFixed(1)}%`, tone: "negative" as const };
  }
  if (pct > 0.15) {
    return { stroke: "#dc2626", badge: `+${pct.toFixed(1)}%`, tone: "positive" as const };
  }
  return { stroke: "#C88A00", badge: "0.0%", tone: "even" as const };
}

export function SportFilterBar({
  sport,
  onSportChange,
  format,
  onFormatChange,
  sex,
  onSexChange,
  rightSlot,
  extraRow2,
  className = "",
}: {
  sport: SportId;
  onSportChange: (next: SportId) => void;
  format: string;
  onFormatChange: (next: string) => void;
  sex: string;
  onSexChange: (next: string) => void;
  rightSlot?: ReactNode;
  extraRow2?: ReactNode;
  className?: string;
}) {
  const activeSport = SPORTS.find(s => s.id === sport) ?? SPORTS[0];
  const categoryOptions = RACE_CATEGORY_FILTERS.filter(c => c.value !== "unknown" || sex === "unknown").map(c => ({
    value: c.value,
    label: c.value === "other" ? "Non-binary" : c.label,
  }));

  return (
    <div className={`ovt-chart-head ${className}`}>
      <div className="ovt-chart-head-row">
        <div className="ovt-chart-head-left">
          <div className="ovt-seg" role="tablist" aria-label="Sport">
            {SPORTS.map(s => {
              const active = s.id === sport;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "on" : ""}
                  onClick={() => onSportChange(s.id)}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        {rightSlot && <div className="ovt-chart-head-right">{rightSlot}</div>}
      </div>

      <div className="ovt-chart-head-row">
        <div className="ovt-chart-head-left">
          <div className="ovt-chip-group" role="tablist" aria-label={`${activeSport.label} distance or format`}>
            {activeSport.formats.map(f => {
              const active = f.value === format;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`ovt-filter-chip ${active ? "active" : ""}`}
                  onClick={() => onFormatChange(f.value)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <OvtPillSelect
            ariaLabel="Athlete category"
            value={sex}
            highlighted={sex !== "all"}
            options={categoryOptions}
            onChange={onSexChange}
          />

          {extraRow2}
        </div>
      </div>
    </div>
  );
}
