"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ICONS, LANES, laneFrame, type Appearance, type IconId, type Mask } from "./catalog";
import { IconArt } from "./icon-art";
import { LanePhone } from "./lane-art";
import { RefinementRound } from "./refinement-round";
import { FinishRound } from "./finish-round";
import { GlassRound } from "./glass-round";
import { MaterialRound } from "./material-round";
import { WakeStudy } from "./wake-study";
import { AfterimageRound } from "./afterimage-round";
import "./pass-lab.css";

type View = "finishes" | "glass" | "materials" | "wake-study" | "afterimage" | "refinements" | "icons" | "lanes" | "shortlist" | "notes";
type Filter = "All 15" | "With trails" | "Character" | "Type";
type Detail = { kind: "icon"; id: IconId } | { kind: "lane"; index: number } | null;
const STORAGE = "overtaek-pass-study-shortlist-v1";

function Glyph({ name }: { name: "star" | "arrow" | "download" | "close" | "play" | "pause" }) {
  const paths = { star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z", arrow: "M5 19 19 5M5 5h14v14", download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4", close: "m6 6 12 12M6 18 18 6", play: "m9 5 11 7-11 7Z", pause: "M8 5v14M16 5v14" };
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function useMotion() {
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [restart, setRestart] = useState(0);
  const current = useRef(1);
  function seek(p: number) { current.current = p; setProgress(p); }
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(mq.matches); if (mq.matches) setPlaying(false); };
    update(); mq.addEventListener("change", update);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    return () => { mq.removeEventListener("change", update); document.removeEventListener("visibilitychange", hide); };
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    const start = performance.now(), from = current.current;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      const p = Math.min(1, from + (now - start) / (3200 / speed));
      if (now - last > 32 || p === 1) { current.current = p; setProgress(p); last = now; }
      if (p === 1) setPlaying(false); else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, speed, restart]);
  function replay() { seek(0); setRestart(n => n + 1); if (!reduced) setPlaying(true); }
  return { progress, playing, reduced, speed, setSpeed, setPlaying, seek, replay };
}

