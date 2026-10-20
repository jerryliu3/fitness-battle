"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { clampArenaLaneCenter, orderedArenaLanes, type ArenaViewWindow } from "@fitness-battle/shared";
import { Board2D } from "./board-2d";
import { PersistentField } from "./persistent-field";
import { boardFixture } from "./fixtures";
import { boardGap, concepts, defaultBoardView, fitBoardView, formatBoardValue, type BoardConcept, type BoardOrientation, type BoardSession } from "./model";
import "./board-lab.css";

const Horizon = dynamic(() => import("./horizon").then(m => m.Horizon), { ssr: false, loading: () => <div className="bl-world-loading">Preparing the field…</div> });

function subscribeReducedMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const reducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function BoardLab() {
  const [concept, setConcept] = useState<BoardConcept>("tapestry");
  const [orientation, setOrientation] = useState<BoardOrientation>("vertical");
  const [effort, setEffort] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState("you");
  const [session, setSession] = useState<BoardSession | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [camera, setCamera] = useState<ArenaViewWindow | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [above, setAbove] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [notice, setNotice] = useState("");
  const frame = useRef(0);
  const cameraFrame = useRef(0);
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => true);
  const fixture = useMemo(() => boardFixture(effort, distanceUnit), [effort, distanceUnit]);
  const baseYou = fixture.lanes.find(l => l.you)!;
  const total = baseYou.value + fixture.gain * progress;
  const lanes = fixture.lanes.map(l => l.you ? { ...l, value: total } : l);
  const sessions = progress > 0 ? [...fixture.sessions, { id: "preview-session", athleteId: baseYou.id, title: effort ? "New strength session" : "A little further", recordedAt: "2026-10-20T20:00:00Z", start: baseYou.value, end: total }] : fixture.sessions;
  const view = camera ?? defaultBoardView(total, fixture.unit);
  const person = lanes.find(l => l.id === selected) ?? lanes.find(l => l.you)!;
  const nearest = lanes.filter(l => !l.you && !l.ghost).sort((a, b) => Math.abs(a.value - total) - Math.abs(b.value - total))[0]!;
  const fieldHigh = Math.max(1, ...lanes.filter(l => !l.ghost).map(l => l.value));
  const ordered = orderedArenaLanes(lanes);
  const direction = concepts[concept];

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("concept"), o = q.get("orientation");
    const metric = q.get("metric") === "effort";
    if (c === "tapestry" || c === "ribbon" || c === "horizon") setConcept(metric && c === "horizon" ? "tapestry" : c);
    setOrientation(o === "horizontal" || o === "vertical" ? o : c === "ribbon" ? "horizontal" : "vertical");
    setEffort(metric); setDistanceUnit(q.get("unit") === "mi" ? "mi" : "km"); setInitialized(true);
    return () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(cameraFrame.current); };
  }, []);
  useEffect(() => {
    if (!initialized) return;
    const q = new URLSearchParams({ concept, orientation, metric: effort ? "effort" : "distance", unit: distanceUnit });
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
  }, [concept, orientation, effort, distanceUnit, initialized]);
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setProgress(1); setPlaying(false); setNotice(`Preview added ${formatBoardValue(fixture.gain, fixture.unit)} ${fixture.unit}.`); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 2400);
      setProgress(p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else { setPlaying(false); setNotice(`Preview added ${formatBoardValue(fixture.gain, fixture.unit)} ${fixture.unit}. Your effort stays on the field.`); }
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, reduced, fixture]);

  function stop() { cancelAnimationFrame(frame.current); cancelAnimationFrame(cameraFrame.current); setPlaying(false); }
  function reset() { stop(); setProgress(0); setCamera(null); setSession(null); setNotice(""); }
  function choose(next: BoardConcept) {
    stop(); setConcept(next); setSession(null); setUnavailable(false); setNotice("");
    if (next !== "horizon") setOrientation(next === "ribbon" ? "horizontal" : "vertical");
  }
  function pan(center: number) { stop(); setCamera({ center: clampArenaLaneCenter(center, view.span), span: view.span }); }
  function moveView(next: ArenaViewWindow, follow = false) {
    stop();
    const target = { ...next, center: clampArenaLaneCenter(next.center, next.span) };
    if (reduced) { setCamera(follow ? null : target); return; }
    const from = view, start = performance.now();
    const tick = (now: number) => {
      if (reducedMotionSnapshot()) { setCamera(follow ? null : target); return; }
      const t = Math.min(1, (now - start) / 380), ease = 1 - (1 - t) ** 3;
      setCamera({ center: from.center + (target.center - from.center) * ease, span: from.span + (target.span - from.span) * ease });
      if (t < 1) cameraFrame.current = requestAnimationFrame(tick);
      else if (follow) setCamera(null);
    };
    cameraFrame.current = requestAnimationFrame(tick);
  }
  function zoom(multiplier: number) {
    const span = Math.max(fixture.unit === "pts" ? 4 : .8, Math.min(500, view.span * multiplier));
    moveView({ center: clampArenaLaneCenter(view.center, span), span });
  }
  function changeMetric(next: boolean) {
    reset(); setEffort(next); setSelected("you"); if (next && concept === "horizon") setConcept("tapestry");
  }

  return <main className="board-lab">
    <div className="bl-review-bar"><Link href="/design">← Design studies</Link><span>COMPETE / FIELD STUDY</span><span className="bl-study-tag">Interactive prototypes</span></div>
    <header className="bl-intro"><div><p className="bl-eyebrow">A little further, made visible</p><h1>Give your effort<br/>some ground.</h1></div><p>Three ways to feel the week taking shape. Same glass racers. Same effort. A field worth coming back to.</p></header>
    <nav className="bl-concepts" aria-label="Board concept">{(Object.keys(concepts) as BoardConcept[]).map(id => <button key={id} type="button" disabled={id === "horizon" && effort} aria-pressed={concept === id} onClick={() => choose(id)}><span>{concepts[id].medium}<i>{id === "horizon" ? "GPS distance" : "Distance + effort"}</i></span><strong>{concepts[id].name}</strong><small>{concepts[id].line}</small></button>)}</nav>
    <div className="bl-review-controls"><div className="bl-segment" aria-label="Preview metric"><button type="button" aria-pressed={!effort} onClick={() => changeMetric(false)}>Running · distance</button><button type="button" aria-pressed={effort} onClick={() => changeMetric(true)}>Strength · effort</button></div><div className="bl-control-tail">{!effort && <div className="bl-segment" aria-label="Distance unit"><button type="button" aria-pressed={distanceUnit === "km"} onClick={() => { reset(); setDistanceUnit("km"); }}>km</button><button type="button" aria-pressed={distanceUnit === "mi"} onClick={() => { reset(); setDistanceUnit("mi"); }}>mi</button></div>}<span>Fictional athletes & sessions</span></div></div>
    <div className="bl-workspace">
      <section className="bl-app" aria-label={`${direction.name} product preview`}>
        <header className="bl-app-header"><span className="bl-brand">overtaek</span><span className="bl-profile">JL</span></header>
        <div className="bl-week-heading"><div><p className="bl-eyebrow">{fixture.sport} / Your weekly field</p><h2>{direction.line}</h2></div><span className="bl-week-chip">19–26 Oct · UTC</span></div>
        <div className="bl-score"><div><strong data-testid="board-total">{formatBoardValue(total, fixture.unit)}<small>{fixture.unit}</small></strong><span>Your counted {fixture.unit === "pts" ? "effort" : "distance"}</span></div><div className="bl-nearest"><span>In good company</span><strong>{nearest.name.split(" ")[0]}</strong><small>{boardGap(nearest.value, total, fixture.unit)}</small></div></div>
        <PersistentField expanded={expanded} onClose={() => setExpanded(false)}>
          <section className={`bl-field-shell ${expanded ? "is-expanded" : ""}`} data-concept={concept}>
            <div className="bl-field-top"><div><span className="bl-field-title">{direction.name}</span><span className="bl-field-mode">{concept === "horizon" ? "3D / GPS distance" : `${orientation === "vertical" ? "Vertical" : "Horizontal"} / ${fixture.unit === "pts" ? "Effort" : "Distance"}`}</span></div><button type="button" className="bl-icon-button" onClick={() => setExpanded(v => !v)} aria-label={expanded ? "Close expanded field" : "Expand field"} aria-expanded={expanded}>{expanded ? "↙ Close" : "↗ Expand"}</button></div>
            <div className="bl-scene" data-testid="board-scene">
              {concept === "horizon" && fixture.unit !== "pts" && !unavailable
                ? <Horizon lanes={lanes} view={view} unit={fixture.unit} selected={selected} showGhost={showGhost} above={above} onSelect={id => { setSelected(id); setSession(null); }} onUnavailable={() => setUnavailable(true)}/>
                : <Board2D lanes={lanes} sessions={sessions} material={concept === "ribbon" ? "ribbon" : "tapestry"} orientation={orientation} view={view} unit={fixture.unit} selected={selected} showGhost={showGhost} expanded={expanded} onSelect={id => { setSelected(id); setSession(null); }} onSession={item => { stop(); setSession(item); }} onPan={pan}/>}
            </div>
            <div className="bl-field-tools"><div className="bl-tool-group"><button type="button" aria-label="Explore earlier distance" onClick={() => moveView({ ...view, center: view.center - view.span / 3 })}>{orientation === "horizontal" && concept !== "horizon" ? "←" : "↓"}</button><button type="button" onClick={() => moveView(defaultBoardView(total, fixture.unit), true)}>Center me</button><button type="button" aria-label="Explore further distance" onClick={() => moveView({ ...view, center: view.center + view.span / 3 })}>{orientation === "horizontal" && concept !== "horizon" ? "→" : "↑"}</button></div><div className="bl-tool-group"><button type="button" aria-label="Zoom in" onClick={() => zoom(.7)}>＋</button><button type="button" aria-label="Zoom out" onClick={() => zoom(1.4)}>−</button><button type="button" onClick={() => { if (concept === "horizon") setAbove(true); moveView(fitBoardView(lanes, fixture.unit)); }}>Fit field</button></div></div>
            <div className="bl-overview" aria-label={`Distance from zero to ${formatBoardValue(fieldHigh, fixture.unit)} ${fixture.unit}`}><span>0</span><div className="bl-overview-track"><span className="bl-overview-window" style={{ left: `${Math.max(0, (view.center - view.span / 2) / fieldHigh * 100)}%`, width: `${Math.min(100, view.span / fieldHigh * 100)}%`, maxWidth: `${100 - Math.max(0, (view.center - view.span / 2) / fieldHigh * 100)}%` }}/>{lanes.filter(l => !l.ghost).map(l => <i key={l.id} className={l.you ? "is-you" : ""} style={{ left: `${l.value / fieldHigh * 100}%` }}/>)}</div><span>{formatBoardValue(fieldHigh, fixture.unit)} {fixture.unit}</span></div>
            {unavailable && concept === "horizon" && <p className="bl-fallback" role="status">3D is unavailable here. Your field is shown in 2D with the same values and view.</p>}
            <div className="bl-field-selection" aria-label="Selected athlete or counted session"><span className={`bl-mini-capsule ${person.you ? "is-you" : ""}`}/><div><strong>{session ? session.title : person.you ? "Your week, taking shape" : person.name}</strong><span>{session ? `${formatBoardValue(session.end - session.start, fixture.unit)} ${fixture.unit} · ${new Date(session.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · counted session` : person.you ? `${formatBoardValue(total - (lanes.find(l => l.ghost)?.value ?? total), fixture.unit)} ${fixture.unit} ahead of past you · same cutoff` : boardGap(person.value, total, fixture.unit)}</span></div><strong>{formatBoardValue(session ? session.end - session.start : person.value, fixture.unit)}<small>{fixture.unit}</small></strong></div>
          </section>
        </PersistentField>
        <div className="bl-return"><span className="bl-return-symbol">↗</span><div><strong>{progress >= 1 ? "That effort is part of your week." : "Make room for a little more."}</strong><p>{progress > 0 ? `+${formatBoardValue(fixture.gain * progress, fixture.unit)} ${fixture.unit} in this preview. Recorded sessions stay visible.` : "Preview a counted session and watch the ground move."}</p></div><button type="button" disabled={playing} onClick={() => { if (progress > 0) reset(); else { stop(); setCamera(null); setNotice(""); setPlaying(true); } }}>{playing ? "Adding…" : progress > 0 ? "Reset" : `Preview +${formatBoardValue(fixture.gain, fixture.unit)}`}</button></div>
        <p className="bl-sr-only" role="status">{notice}</p>
        <nav className="bl-app-nav" aria-label="Product context"><span>⌂<small>Home</small></span><span className="is-current">Ⅱ<small>Compete</small></span><span>♧<small>Crew</small></span><span>◉<small>Athlete</small></span></nav>
      </section>
      <aside className="bl-sidebar">
        <div className="bl-side-heading"><span className="bl-eyebrow">Study controls</span><h3>Find the right feel.</h3><p>{direction.detail}</p></div>
        {concept !== "horizon" ? <fieldset><legend>Direction of travel</legend><div className="bl-segment"><button type="button" aria-pressed={orientation === "vertical"} onClick={() => setOrientation("vertical")}>↑ Vertical</button><button type="button" aria-pressed={orientation === "horizontal"} onClick={() => setOrientation("horizontal")}>→ Horizontal</button></div></fieldset> : <fieldset><legend>Camera</legend><div className="bl-segment"><button type="button" aria-pressed={!above} onClick={() => setAbove(false)}>Follow</button><button type="button" aria-pressed={above} onClick={() => setAbove(true)}>From above</button></div></fieldset>}
        <label className="bl-checkbox"><input type="checkbox" checked={showGhost} onChange={e => setShowGhost(e.target.checked)}/><span>Show past you<small>Same cutoff · never ranked</small></span></label>
        <div className="bl-field-list"><div className="bl-list-title"><h3>In your field</h3><span>{fixture.unit === "pts" ? "Effort" : "Distance"}</span></div>{ordered.map(l => <button type="button" key={l.id} aria-pressed={selected === l.id} onClick={() => { setSelected(l.id); setSession(null); }}><span className={`bl-mini-capsule ${l.you ? "is-you" : ""}`}/><span><strong>{l.you ? "You" : l.name}</strong><small>{l.you ? "Your counted total" : boardGap(l.value, total, fixture.unit)}</small></span><b>{formatBoardValue(l.value, fixture.unit)}<small>{fixture.unit}</small></b></button>)}</div>
        <p className="bl-study-note">{concept === "horizon" ? "Scenery belongs to fixed distances. The camera travels through it. This is an illustrative course, not actual locations." : concept === "tapestry" ? "Tap a woven segment to inspect its counted contribution. No session history means no invented seams." : "Distance marks stay fixed to the ribbon. Pan the field to feel them travel past."}</p>
        {effort && <p className="bl-study-note">Effort is shown in points. Horizon’s outdoor course is reserved for GPS distance.</p>}
      </aside>
    </div>
    <footer className="bl-review-footer"><span>Presentation study · no activity or score writes</span><span>Compact ↔ expanded · km / mi / effort · reduced motion</span></footer>
  </main>;
}
