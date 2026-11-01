"use client";
import { GeographicCourse } from "../course/geographic-course";
import { useCompetitionCourse } from "../course/use-competition-course";
import { FieldViewSwitcher } from "../field/components/field-view-switcher";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useCompete } from "@/components/compete-context";
import { useAuth } from "@/components/auth-context";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { PortraitField } from "@/features/club/portrait-field";
import { useFieldAppearance } from "@/features/field/components/field-course";
import {
  coursePositionLeaders, competitionReplayDimension, nextCompetitionReplaySpeed, competitionReplayFrame, competitionReplayCaption, competitionReplayDate,
  indexCompetitionReplay, localCompetitionReplay, initialsFromName, fieldDefaultSpan,
  clampCourseCenter, sportById,
  type CompetitionReplay, type CompetitionReplaySelection, type CompeteState,
} from "@fitness-battle/shared";

export function CompetitionReplayButton({ state, selection, dimension = "4d", initialFlat = false, label = "Replay competition" }: {
  state: CompeteState; selection: CompetitionReplaySelection; dimension?: "2d" | "3d" | "4d"; initialFlat?: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" className="fb-btn-line competition-replay-trigger">{label}</button></Dialog.Trigger>
    {open && <Dialog.Portal><Dialog.Overlay className="competition-replay-overlay" /><Dialog.Content className="competition-replay-dialog" aria-describedby={undefined}>
      <ReplayViewer key={`${selection.sport}:${selection.track}:${selection.periodStart}`} state={state} selection={selection} initialFlat={initialFlat} initialDimension={dimension} />
    </Dialog.Content></Dialog.Portal>}
  </Dialog.Root>;
}

export function ReplayViewer({ state, selection, initialDimension, embedded = false, initialFlat = false }: { state: CompeteState; selection: CompetitionReplaySelection; initialDimension: "2d" | "3d" | "4d"; initialFlat?: boolean; embedded?: boolean }) {
  const { user, offlineMode } = useAuth();
  const { debugActive } = useCompete();
  const reduced = useReducedMotion();
  const [data, setData] = useState<CompetitionReplay | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [dimension, setDimension] = useState(() => competitionReplayDimension(selection.sport, initialDimension));
  const { course, error: courseError, retry: retryCourse } = useCompetitionCourse(selection.sport, selection.periodStart, selection.periodEnd, debugActive, dimension === "4d");
  const [center, setCenter] = useState<number | null>(null), [span, setSpan] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const [courseFlat, setCourseFlat] = useState(initialFlat);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [appearance] = useFieldAppearance(user?.id ?? "guest", selection.sport);
  // Keep a coherent ledger throughout playback even if live state refreshes.
  const localState = useRef(state);
  localState.current = state;
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setData(null); setError(""); setCursor(0); setPlaying(false); setCenter(null);
    if (!user || offlineMode || debugActive) { setData(localCompetitionReplay(localState.current, selection)); return () => controller.abort(); }
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    const query = new URLSearchParams({ sport: selection.sport, track: selection.track, start: selection.periodStart, end: selection.periodEnd });
    void fetch(`/api/compete/replay?${query}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load this competition’s replay.");
      return response.json() as Promise<CompetitionReplay>;
    }).then(next => { if (!controller.signal.aborted) setData(next); }).catch(() => { if (!cancelled) setError("Could not load this competition’s replay. Try again."); }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [user?.id, offlineMode, debugActive, selection.sport, selection.track, selection.periodStart, selection.periodEnd, attempt]);
  const index = useMemo(() => data ? indexCompetitionReplay(data, state.units) : null, [data, state.units]);
  const count = index?.replay.events.length ?? 0;
  useEffect(() => { if (embedded && index) setCursor(count); }, [index, count, embedded]);
  const cursorRef = useRef(cursor); cursorRef.current = cursor;
  useEffect(() => {
    if (!playing || !count) return;
    let raf = 0; const from = cursorRef.current, start = performance.now();
    let lastPaint = -Infinity;
    const tick = (now: number) => {
      const progress = from + (now - start) * speed / 2200;
      // Bound GeoJSON/bridge updates during playback; seeking always paints immediately.
      const paintTime = Date.now();
      if (dimension !== "4d" || paintTime - lastPaint >= 100 || progress >= count) {
        setCursor(Math.min(count, reduced ? Math.floor(progress) : progress));
        lastPaint = paintTime;
      }
      if (progress < count) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, count, reduced, dimension]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const seek = (value: number) => { setPlaying(false); setCursor(Math.max(0, Math.min(count, value))); };
  const frame = index ? competitionReplayFrame(index, cursor) : null;
  const me = frame?.rows.find(a => a.you);
  const focus = frame?.rows.find(a => a.id === selected) ?? me;
  const unit = index?.unit ?? "km";
  const viewSpan = span ?? fieldDefaultSpan(unit);
  const lanes = useMemo(() => (frame?.rows ?? []).map(row => ({ ...row, initials: initialsFromName(row.name) })), [index, cursor]);
  const view = { center: !following && center !== null ? center : clampCourseCenter(focus?.value ?? 0, viewSpan, Math.max(0, ...lanes.map(l => l.value)), unit, appearance.ground), span: viewSpan };
  const applyView = (next: typeof view) => { setFollowing(false); setCenter(next.center); setSpan(next.span); };
  const panTo = (center: number) => applyView({ ...view, center });
  const zoomTo = (span: number) => applyView({ ...view, span });
  const select = (id: string) => { const lane = lanes.find(l => l.id === id); if (lane) { setSelected(id); setFocusRequest(value => value + 1); if (following) setCenter(null); } };
  const closed = data && Date.parse(data.through) >= Date.parse(data.periodEnd);
  return <>
    {!embedded&&<header className="competition-replay-header">
      <Dialog.Close className="club-icon-button" aria-label="Close competition replay">‹</Dialog.Close>
      <div><Dialog.Title>{sportById(selection.sport).name} replay</Dialog.Title><p>{selection.track === "verified" ? "GPS Tracked" : "Open"} · {closed ? "Completed round" : "Competition so far"}</p></div>
      <button type="button" className="fb-btn-ghost" onClick={() => setAttempt(a => a + 1)} disabled={!data && !error} aria-label="Reload competition replay">Refresh</button>
    </header>}
    {!index ? <div className="competition-replay-message" role="status"><p>{error || "Loading the competition timeline…"}</p>{error && <button type="button" className="fb-btn" onClick={() => setAttempt(a => a + 1)}>Retry</button>}</div> : <>
      <div className="competition-replay-viewbar"><div style={{ display: "flex", alignItems: "center", gap: 8 }}><button type="button" className="fb-btn-line" style={{ minHeight: 44, borderRadius: 14, whiteSpace: "nowrap" }} aria-pressed={following} aria-label={`Camera: ${following ? "Follow athlete" : "Fixed"}`} onClick={() => { setCenter(following ? view.center : null); setFollowing(value => !value); if (!following) setFocusRequest(value => value + 1); }}>{following ? "Follow athlete" : "Fixed"}</button><FieldViewSwitcher value={dimension} geographic={unit !== "pts"} onChange={value => { setDimension(value); }}
        onZoomIn={dimension !== "4d" ? () => zoomTo(Math.max(unit === "pts" ? 2 : .5, view.span / 1.5)) : undefined}
        onZoomOut={dimension !== "4d" ? () => zoomTo(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5)) : undefined} /></div><span>Your place <b>{me?.place ?? "—"} / {lanes.length}</b></span></div>
      <div className="competition-replay-scene">
        {dimension === "4d" ? <GeographicCourse initialFlat={courseFlat} onFlatChange={setCourseFlat} followAthlete={following} onFollowChange={next => { setCenter(next ? null : view.center); setFollowing(next); }} course={course} error={courseError} onRetry={retryCourse} lanes={lanes} unit={unit} selectedId={selected ?? focus?.id ?? ""} focusRequest={focusRequest} onSelect={select} /> : dimension === "2d" ? <ArenaLanes clampView={following} playback onGestureStart={() => { setCenter(view.center); setFollowing(false); }} onViewChange={applyView} focusRequest={focusRequest} focusSelection={following} focusOnMount immersive lanes={lanes} appearance={appearance} view={view} unit={unit} selected={selected ?? focus?.id ?? ""} onSelect={select} onPan={panTo} onZoom={zoomTo} /> : <PortraitField onGestureStart={() => { setCenter(view.center); setFollowing(false); }} onViewChange={applyView} focusRequest={focusRequest} focusSelection={following} focusOnMount immersive selectedId={selected ?? focus?.id} lanes={lanes} view={view} unit={unit} onSelect={select} onPan={panTo} onZoom={zoomTo} />}

      </div>
      <footer className="competition-replay-controls">
        <div className="competition-replay-event"><strong>{competitionReplayCaption(index, cursor)}</strong><span>{competitionReplayDate(index, cursor)} · {Math.ceil(cursor)} / {count}</span></div>
        <div className="competition-replay-athletes" aria-label="Current positions">{coursePositionLeaders(frame?.rows ?? []).map(row => <button type="button" className="fb-btn-line" key={row.id} aria-label={`Focus ${row.name}`} aria-pressed={row.id === focus?.id} onClick={() => select(row.id)}>#{row.place} {row.you ? "You" : row.name.split(" ")[0]} · {row.value.toFixed(1)} {unit}</button>)}</div>
        <input type="range" min={0} max={Math.max(1, count)} step="any" value={cursor} disabled={!count} onChange={event => seek(Number(event.target.value))} aria-label="Competition replay timeline" aria-valuetext={`${Math.ceil(cursor)} of ${count} events. ${competitionReplayCaption(index, cursor)}`} />
        <div className="competition-replay-actions">
          {embedded && <button type="button" disabled={!count} onClick={() => { seek(0); setPlaying(true); }}>Replay this round</button>}
          <button type="button" onClick={() => seek(0)} disabled={!count || cursor === 0} aria-label="Jump to competition start">|‹</button>
          <button type="button" onClick={() => seek(Math.ceil(cursor) - 1)} disabled={!count || cursor === 0} aria-label="Previous competition event">‹</button>
          <button type="button" className="competition-replay-play" disabled={!count} onClick={() => { if (!playing && cursor >= count) setCursor(0); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => seek(Math.floor(cursor) + 1)} disabled={!count || cursor >= count} aria-label="Next competition event">›</button>
          <button type="button" onClick={() => seek(count)} disabled={!count || cursor >= count}>{closed ? "Finish" : "Latest"}</button>
          <button type="button" aria-label={`Playback speed ${speed} times`} onClick={() => setSpeed(nextCompetitionReplaySpeed)}>{speed}×</button>
        </div>
        <p>{!count ? "No counted activity in this competition yet." : "Drag the timeline to move event by event."}{data?.scope === "local" ? debugActive ? " Debug preview · local practice field." : " Local preview · your sessions and available simulated athletes." : " Workout order, based on current counted activities."}{data?.athletes.some(a => a.synthetic) && " Simulated athletes use daily steps."}</p>
      </footer>
    </>}

  </>;
}
