"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useAuth } from "@/components/auth-context";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { PortraitField } from "@/features/club/portrait-field";
import { useFieldAppearance } from "@/features/field/components/field-course";
import {
  competitionReplayFrame, competitionReplayCaption, competitionReplayDate,
  indexCompetitionReplay, localCompetitionReplay, initialsFromName, fieldDefaultSpan,
  clampCourseCenter, sportById,
  type CompetitionReplay, type CompetitionReplaySelection, type CompeteState,
} from "@fitness-battle/shared";

export function CompetitionReplayButton({ state, selection, dimension = "2d", label = "Replay competition" }: {
  state: CompeteState; selection: CompetitionReplaySelection; dimension?: "2d" | "3d"; label?: string;
}) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" className="fb-btn-line competition-replay-trigger">{label}</button></Dialog.Trigger>
    {open && <Dialog.Portal><Dialog.Overlay className="competition-replay-overlay" /><Dialog.Content className="competition-replay-dialog" aria-describedby={undefined}>
      <ReplayViewer key={`${selection.sport}:${selection.track}:${selection.periodStart}`} state={state} selection={selection} initialDimension={dimension} />
    </Dialog.Content></Dialog.Portal>}
  </Dialog.Root>;
}

function ReplayViewer({ state, selection, initialDimension }: { state: CompeteState; selection: CompetitionReplaySelection; initialDimension: "2d" | "3d" }) {
  const { user, offlineMode } = useAuth();
  const reduced = useReducedMotion();
  const [data, setData] = useState<CompetitionReplay | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [dimension, setDimension] = useState(initialDimension);
  const [center, setCenter] = useState<number | null>(null), [span, setSpan] = useState<number | null>(null);
  const [followEvent, setFollowEvent] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [appearance] = useFieldAppearance(user?.id ?? "guest", selection.sport);
  // Keep a coherent ledger throughout playback even if live state refreshes.
  const localState = useRef(state);
  localState.current = state;
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setData(null); setError(""); setCursor(0); setPlaying(false); setCenter(null);
    if (!user || offlineMode) { setData(localCompetitionReplay(localState.current, selection)); return () => controller.abort(); }
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    const query = new URLSearchParams({ sport: selection.sport, track: selection.track, start: selection.periodStart, end: selection.periodEnd });
    void fetch(`/api/compete/replay?${query}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load this competition’s replay.");
      return response.json() as Promise<CompetitionReplay>;
    }).then(next => { if (!controller.signal.aborted) setData(next); }).catch(() => { if (!cancelled) setError("Could not load this competition’s replay. Try again."); }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [user?.id, offlineMode, selection.sport, selection.track, selection.periodStart, selection.periodEnd, attempt]);
  const index = useMemo(() => data ? indexCompetitionReplay(data, state.units) : null, [data, state.units]);
  const count = index?.replay.events.length ?? 0;
  const cursorRef = useRef(cursor); cursorRef.current = cursor;
  useEffect(() => {
    if (!playing || !count) return;
    let raf = 0; const from = cursorRef.current, start = performance.now();
    const tick = (now: number) => {
      const progress = from + (now - start) * speed / 1100;
      setCursor(Math.min(count, reduced ? Math.floor(progress) : progress));
      if (progress < count) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, count, reduced]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const seek = (value: number) => { setPlaying(false); setCursor(Math.max(0, Math.min(count, value))); };
  const frame = index ? competitionReplayFrame(index, cursor) : null;
  const me = frame?.rows.find(a => a.you);
  const focus = followEvent ? frame?.rows.find(a => a.id === frame.event?.athleteId) ?? me : me;
  const unit = index?.unit ?? "km";
  const viewSpan = span ?? fieldDefaultSpan(unit);
  const lanes = useMemo(() => (frame?.rows ?? []).map(row => ({ ...row, initials: initialsFromName(row.name) })), [index, cursor]);
  const view = { center: clampCourseCenter(center ?? focus?.value ?? 0, viewSpan, Math.max(0, ...lanes.map(l => l.value)), unit, appearance.ground), span: viewSpan };
  const select = (id: string) => { const lane = lanes.find(l => l.id === id); if (lane) { setSelected(id); setCenter(lane.value); } };
  const closed = data && Date.parse(data.through) >= Date.parse(data.periodEnd);
  return <>
    <header className="competition-replay-header">
      <Dialog.Close className="club-icon-button" aria-label="Close competition replay">‹</Dialog.Close>
      <div><Dialog.Title>{sportById(selection.sport).name} replay</Dialog.Title><p>{selection.track === "verified" ? "GPS Tracked" : "Open"} · {closed ? "Completed round" : "Competition so far"}</p></div>
      <button type="button" className="fb-btn-ghost" onClick={() => setAttempt(a => a + 1)} disabled={!data && !error} aria-label="Reload competition replay">Refresh</button>
    </header>
    {!index ? <div className="competition-replay-message" role="status"><p>{error || "Loading the competition timeline…"}</p>{error && <button type="button" className="fb-btn" onClick={() => setAttempt(a => a + 1)}>Retry</button>}</div> : <>
      <div className="competition-replay-viewbar"><div className="focus-segments" role="group" aria-label="Replay field dimension">{(["2d", "3d"] as const).map(d => <button type="button" key={d} aria-pressed={dimension === d} className={dimension === d ? "is-active" : ""} onClick={() => setDimension(d)}>{d === "2d" ? "2D map" : "3D field"}</button>)}</div><span>Your place <b>{me?.place ?? "—"} / {lanes.length}</b></span></div>
      <div className="competition-replay-scene">
        {dimension === "2d" ? <ArenaLanes focusOnMount immersive lanes={lanes} appearance={appearance} view={view} unit={unit} selected={selected ?? focus?.id ?? ""} onSelect={select} onPan={setCenter} /> : <PortraitField focusOnMount immersive selectedId={selected ?? focus?.id} lanes={lanes} view={view} unit={unit} onSelect={select} onPan={setCenter} onZoom={setSpan} />}
        <button type="button" className="competition-replay-follow fb-btn-line" onClick={() => { setCenter(null); setSelected(null); setFollowEvent(v => !v); }}>{followEvent ? "Follow me" : "Follow event"}</button>
      </div>
      <footer className="competition-replay-controls">
        <div className="competition-replay-event"><strong>{competitionReplayCaption(index, cursor)}</strong><span>{competitionReplayDate(index, cursor)} · {Math.ceil(cursor)} / {count}</span></div>
        <input type="range" min={0} max={Math.max(1, count)} step="any" value={cursor} disabled={!count} onChange={event => seek(Number(event.target.value))} aria-label="Competition replay timeline" aria-valuetext={`${Math.ceil(cursor)} of ${count} events. ${competitionReplayCaption(index, cursor)}`} />
        <div className="competition-replay-actions">
          <button type="button" onClick={() => seek(0)} disabled={!count || cursor === 0} aria-label="Jump to competition start">|‹</button>
          <button type="button" onClick={() => seek(Math.ceil(cursor) - 1)} disabled={!count || cursor === 0} aria-label="Previous competition event">‹</button>
          <button type="button" className="competition-replay-play" disabled={!count} onClick={() => { if (!playing && cursor >= count) setCursor(0); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => seek(Math.floor(cursor) + 1)} disabled={!count || cursor >= count} aria-label="Next competition event">›</button>
          <button type="button" onClick={() => seek(count)} disabled={!count || cursor >= count}>{closed ? "Finish" : "Latest"}</button>
          <button type="button" aria-label={`Playback speed ${speed} times`} onClick={() => setSpeed(s => s === 4 ? 1 : s * 2)}>{speed}×</button>
        </div>
        <p>{!count ? "No counted activity in this competition yet." : "Drag the timeline to move event by event."}{data?.scope === "local" ? " Local preview · your sessions and available simulated athletes." : " Workout order, based on current counted activities."}{data?.athletes.some(a => a.synthetic) && " Simulated athletes use daily steps."}</p>
      </footer>
    </>}
  </>;
}
