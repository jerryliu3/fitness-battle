"use client";
import type { FieldTimelineState } from "./use-field-timeline";

export function FieldTimeline({ timeline: t }: { timeline: FieldTimelineState }) {
  return <div className="field-timeline" aria-label="Competition time controls">
    <div className="field-timeline-heading"><span>{t.error || (!t.ready ? "Loading timeline…" : t.label)}</span>
      {t.error ? <button type="button" onClick={t.retry}>Retry</button> : <>
        <button type="button" disabled={!t.ready || !t.count} onClick={t.toggle} aria-label={t.playing ? "Pause replay" : "Replay competition"}>{t.playing ? "Pause" : "Replay"}</button>
        <button type="button" onClick={t.changeSpeed} aria-label={`Playback speed ${t.speed} times`}>{t.speed}×</button>
      </>}
      <button type="button" onClick={t.live} disabled={!t.frame}>Latest</button>
    </div>
    <input type="range" min={0} max={Math.max(1, t.count)} step="any" value={t.cursor} disabled={!t.ready || !t.count} onChange={event => t.seek(Number(event.target.value))} aria-label="Competition timeline" aria-valuetext={`${Math.ceil(t.cursor)} of ${t.count} events. ${t.label}`} />
    {t.ready && <small>{t.count ? t.preview ? "Local preview" : "Workout timeline" : "No counted activity yet"}{t.simulated ? " · Simulated daily steps" : ""}</small>}
  </div>;
}
