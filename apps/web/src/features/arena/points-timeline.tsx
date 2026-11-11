"use client";
import { useEffect, useRef, useState } from "react";
import { buildCompeteTimeSeriesModel, buildSleepTimeSeriesModel, competeNow, competitionTrack, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "@/ui/section";

export function PointsTimeline({ state, event, fraction, onChange }: { state: CompeteState; event: CompeteEvent; fraction: number | null; onChange(value: number | null): void }) {
  const now = competeNow(state);
  const model = event === "sleep" ? buildSleepTimeSeriesModel(state, now, { scrubFraction: fraction }) : buildCompeteTimeSeriesModel(state, event, competitionTrack(event), now, { scrubFraction: fraction });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  const fractionRef = useRef(fraction); fractionRef.current = fraction;
  const nowFractionRef = useRef(model.nowFraction); nowFractionRef.current = model.nowFraction;
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;

  useEffect(() => {
    if (!playing || model.nowFraction <= 0) return;
    let raf = 0;
    const start = Date.now();
    const startFraction = fractionRef.current ?? 0;
    const totalDurationMs = 8000 / speed;
    let lastPaint = -Infinity;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = startFraction + (elapsed / totalDurationMs) * nowFractionRef.current;
      const nowMs = Date.now();
      if (nowMs - lastPaint >= 60 || progress >= nowFractionRef.current) {
        lastPaint = nowMs;
        if (progress >= nowFractionRef.current) {
          onChangeRef.current(null);
          setPlaying(false);
          return;
        }
        onChangeRef.current(progress);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, model.nowFraction]);

  if (!model.historyAvailable) return <AppText role="caption" secondary>Race history is not available yet.</AppText>;

  const toggle = () => {
    if (!playing && (fraction === null || (model.nowFraction > 0 && model.cursorFraction >= model.nowFraction - 1e-4))) {
      onChange(0);
    }
    setPlaying(p => !p);
  };

  return <div style={{ display: "grid", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={toggle} disabled={!model.nowFraction} aria-label={playing ? "Pause replay" : "Play replay"} style={{ minHeight: 32, padding: "4px 12px", borderRadius: 999, border: "1px solid var(--app-border-line)", background: "var(--app-canvas-card)", cursor: "pointer" }}>
        <AppText role="label">{playing ? "Pause" : "Play"}</AppText>
      </button>
      <input type="range" aria-label="Competition timeline" aria-valuetext={model.cursorTimeLabel} min={0} max={model.nowFraction} step="any" value={model.cursorFraction} disabled={!model.nowFraction} onChange={e => { const value = Number(e.target.value); setPlaying(false); onChange(value >= model.nowFraction ? null : value); }} style={{ flex: 1, accentColor: "var(--app-chart-series)" }} />
      <button type="button" onClick={() => setSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)} aria-label={`Playback speed ${speed} times`} style={{ minHeight: 32, padding: "4px 8px", borderRadius: 999, border: "1px solid var(--app-border-line)", background: "var(--app-canvas-card)", cursor: "pointer" }}>
        <AppText role="label">{speed}×</AppText>
      </button>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><AppText role="caption" secondary>{model.cursorTimeLabel}</AppText><AppText role="caption" secondary>{model.latestTimeLabel}</AppText></div>
  </div>;
}