function saveFile(contents: string, name: string, type = "image/svg+xml") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function PassLab({ standalone = false }: { standalone?: boolean }) {
  const [view, setView] = useState<View>("wake-study");
  const [filter, setFilter] = useState<Filter>("All 15");
  const [appearance, setAppearance] = useState<Appearance>("original");
  const [mask, setMask] = useState<Mask>("squircle");
  const [detail, setDetail] = useState<Detail>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [gain, setGain] = useState(4.2);
  const [ghost, setGhost] = useState(true);
  const [flow, setFlow] = useState(true);
  const [visiblePage, setVisiblePage] = useState(true);
  useEffect(() => { const update = () => setVisiblePage(!document.hidden); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  const [size, setSize] = useState(128);
  const motion = useMotion();
  const detailArt = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const frame = laneFrame(motion.progress, gain);
  let passing = .4;
  if (view === "lanes" || detail?.kind === "lane") {
    // Find the first actual crossing rather than putting a pass badge on an arbitrary midpoint.
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (laneFrame(mid, gain).value < 13.83) lo = mid; else hi = mid; }
    passing = gain > 1.4 ? (lo + hi) / 2 : .5;
  }

  useEffect(() => {
    try { const raw: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "[]"); if (Array.isArray(raw)) setSaved(raw.filter((s): s is string => typeof s === "string" && (ICONS.some(c => c.id === s) || /^lane-[0-7]$/.test(s)))); } catch { /* Local storage is optional in a portable review. */ }
    setStorageReady(true);
    const restore = () => {
      const q = new URLSearchParams(window.location.search);
      const v = q.get("view"); if (v === "finishes" || v === "glass" || v === "materials" || v === "wake-study" || v === "afterimage" || v === "refinements" || v === "icons" || v === "lanes" || v === "shortlist" || v === "notes") setView(v);
      const id = q.get("icon"); if (ICONS.some(c => c.id === id)) setDetail({ kind: "icon", id: id as IconId });
      else if (/^[0-7]$/.test(q.get("lane") ?? "")) setDetail({ kind: "lane", index: Number(q.get("lane")) });
      else setDetail(null);
    };
    restore(); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => { if (storageReady) try { localStorage.setItem(STORAGE, JSON.stringify(saved)); } catch { /* The in-memory shortlist still works. */ } }, [saved, storageReady]);

  function select(next: View, d: Detail = null) {
    setView(next); setDetail(d);
    const q = new URLSearchParams(); if (next !== "wake-study") q.set("view", next);
    if (d?.kind === "icon") q.set("icon", d.id);
    if (d?.kind === "lane") q.set("lane", String(d.index));
    const query = q.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }
  function toggleSaved(id: string) { setSaved(s => s.includes(id) ? s.filter(v => v !== id) : [...s, id]); }
  function exportIcon() {
    const svg = detailArt.current?.querySelector("svg");
    if (!svg || detail?.kind !== "icon") return;
    const copy = svg.cloneNode(true) as SVGElement;
    copy.setAttribute("width", "1024"); copy.setAttribute("height", "1024");
    // Master exports are square and unmasked; operating systems supply the final mask.
    copy.querySelector("g[clip-path]")?.removeAttribute("clip-path");
    saveFile(new XMLSerializer().serializeToString(copy), `overtaek-${detail.id}-${appearance}-1024.svg`);
    setNotice("1024 px square SVG exported. System mask is not baked in.");
  }
  function exportBoard() {
    const nodes = grid.current?.querySelectorAll("[data-export-icon] > svg");
    if (!nodes?.length) return;
    const cols = 5, tile = 220, h = Math.ceil(nodes.length / cols) * 270 + 80;
    const items = Array.from(nodes).map((node, i) => {
      const copy = node.cloneNode(true) as SVGElement;
      copy.setAttribute("x", String((i % cols) * tile + 34)); copy.setAttribute("y", String(Math.floor(i / cols) * 270 + 72)); copy.setAttribute("width", "164"); copy.setAttribute("height", "164");
      const name = node.getAttribute("aria-label")?.replace(" app icon", "") ?? "";
      return new XMLSerializer().serializeToString(copy) + `<text x="${(i % cols) * tile + 34}" y="${Math.floor(i / cols) * 270 + 263}" fill="#282f2c" font-family="Arial,sans-serif" font-size="15">${name}</text>`;
    }).join("");
    saveFile(`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${h}" viewBox="0 0 1100 ${h}"><rect width="1100" height="${h}" fill="#f0f2ed"/><text x="34" y="36" font-family="Arial,sans-serif" font-size="18" fill="#282f2c">OVERTAEK / THE ART OF THE PASS / CONCEPT BOARD</text>${items}</svg>`, "overtaek-icon-concept-board.svg");
  }
  const visible = ICONS.filter(c => view === "shortlist" ? saved.includes(c.id) : filter === "All 15" || (filter === "With trails" ? c.trail : c.family === filter));
  const iconDetail = detail?.kind === "icon" ? ICONS.find(c => c.id === detail.id) : null;
  const laneDetail = detail?.kind === "lane" ? LANES[detail.index] : null;

  const playback = <div className="pass-playback">
    <button className="pass-button pass-play" onClick={() => motion.playing ? motion.setPlaying(false) : motion.progress >= 1 || motion.progress === 0 ? motion.replay() : motion.setPlaying(true)} disabled={motion.reduced}><Glyph name={motion.playing ? "pause" : "play"} />{motion.playing ? "Pause" : "Play the pass"}</button>
    <div className="pass-scrub"><label htmlFor={detail ? "pass-detail-timeline" : "pass-timeline"}>{view === "lanes" || detail?.kind === "lane" ? `Your run · +${(frame.value - 12.4).toFixed(1)} km` : "The lead changes hands"}<span>{Math.round(motion.progress * 100)}%</span></label><input id={detail ? "pass-detail-timeline" : "pass-timeline"} type="range" min="0" max="1" step="0.001" value={motion.progress} onChange={e => { motion.setPlaying(false); motion.seek(Number(e.target.value)); }} /></div>
    <div className="pass-beats">{[[0, "Chasing"], [passing, view === "lanes" && gain < 1.4 ? "Progress" : "Passing"], [1, "Ahead"]].map(([p, name]) => <button key={name} className={motion.progress === p ? "is-active" : ""} onClick={() => { motion.setPlaying(false); motion.seek(Number(p)); }}>{name}</button>)}</div>
    <label className="pass-speed"><span className="pass-sr-only">Playback speed</span><select value={motion.speed} onChange={e => motion.setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
    {motion.reduced && <p className="pass-motion-note">Reduced motion is on. Explore still frames with the slider.</p>}
  </div>;

  function iconCard(c: typeof ICONS[number]) {
    const n = ICONS.findIndex(i => i.id === c.id) + 1;
    return <article className="pass-icon-card" key={c.id}>
      <div className="pass-card-top"><span>{String(n).padStart(2, "0")} / {c.family}</span><button className={`pass-save ${saved.includes(c.id) ? "is-saved" : ""}`} aria-label={`${saved.includes(c.id) ? "Remove" : "Shortlist"} ${c.name}`} aria-pressed={saved.includes(c.id)} onClick={() => toggleSaved(c.id)}><Glyph name="star" /></button></div>
      <button className="pass-art-button" onClick={() => select(view, { kind: "icon", id: c.id })} aria-label={`Inspect ${c.name}`}><div data-export-icon><IconArt id={c.id} appearance={appearance} mask={mask} phase={motion.progress} /></div><span className="pass-inspect-label">Explore direction <Glyph name="arrow" /></span></button>
      <div className="pass-card-title"><h3>{c.name}</h3>{c.trail && <span className="pass-trail-tag">↓ TRAIL</span>}</div><p>{c.line}</p>
      <div className="pass-card-bottom"><span className="pass-mini"><IconArt id={c.id} appearance={appearance} mask={mask} size={24} /><IconArt id={c.id} appearance={appearance} mask={mask} size={16} /><span>24 / 16 px</span></span><button onClick={() => select("lanes", { kind: "lane", index: c.lane })} aria-label={`View ${c.name} lane study`}>Lane {String(c.lane + 1).padStart(2, "0")} ↗</button></div>
    </article>;
  }
  function laneCard(index: number) {
    const c = LANES[index]; const id = `lane-${index}`;
    return <article className="pass-lane-card" key={c.name}><div className="pass-lane-heading"><div><span className="pass-eyebrow">LANE {String(index + 1).padStart(2, "0")}</span><h3>{c.name}</h3></div><button className={`pass-save ${saved.includes(id) ? "is-saved" : ""}`} aria-pressed={saved.includes(id)} aria-label={`${saved.includes(id) ? "Remove" : "Shortlist"} ${c.name}`} onClick={() => toggleSaved(id)}><Glyph name="star" /></button></div><button className="pass-phone-button" onClick={() => select(view, { kind: "lane", index })} aria-label={`Inspect ${c.name} lane`}><LanePhone index={index} progress={motion.progress} gain={gain} ghost={ghost} flow={flow && visiblePage && !motion.reduced} /></button><p>{c.line}</p><div className="pass-lane-foot"><IconArt id={c.icon} appearance={appearance} mask={mask} size={30} /><span>One identity, from icon to field.</span><button onClick={() => select(view, { kind: "lane", index })} aria-label={`Read about ${c.name}`}><Glyph name="arrow" /></button></div></article>;
  }

  return <main className={`pass-lab ${(view === "finishes" || view === "glass" || view === "materials" || view === "wake-study" || view === "afterimage" || view === "refinements") ? "is-refining" : ""}`}>
    <header className="pass-topbar">{standalone ? <a href="?view=icons" onClick={e => { e.preventDefault(); select("icons"); }} className="pass-wordmark">overtaek<span>®</span></a> : <Link href="/design/brand?concept=everyday-club&view=product" className="pass-wordmark">overtaek<span>®</span></Link>}<span>IDENTITY & FIELD STUDY <i /> 01</span>{standalone ? <span className="pass-local-tag">INTERACTIVE REVIEW</span> : <Link href="/design/motion?experience=overtake&concept=photo-combo&round=refined">Motion study <Glyph name="arrow" /></Link>}</header>
    <section className="pass-intro"><div><p className="pass-eyebrow">EXPLORING THE MOMENT YOU MOVE AHEAD</p><h1>The art<br />of the <em>pass.</em><span className="pass-heading-dot" /></h1><p className="pass-intro-copy">A split second on the field.<br />A symbol you recognize anywhere.</p></div><div className="pass-hero-art" aria-hidden="true"><div className="pass-hero-back"><IconArt id="ember-pursuit" size={142} /></div><div className="pass-hero-front"><IconArt id="twin-trails" size={205} /></div><div className="pass-hero-note"><span>↑ A LITTLE AHEAD.</span><small>15 icon directions · 8 vertical fields</small></div></div><aside className="pass-intro-aside"><span className="pass-eyebrow">THE QUESTION</span><p>Can two simple shapes make you <em>feel</em> an overtake?</p><span className="pass-aside-meta">12 symbols. 3 type experiments.<br />One everyday sporting club.</span></aside></section>
    <nav className="pass-tabs" aria-label="Study views">{([["finishes", "Shapes × finishes", "08"], ["glass", "Uniform glass", "08"], ["materials", "Material objects", "08"], ["wake-study", "Shared Start · Selected", "03"], ["afterimage", "Shape & color archive", "30"], ["refinements", "Round 2", "12"], ["icons", "Original icons", "15"], ["lanes", "Race lanes", "08"], ["shortlist", "Your shortlist", String(saved.length).padStart(2, "0")], ["notes", "Design notes", "↗"]] as const).map(([key, name, n]) => <button key={key} onClick={() => select(key)} aria-current={view === key ? "page" : undefined} className={view === key ? "is-active" : ""}>{name}<span>{n}</span></button>)}</nav>

    {view === "finishes" && <FinishRound player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} />}
    {view === "glass" && <GlassRound player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} />}
    {view === "materials" && <MaterialRound player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} />}
    {view === "wake-study" && <WakeStudy player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} />}
    {view === "afterimage" && <AfterimageRound player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} gain={gain} setGain={setGain} />}
    {view === "refinements" && <RefinementRound player={motion} flow={flow && visiblePage && !motion.reduced} flowRequested={flow} setFlow={setFlow} gain={gain} setGain={setGain} />}

    {(view === "icons" || view === "shortlist") && <>
      <section className="pass-section-intro"><div><p className="pass-eyebrow">{view === "shortlist" ? "THE DIRECTIONS YOU WANT TO TAKE FURTHER" : "01 — THE APP ICON"}</p><h2>{view === "shortlist" ? "Keep what moves you." : "A race in a square."}</h2></div><p>{view === "shortlist" ? "Your choices are saved in this browser. Mix icons and lanes; they don’t have to come from the same family." : "Twelve symbols with lead-swap previews. Three type experiments. Every mark tested small. Start with shape, then ask which one feels like Overtaek."}</p></section>
      <div className="pass-toolbar"><div className="pass-filter" aria-label="Filter concepts">{view === "icons" && (["All 15", "With trails", "Character", "Type"] as Filter[]).map(f => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? "is-active" : ""}>{f}{f === "With trails" && <span>10</span>}</button>)}{view === "shortlist" && <span>{visible.length} icons · {saved.filter(s => s.startsWith("lane-")).length} lanes saved</span>}</div><div className="pass-display-controls"><label><span className="pass-sr-only">Icon appearance</span><select value={appearance} onChange={e => setAppearance(e.target.value as Appearance)}><option value="original">Concept colors</option><option value="night">On charcoal</option><option value="paper">On paper</option><option value="mono">Monochrome</option></select></label><button onClick={() => setMask(m => m === "circle" ? "squircle" : "circle")}>{mask === "circle" ? "●" : "▢"}<span>{mask === "circle" ? "Circle" : "Squircle"}</span></button><button onClick={exportBoard} disabled={!visible.length} aria-label="Download visible icon concept board"><Glyph name="download" /></button></div></div>
      {!detail && playback}
      {view === "shortlist" && visible.length > 0 && <div className="pass-size-controls"><label htmlFor="pass-compare-size">Compare at actual size <b>{size} px</b></label><div>{[16, 24, 40, 60, 128].map(n => <button key={n} className={size === n ? "is-active" : ""} onClick={() => setSize(n)}>{n}</button>)}</div></div>}
      {view === "shortlist" && visible.length > 0 && <div className="pass-size-board">{visible.map(c => <div key={c.id}><IconArt id={c.id} appearance={appearance} mask={mask} size={size} /><span>{c.name}</span></div>)}</div>}
      <div className="pass-icon-grid" ref={grid}>{visible.map(iconCard)}</div>
      {view === "shortlist" && saved.length === 0 && <div className="pass-empty"><Glyph name="star" /><h3>A fresh starting line.</h3><p>Tap the star on any icon or lane to collect it here.</p><button className="pass-button" onClick={() => select("icons")}>Explore the 15 icons <Glyph name="arrow" /></button></div>}
      {view === "shortlist" && <div className="pass-lane-grid">{LANES.map((_, i) => saved.includes(`lane-${i}`) ? laneCard(i) : null)}</div>}
    </>}

    {view === "lanes" && <>
      <section className="pass-section-intro"><div><p className="pass-eyebrow">02 — THE VERTICAL FIELD</p><h2>The icon, lived in.</h2></div><p>Eight ways to race with the same crew, the same distances, and the same pass. Compare the atmosphere without changing the competition.</p></section>
      <div className="pass-lane-controls"><label>Sample run<select value={gain} onChange={e => { setGain(Number(e.target.value)); motion.setPlaying(false); motion.seek(0); }}><option value="0.8">+0.8 km · no pass</option><option value="2">+2.0 km · one pass</option><option value="4.2">+4.2 km · two passes</option></select></label><label className="pass-check"><input type="checkbox" checked={ghost} onChange={e => setGhost(e.target.checked)} /> Show past you</label><label className="pass-check"><input type="checkbox" checked={flow} onChange={e => setFlow(e.target.checked)} /> Animate trails</label><span>Fictional running week · Higher = further</span></div>
      {!detail && playback}<div className="pass-lane-grid">{LANES.map((_, i) => laneCard(i))}</div><div className="pass-contract"><span>THE FIELD STAYS HONEST</span><p>Athlete lanes stay fixed. The viewport follows you at ±3 km. Arrows show athletes outside the window with their true totals. Past you is never ranked. Trails express motion, not recorded route history.</p></div>
    </>}

    {view === "notes" && <DesignNotes />}
    <footer className="pass-footer"><span className="pass-wordmark">overtaek</span><p>A study in moving ahead, together.</p><span>CONCEPTS, NOT PRODUCTION ASSETS · FICTIONAL DATA</span></footer>
    <p className="pass-sr-only" role="status">{notice}</p>

    <Dialog.Root open={detail !== null} onOpenChange={open => { if (!open) { select(view); motion.setPlaying(false); } }}><Dialog.Portal><Dialog.Overlay className="pass-overlay" /><Dialog.Content className="pass-dialog" aria-describedby="pass-detail-description">
      <div className="pass-dialog-top"><span className="pass-eyebrow">{iconDetail ? `ICON ${String(ICONS.indexOf(iconDetail) + 1).padStart(2, "0")} / ${iconDetail.family.toUpperCase()}` : `LANE ${String((detail?.kind === "lane" ? detail.index : 0) + 1).padStart(2, "0")} / FIELD STUDY`}</span><Dialog.Close className="pass-close" aria-label="Close concept"><Glyph name="close" /></Dialog.Close></div>
      <div className="pass-dialog-body"><div className="pass-focus-art">
        {iconDetail && <><div className="pass-master-art" ref={detailArt}><IconArt id={iconDetail.id} appearance={appearance} mask={mask} phase={motion.progress} size={256} /></div><div className="pass-scale-row">{[60, 40, 24, 16].map(n => <div key={n}><IconArt id={iconDetail.id} appearance={appearance} mask={mask} size={n} /><small>{n} px</small></div>)}</div><div className="pass-homescreen"><span>On your home screen</span><div><i /><i /><div><IconArt id={iconDetail.id} appearance={appearance} mask={mask} size={54} /><small>Overtaek</small></div><i /></div></div></>}
        {laneDetail && detail?.kind === "lane" && <LanePhone index={detail.index} progress={motion.progress} gain={gain} ghost={ghost} flow={flow && visiblePage && !motion.reduced} />}
      </div><div className="pass-focus-copy"><Dialog.Title>{iconDetail?.name ?? laneDetail?.name}</Dialog.Title><Dialog.Description id="pass-detail-description">{iconDetail?.line ?? laneDetail?.line}</Dialog.Description><p>{iconDetail?.idea ?? laneDetail?.idea}</p><div className="pass-focus-note"><span>{iconDetail ? "THE SMALL-SIZE QUESTION" : "AT THE OVERTAKING MOMENT"}</span><p>{iconDetail?.watch ?? laneDetail?.moment}</p></div>{laneDetail && <p className="pass-secondary-copy">{laneDetail.risk}</p>}
        {iconDetail && <label className="pass-detail-select">Appearance<select value={appearance} onChange={e => setAppearance(e.target.value as Appearance)}><option value="original">Concept colors</option><option value="night">On charcoal</option><option value="paper">On paper</option><option value="mono">Monochrome</option></select></label>}
        <div className="pass-focus-actions"><button className="pass-button" onClick={() => toggleSaved(iconDetail?.id ?? `lane-${detail?.kind === "lane" ? detail.index : 0}`)}><Glyph name="star" />{saved.includes(iconDetail?.id ?? `lane-${detail?.kind === "lane" ? detail.index : 0}`) ? "Shortlisted" : "Add to shortlist"}</button>{iconDetail && <button className="pass-button pass-button-light" onClick={exportIcon}><Glyph name="download" />SVG</button>}</div>
        <button className="pass-related" onClick={() => iconDetail ? select("lanes", { kind: "lane", index: iconDetail.lane }) : select("icons", { kind: "icon", id: laneDetail!.icon })}>{iconDetail ? `See lane ${String(iconDetail.lane + 1).padStart(2, "0")} · ${LANES[iconDetail.lane].name}` : "See the matching app icon"}<Glyph name="arrow" /></button>
        {iconDetail && <p className="pass-export-note">Exports a square 1024 px SVG with outlined geometry. The rounded/circle mask is preview only.</p>}
      </div></div>{detail && playback}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </main>;
}

