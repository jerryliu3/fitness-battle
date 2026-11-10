"use client";
import { buildCompeteTimeSeriesModel, buildSleepTimeSeriesModel, competeNow, competitionTrack, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "@/ui/section";
export function PointsTimeline({ state, event, fraction, onChange }: { state: CompeteState; event: CompeteEvent; fraction: number | null; onChange(value: number | null): void }) {
  const now = competeNow(state);
  const model = event === "sleep" ? buildSleepTimeSeriesModel(state, now, { scrubFraction: fraction }) : buildCompeteTimeSeriesModel(state, event, competitionTrack(event), now, { scrubFraction: fraction });

  if (!model.historyAvailable) return <AppText role="caption" secondary>Race history is not available yet.</AppText>;
  return <div style={{ display: "grid", gap: 8 }}>
    <input type="range" aria-label="Competition timeline" aria-valuetext={model.cursorTimeLabel} min={0} max={model.nowFraction} step="any" value={model.cursorFraction} disabled={!model.nowFraction} onChange={e => { const value = Number(e.target.value); onChange(value >= model.nowFraction ? null : value); }} style={{ width: "100%", accentColor: "var(--app-chart-series)" }} />
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><AppText role="caption" secondary>{model.cursorTimeLabel}</AppText><AppText role="caption" secondary>{model.latestTimeLabel}</AppText></div>
  </div>;
}
