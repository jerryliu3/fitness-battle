"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clampArenaLaneCenter, orderedArenaLanes, type ArenaViewWindow } from "@fitness-battle/shared";
import { OvalTrack } from "./oval-track";
import { Board2D } from "./board-2d";
import { PersistentField } from "./persistent-field";
import { boardFixture } from "./fixtures";
import { boardGap, defaultBoardView, fitBoardView, overviewWindow, type BoardSession } from "./model";
import { trailMaterials, isTrailMaterialId, type TrailMaterialId } from "./trail-materials";
import { backgrounds, progressTreatments, zoomTreatments, isBackgroundId, isProgressId, isZoomId, type BackgroundId, type ProgressId, type ZoomId, trackEdges, isTrackEdgeId, type TrackEdgeId, wakeTreatments, isWakeId, type WakeId } from "./field-directions";
import "./board-lab.css";

const Horizon = dynamic(() => import("./horizon").then(m => m.Horizon), { ssr: false, loading: () => <div className="bl-world-loading">Preparing the field…</div> });
const fixture = boardFixture(false, "km");
function subscribeReducedMotion(update: () => void) { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }
const reducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function DesignControls({ background, progress, zoom, material, onBackground, onProgress, onZoom, onMaterial }: {
  background: BackgroundId; progress: ProgressId; zoom: ZoomId; material: TrailMaterialId;
  onBackground: (v: BackgroundId) => void; onProgress: (v: ProgressId) => void; onZoom: (v: ZoomId) => void; onMaterial: (v: TrailMaterialId) => void;
}) {
  return <div className="bl-inline-design-controls" aria-label="Field design controls">
    <label>Background<select aria-label="Background" value={background} onChange={e => onBackground(e.target.value as BackgroundId)}>{Object.entries(backgrounds).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}</select></label>
    <label>Progress<select aria-label="Progress" value={progress} onChange={e => onProgress(e.target.value as ProgressId)}>{Object.entries(progressTreatments).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></label>
    <label>Material<select aria-label="Material" value={material} onChange={e => onMaterial(e.target.value as TrailMaterialId)}>{Object.entries(trailMaterials).map(([id, m]) => <option key={id} value={id}>{m.name}</option>)}</select></label>
    <label>Zoom lens<select aria-label="Zoom lens" value={zoom} onChange={e => onZoom(e.target.value as ZoomId)}>{Object.entries(zoomTreatments).map(([id, z]) => <option key={id} value={id}>{z.name}</option>)}</select></label>
  </div>;
}

export function BoardLab() {
  const [mode, setMode] = useState<"field" | "horizon">("field");
  const [background, setBackground] = useState<BackgroundId>("trail");
  const [progressStyle, setProgressStyle] = useState<ProgressId>("deposit");
  const [wakeStyle, setWakeStyle] = useState<WakeId>("blend");
  const [material, setMaterial] = useState<TrailMaterialId>("enamel");
  const [loopUnit, setLoopUnit] = useState<"km" | "mi">("km");
  const [edges, setEdges] = useState<TrackEdgeId>("club");
  const [zoomStyle, setZoomStyle] = useState<ZoomId>("map");
  const [expanded, setExpanded] = useState(false), [selected, setSelected] = useState("you");
  const [session, setSession] = useState<BoardSession | null>(null);
  const [progress, setProgress] = useState(0), [playing, setPlaying] = useState(false);
  const [camera, setCamera] = useState<ArenaViewWindow | null>(null);
  const [showGhost, setShowGhost] = useState(true), [above, setAbove] = useState(false);
  const [unavailable, setUnavailable] = useState(false), [initialized, setInitialized] = useState(false), [notice, setNotice] = useState("");
  const frame = useRef(0), cameraFrame = useRef(0);
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => true);
  const baseYou = fixture.lanes.find(l => l.you)!, total = baseYou.value + fixture.gain * progress;
  const lanes = fixture.lanes.map(l => l.you ? { ...l, value: total } : l);
  const sessions = progress > 0 ? [...fixture.sessions, { id: "preview-session", athleteId: baseYou.id, title: "A little further", recordedAt: "2026-10-20T20:00:00Z", start: baseYou.value, end: total }] : fixture.sessions;
  const view = camera ?? defaultBoardView(total, "km");
  const person = lanes.find(l => l.id === selected) ?? lanes.find(l => l.you)!;
  const nearest = lanes.filter(l => !l.you && !l.ghost).sort((a, b) => Math.abs(a.value - total) - Math.abs(b.value - total))[0]!;
  const fieldHigh = Math.max(1, ...lanes.filter(l => !l.ghost).map(l => l.value)), ordered = orderedArenaLanes(lanes);
  const overview = overviewWindow(view, fieldHigh);
  const title = mode === "horizon" ? "Horizon Pursuit" : backgrounds[background].name;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("concept") === "horizon") setMode("horizon");
    const bg = q.get("background"), pr = q.get("progress"), zm = q.get("zoom"), edge = q.get("edges");
    const wake = q.get("wake"); if (isWakeId(wake)) setWakeStyle(wake);
    const finish = q.get("material"); if (isTrailMaterialId(finish)) setMaterial(finish);
    if (q.get("loop") === "mi") setLoopUnit("mi");
    if (isTrackEdgeId(edge)) setEdges(edge);
    if (isBackgroundId(bg)) setBackground(bg); if (isProgressId(pr)) setProgressStyle(pr); if (isZoomId(zm)) setZoomStyle(zm);
    setInitialized(true);
    return () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(cameraFrame.current); };
  }, []);
  useEffect(() => {
    if (!initialized) return;
    const q = new URLSearchParams({ concept: mode, background, progress: progressStyle, zoom: zoomStyle, edges, loop: loopUnit, wake: wakeStyle, material });
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, [mode, background, progressStyle, zoomStyle, edges, loopUnit, wakeStyle, material, initialized]);
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setProgress(1); setPlaying(false); setNotice("Preview added 2.2 km."); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 2400); setProgress(p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
      if (p < 1) frame.current = requestAnimationFrame(tick); else { setPlaying(false); setNotice("Preview added 2.2 km. Your effort stays on the field."); }
    };
    frame.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame.current);
  }, [playing, reduced]);

  function stop() { cancelAnimationFrame(frame.current); cancelAnimationFrame(cameraFrame.current); setPlaying(false); }
  function reset() { stop(); setProgress(0); setCamera(null); setSession(null); setNotice(""); }
  function pan(center: number) { stop(); setCamera({ center: clampArenaLaneCenter(center, view.span), span: view.span }); }
  function moveView(next: ArenaViewWindow, follow = false) {
    stop(); const target = { ...next, center: clampArenaLaneCenter(next.center, next.span) };
    if (reduced) { setCamera(follow ? null : target); return; }
    const from = view, start = performance.now();
    const tick = (now: number) => {
      if (reducedMotionSnapshot()) { setCamera(follow ? null : target); return; }
      const t = Math.min(1, (now - start) / 380), ease = 1 - (1 - t) ** 3;
      setCamera({ center: from.center + (target.center - from.center) * ease, span: from.span + (target.span - from.span) * ease });
      if (t < 1) cameraFrame.current = requestAnimationFrame(tick); else if (follow) setCamera(null);
    };
    cameraFrame.current = requestAnimationFrame(tick);
  }
  function zoom(multiplier: number) { const span = Math.max(2, Math.min(120, view.span * multiplier)); moveView({ center: clampArenaLaneCenter(view.center, span), span }); }
  function select(id: string) { setSelected(id); setSession(null); }
  function chooseBackground(next: BackgroundId) { stop(); setBackground(next); if (next === "oval" || background === "oval") setCamera(null); }
  const isClubTrack = background === "straight" || background === "oval";
  const isOval = background === "oval" && zoomStyle !== "distance";
  const FieldRenderer = isOval ? OvalTrack : Board2D;
  const controls = { background, progress: progressStyle, zoom: zoomStyle, material, onBackground: chooseBackground, onProgress: setProgressStyle, onZoom: setZoomStyle, onMaterial: setMaterial };

  return <main className="board-lab">
    <div className="bl-review-bar"><Link href="/design">← Design studies</Link><span>COMPETE / FIELD STUDY · ROUND 6</span><span className="bl-study-tag">Vertical · kilometers</span></div>
    <header className="bl-intro"><div><p className="bl-eyebrow">A field with room to move</p><h1>Find your ground.<br/>Leave your trace.</h1></div><p>Three trails. Five distinct finishes. Solid color, crisp edges and a little more personality, still directly beneath your afterimages.</p></header>
    <nav className="bl-mode-tabs" aria-label="Field view"><button type="button" aria-pressed={mode === "field"} onClick={() => setMode("field")}><strong>2D Track lab</strong><span>{Object.keys(backgrounds).length} fields · {Object.keys(progressTreatments).length} progress treatments</span></button><button type="button" aria-pressed={mode === "horizon"} onClick={() => { setMode("horizon"); setUnavailable(false); }}><strong>3D Horizon</strong><span>The scenic distance course</span></button></nav>
    <div className="bl-round-note"><span>Same athletes. Same distance. Independent design choices.</span><span>Fictional athletes & sessions</span></div>
    <div className="bl-workspace">
      <section className="bl-app" aria-label={`${title} product preview`}>
        <header className="bl-app-header"><span className="bl-brand">overtaek</span><span className="bl-profile">JL</span></header>
        <div className="bl-week-heading"><div><p className="bl-eyebrow">Running / Your weekly field</p><h2>Your week, taking shape.</h2></div><span className="bl-week-chip">19–26 Oct · ET</span></div>
        <div className="bl-score"><div><strong data-testid="board-total">{total.toFixed(1)}<small>km</small></strong><span>Your counted distance</span></div><div className="bl-nearest"><span>In good company</span><strong>{nearest.name.split(" ")[0]}</strong><small>{boardGap(nearest.value, total, "km")}</small></div></div>
        <PersistentField expanded={expanded} onClose={() => setExpanded(false)}>
          <section className={`bl-field-shell ${expanded ? "is-expanded" : ""}`} data-concept={mode}>
            <div className="bl-field-top"><div><span className="bl-field-title">{title}</span><span className="bl-field-mode">{mode === "horizon" ? "3D / GPS distance" : `${progressTreatments[progressStyle].name} · ${trailMaterials[material].name}`}</span></div><button type="button" className="bl-icon-button" onClick={() => setExpanded(v => !v)} aria-label={expanded ? "Close expanded field" : "Expand field"} aria-expanded={expanded}>{expanded ? "↙ Close" : "↗ Expand"}</button></div>
            {(mode === "field" || unavailable) && <DesignControls {...controls}/>}
            {(mode === "field" || unavailable) && <div className="bl-track-options bl-wake-options" aria-label="Trail and afterimages"><span>Trail / afterimages</span>{Object.entries(wakeTreatments).map(([key, option]) => <button type="button" key={key} aria-pressed={wakeStyle === key} title={option.description} onClick={() => setWakeStyle(key as WakeId)}>{option.name}</button>)}</div>}
            {(mode === "field" || unavailable) && isClubTrack && <div className="bl-track-options" aria-label="Track surroundings"><span>Trackside</span>{background === "straight" && <button type="button" onClick={() => moveView({ center: 2, span: 6 })}>Start line</button>}{Object.entries(trackEdges).map(([key, option]) => <button type="button" key={key} aria-pressed={edges === key} onClick={() => setEdges(key as TrackEdgeId)}>{option.name}</button>)}</div>}
            {(mode === "field" || unavailable) && background === "oval" && <div className="bl-track-options"><label>Loop length <select aria-label="Loop length" value={loopUnit} onChange={e => setLoopUnit(e.target.value as "km" | "mi")}><option value="km">1 kilometer</option><option value="mi">1 mile</option></select></label><span>Totals stay in kilometers</span></div>}
            {(mode === "field" || unavailable) && background === "oval" && <p className="bl-circuit-caption">{isOval ? `1 ${loopUnit} per loop · compare total distance and completed laps. Each lane uses the same normalized circuit.` : "Distance lens unfolds the oval into continuous kilometer lanes."}</p>}
            <div className="bl-scene" data-testid="board-scene">
              {mode === "horizon" && !unavailable ? <Horizon lanes={lanes} view={view} unit="km" selected={selected} showGhost={showGhost} above={above} onSelect={select} onUnavailable={() => setUnavailable(true)}/>
                : <FieldRenderer material={material} wake={wakeStyle} loopUnit={loopUnit} edges={edges} lanes={lanes} sessions={sessions} background={background === "oval" && !isOval ? "straight" : background} progress={progressStyle} zoom={zoomStyle} view={view} selected={selected} showGhost={showGhost} expanded={expanded} onSelect={select} onSession={s => { stop(); setSession(s); }} onPan={pan}/>}
            </div>
            <div className="bl-field-tools"><div className="bl-tool-group"><button type="button" aria-label="Explore earlier distance" onClick={() => moveView({ ...view, center: view.center - view.span / 3 })}>↓</button><button type="button" onClick={() => moveView(defaultBoardView(total, "km"), true)}>Center me</button><button type="button" aria-label="Explore further distance" onClick={() => moveView({ ...view, center: view.center + view.span / 3 })}>↑</button></div><div className="bl-tool-group"><button type="button" aria-label="Zoom in" onClick={() => zoom(.7)}>＋</button><button type="button" aria-label="Zoom out" onClick={() => zoom(1.4)}>−</button><button type="button" onClick={() => { if (mode === "horizon") setAbove(true); moveView(mode === "field" && isOval ? defaultBoardView(total, "km") : fitBoardView(lanes, "km")); }}>Fit field</button></div></div>
            <div className="bl-overview" aria-label={`Distance from zero to ${fieldHigh.toFixed(1)} km`}><span>0</span><div className="bl-overview-track"><span className="bl-overview-window" style={{ left: `${overview.left}%`, width: `${overview.width}%` }}/>{lanes.filter(l => !l.ghost).map(l => <i key={l.id} className={l.you ? "is-you" : ""} style={{ left: `${l.value / fieldHigh * 100}%` }}/>)}</div><span>{fieldHigh.toFixed(1)} km</span></div>
            {unavailable && mode === "horizon" && <p className="bl-fallback" role="status">3D is unavailable here. The same field is shown in 2D.</p>}
            <div className="bl-field-selection" aria-label="Selected athlete or counted session"><span className={`bl-mini-capsule ${person.you ? "is-you" : ""}`}/><div><strong>{session ? session.title : person.you ? "Your week, taking shape" : person.name}</strong><span>{session ? `${(session.end - session.start).toFixed(1)} km · counted session` : person.you ? `${(total - (lanes.find(l => l.ghost)?.value ?? total)).toFixed(1)} km ahead of past you · same cutoff` : boardGap(person.value, total, "km")}</span></div><strong>{(session ? session.end - session.start : person.value).toFixed(1)}<small>km</small></strong></div>
          </section>
        </PersistentField>
        <div className="bl-return"><span className="bl-return-symbol">↗</span><div><strong>{progress >= 1 ? "That effort is part of your week." : "Make room for a little more."}</strong><p>{progress > 0 ? `+${(fixture.gain * progress).toFixed(1)} km in this preview.` : "Preview a counted session and watch the ground move."}</p></div><button type="button" disabled={playing} onClick={() => { if (progress > 0) reset(); else { stop(); setCamera(null); setNotice(""); setPlaying(true); } }}>{playing ? "Adding…" : progress > 0 ? "Reset" : "Preview +2.2"}</button></div>
        <p className="bl-sr-only" role="status">{notice}</p>
        <nav className="bl-app-nav" aria-label="Product context"><span>⌂<small>Home</small></span><span className="is-current">Ⅱ<small>Compete</small></span><span>♧<small>Crew</small></span><span>◉<small>Athlete</small></span></nav>
      </section>
      <aside className="bl-sidebar">
        {mode === "field" ? <>
          <div className="bl-side-heading"><p className="bl-eyebrow">Independent choices</p><h3>Make the field yours.</h3></div>
          <fieldset className="bl-desktop-design"><legend>01 / The ground</legend><div className="bl-background-catalog">{Object.entries(backgrounds).map(([key, b]) => <button type="button" key={key} aria-pressed={background === key} onClick={() => chooseBackground(key as BackgroundId)}><span className="bl-surface-swatch" data-surface={key}/><strong>{b.name}</strong><small>{b.short}</small></button>)}</div></fieldset>
          <p className="bl-choice-description">{backgrounds[background].description}</p>
          <fieldset className="bl-desktop-design"><legend>02 / The progress</legend><div className="bl-progress-catalog">{Object.entries(progressTreatments).map(([key, p]) => <button type="button" key={key} aria-pressed={progressStyle === key} onClick={() => setProgressStyle(key as ProgressId)}><span className="bl-trace-swatch" data-trace={key}><i/><i/><i/></span><span><strong>{p.name}</strong><small>{p.short}</small></span></button>)}</div></fieldset>
          <p className="bl-choice-description">{progressTreatments[progressStyle].description}</p>
          <fieldset className="bl-desktop-design"><legend>03 / The material</legend><div className="bl-material-catalog">{Object.entries(trailMaterials).map(([key, finish]) => <button type="button" key={key} aria-pressed={material === key} onClick={() => setMaterial(key as TrailMaterialId)}><span className="bl-material-swatch" data-material={key}><i/></span><span><strong>{finish.name}</strong><small>{finish.short}</small></span></button>)}</div></fieldset>
          <p className="bl-choice-description">{trailMaterials[material].description}</p>
          <fieldset className="bl-desktop-design"><legend>04 / The lens</legend><div className="bl-zoom-catalog">{Object.entries(zoomTreatments).map(([key, z]) => <button type="button" key={key} aria-pressed={zoomStyle === key} onClick={() => setZoomStyle(key as ZoomId)}>{z.name}</button>)}</div></fieldset>
          <p className="bl-choice-description">{zoomTreatments[zoomStyle].description}</p>
        </> : <><div className="bl-side-heading"><p className="bl-eyebrow">The 3D direction</p><h3>Room to move.</h3><p>Trees, benches and fixed distance signs give forward travel a physical setting.</p></div><fieldset><legend>Camera</legend><div className="bl-segment"><button type="button" aria-pressed={!above} onClick={() => setAbove(false)}>Follow</button><button type="button" aria-pressed={above} onClick={() => setAbove(true)}>From above</button></div></fieldset></>}
        <label className="bl-checkbox"><input type="checkbox" checked={showGhost} onChange={e => setShowGhost(e.target.checked)}/><span>Show past you<small>Same cutoff · never ranked</small></span></label>
        <div className="bl-field-list"><div className="bl-list-title"><h3>In your field</h3><span>Distance</span></div>{ordered.map(l => <button type="button" key={l.id} aria-pressed={selected === l.id} onClick={() => select(l.id)}><span className={`bl-mini-capsule ${l.you ? "is-you" : ""}`}/><span><strong>{l.you ? "You" : l.name}</strong><small>{l.you ? "Your counted total" : boardGap(l.value, total, "km")}</small></span><b>{l.value.toFixed(1)}<small>km</small></b></button>)}</div>
      </aside>
    </div>
    <footer className="bl-review-footer"><span>Presentation study · no activity or score writes</span><span>Vertical · kilometers · independent surfaces, traces and lenses</span></footer>
  </main>;
}