function DesignNotes() {
  return <section className="pass-notes"><div className="pass-section-intro"><div><p className="pass-eyebrow">03 — THE THINKING BEHIND THE SHAPES</p><h2>More than going up.</h2></div><p>Research-informed constraints, original design interpretations. These are hypotheses to compare, not claims about user preference.</p></div><div className="pass-principles"><article><span>01 / RELATIONSHIP</span><h3>Two racers tell<br />a better story.</h3><p>A single arrow says forward. A pair with different leading edges suggests a lead change. Every symbol direction keeps the competition vertical, while the type studies test a simpler brand shorthand.</p></article><article><span>02 / THE STILL FRAME</span><h3>The icon has<br />to earn the motion.</h3><p>A launcher icon is a still image. The final stagger must read before anything plays. Motion is a way to test the idea; it cannot rescue an unclear mark.</p></article><article><span>03 / ONE FAMILY</span><h3>The trail can be<br />the connective tissue.</h3><p>Ten directions test tails, wakes, contour echoes or stitches. Each becomes a repeatable detail in the lane field, loading state or website. The app icon is the compressed version of that language.</p></article></div>
    <div className="pass-research"><h3>What the references contribute</h3><div><a href="https://developer.apple.com/videos/play/wwdc2025/361/" target="_blank" rel="noreferrer">Apple / Icon Composer <Glyph name="arrow" /></a><p>Apple recommends simple vector source layers and checking appearance variants and scale. Our interpretation: test a flat silhouette first, with charcoal, paper and monochrome variants. Layered system materials come after choosing the mark.</p></div><div><a href="https://developer.android.com/develop/ui/compose/system/icon_design_adaptive" target="_blank" rel="noreferrer">Android / Adaptive icons <Glyph name="arrow" /></a><p>Android uses different system masks and a monochrome layer. Our interpretation: compare a circle and rounded square now; export unmasked masters. These sketches still require platform safe-zone tuning before delivery.</p></div><div><a href="https://blog.duolingo.com/shape-language-duolingos-art-style/" target="_blank" rel="noreferrer">Duolingo / Shape language <Glyph name="arrow" /></a><p>A coherent shape vocabulary makes a character world recognizable. Our interpretation: compare the exact existing Ember contour with a separate, simpler spark vocabulary and a deliberately playful racer family.</p></div><div><a href="https://www.nngroup.com/articles/animation-purpose-ux/" target="_blank" rel="noreferrer">Nielsen Norman Group / Purposeful motion <Glyph name="arrow" /></a><p>Motion is useful as feedback and attracts attention. Our interpretation: play a pass on request, keep athlete lanes fixed, and stop at a readable end state. Reduced motion keeps the still-frame controls available.</p></div></div>
    <div className="pass-recommendations"><span className="pass-eyebrow">SELECTED DIRECTION / AFTERIMAGE</span><h3>Three strong questions.<br />Three different answers.</h3><div><p><b>Hollow or solid circle</b>The Afterimage direction is selected. Compare an open contour with a stronger filled head, keeping the same wake.</p><p><b>Yellow, gold and a second color</b>Round 3 compares eight pairings on white, grey and black. Shape, background and wake remain independent.</p><p><b>Ember stays in contention</b>A filled star keeps its canonical face; an outlined star offers the same open geometry as the circle.</p></div><p className="pass-secondary-copy">The user has selected Afterimage and removed lane lines from the logo. Equal echoes and a slightly slower rival are the current wake alternatives. The final head treatment and colors remain open.</p></div>
    <div className="pass-brief"><h3>What stays consistent</h3><p>Everyday Club’s warm white, charcoal and gold form the product shell. The field is vertical. Lane identity stays fixed; distance determines vertical position. The local running fixtures start at 12.4 km and simulate a +0.8, +2.0 or +4.2 km return. No-pass progress stays quiet. Past you is a comparison, never a ranked athlete.</p><p>The original motion references remain the source for the return flow, Photo Finish + Combo, and staggered logo choreography. This study changes the visual vocabulary only. It proposes no scoring, tracker, rewards or production-brand changes.</p></div>
  </section>;
}
