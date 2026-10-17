"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { allConcepts, concepts as refinements, originalConcepts, families, runFrame, runMiles, type Avatar, type Family, type Outcome } from "./concepts";
import { Scene, type SceneProps } from "./scenes";
import styles from "./motion-lab.module.css";

function Icon({ name, size = 18 }: { name: "play" | "pause" | "replay" | "arrow" | "grid" | "focus" | "sun" | "download"; size?: number }) {
  const paths = {
    play: <path d="m9 5 11 7-11 7Z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    replay: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
    arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    focus: <><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function usePlayer(duration: number) {
  const [progress, setProgress] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);
  const [restart, setRestart] = useState(0);
  const current = useRef(1);
  const seek = useCallback((p: number) => { current.current = p; setProgress(p); }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReduced(media.matches); if (media.matches) { setPlaying(false); seek(1); } };
    change();
    if (!media.matches) { seek(0); setPlaying(true); }
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [seek]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    const start = performance.now(), from = current.current;
    let raf = 0, last = 0;
    const tick = (now: number) => {
      const p = Math.min(1, from + (now - start) * speed / duration);
      if (now - last > 30 || p === 1) { seek(p); last = now; }
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, duration, reduced, seek, restart]);
  const replay = () => { seek(reduced ? 1 : 0); setRestart(value => value + 1); setPlaying(!reduced); };
  const toggle = () => { if (reduced) return; if (current.current >= 1) seek(0); setPlaying(v => !v); };
  return { progress, playing, speed, reduced, setPlaying, setSpeed, seek, replay, toggle };
}

async function exportFontStyles() {
  const faces = new Map<string, string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[];
    try { rules = Array.from(sheet.cssRules); } catch { continue; }
    for (const rule of rules) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const face = rule as CSSFontFaceRule;
      const family = face.style.getPropertyValue("font-family");
      if (!/DM Sans|Nunito Sans/.test(family) || !/U\+0{1,4}-0{0,2}FF/i.test(face.cssText)) continue;
      const source = face.style.getPropertyValue("src").match(/url\(["']?([^"')]+)/)?.[1];
      if (!source) continue;
      try {
        let data = source;
        if (!source.startsWith("data:")) {
          const response = await fetch(new URL(source, sheet.href || document.baseURI));
          if (!response.ok) continue;
          const blob = await response.blob();
          data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
          });
        }
        faces.set(family, face.cssText.replace(source, data));
      } catch { /* Still allow an export with the specified system font fallback. */ }
    }
  }
  return [...faces.values()].join("\n");
}

export function MotionLab({ standalone = false }: { standalone?: boolean }) {
  const [round, setRound] = useState<"refined" | "original">("refined");
  const concepts = round === "refined" ? refinements : originalConcepts;
  const [family, setFamily] = useState<Family>("overtake");
  const [selected, setSelected] = useState(0);
  const [compare, setCompare] = useState(false);
  const [dark, setDark] = useState(true);
  const [outcome, setOutcome] = useState<Outcome>(2);
  const [avatar, setAvatar] = useState<Avatar>("circle");
  const [lockup, setLockup] = useState<"stacked" | "inline">("stacked");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const finalFrame = useRef<HTMLDivElement>(null);
  const concept = concepts[family][selected] || concepts[family][0];
  const player = usePlayer(concept.duration);
  const currentFamily = families.find(item => item.id === family)!;
  const sceneProps: SceneProps = { family, concept: concept.id, progress: player.progress, outcome, avatar, dark, reduced: player.reduced, lockup };
  const frame = runFrame(player.progress, concept.id, outcome);
  const key = `${family}:${concept.id}`;

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const f = params.get("experience") as Family;
      if (families.some(item => item.id === f)) {
        setFamily(f);
        const collection = originalConcepts[f].some(item => item.id === params.get("concept")) || params.get("round") === "original" ? "original" : "refined";
        setRound(collection);
        const index = (collection === "refined" ? refinements : originalConcepts)[f].findIndex(item => item.id === params.get("concept"));
        setSelected(Math.max(0, index));
      }
    };
    restore();
    try { const stored: unknown = JSON.parse(localStorage.getItem("overtaek-motion-shortlist") || "[]"); if (Array.isArray(stored)) setFavorites(stored.filter((item): item is string => typeof item === "string")); } catch { /* Private browsing can disable storage. */ }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function choose(nextFamily: Family, index: number, collection: "refined" | "original" = round) {
    const nextConcepts = collection === "refined" ? refinements : originalConcepts;
    setRound(collection);
    setFamily(nextFamily); setSelected(index); setNotice(""); player.replay();
    if (nextConcepts[nextFamily].length < 2) setCompare(false);
    const url = new URL(window.location.href);
    url.searchParams.set("experience", nextFamily); url.searchParams.set("concept", nextConcepts[nextFamily][index].id);
    url.searchParams.set("round", collection);
    window.history.replaceState(null, "", url);
  }

  function changeRound(value: "refined" | "original") {
    setRound(value); setSelected(0); setCompare(false); player.replay();
    const url = new URL(window.location.href);
    url.searchParams.set("round", value);
    url.searchParams.set("experience", family);
    url.searchParams.set("concept", (value === "refined" ? refinements : originalConcepts)[family][0].id);
    window.history.replaceState(null, "", url);
  }

  function shortlist() {
    const next = favorites.includes(key) ? favorites.filter(item => item !== key) : [...favorites, key];
    setFavorites(next);
    try { localStorage.setItem("overtaek-motion-shortlist", JSON.stringify(next)); } catch { /* The in-session shortlist still works. */ }
  }

  async function downloadFrame() {
    const svg = finalFrame.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", "1520"); clone.setAttribute("height", "880");
    const fonts = await exportFontStyles();
    if (fonts) {
      const style = document.createElementNS("http://www.w3.org/2000/svg", "style"); style.textContent = fonts; clone.prepend(style);
    }
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `overtaek-${family}-${concept.id}-final.svg`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(fonts ? "Final frame saved as SVG with embedded fonts." : "Final frame saved as SVG. Uses Nunito Sans, with a system font fallback.");
  }

  return <main id="top" className={styles.lab}>
    <header className={styles.header}>
      <Link href={standalone ? "#top" : "/design"} className={styles.brand} aria-label="Overtaek design lab"><span className={styles.brandIcon} aria-hidden="true">»</span>overtaek<span className={styles.headerDivider} /> <span className={styles.studioLabel}>MOTION LAB</span></Link>
      <div className={styles.headerRight}><span className={styles.statusDot} /> INTERACTIVE STUDY <span className={styles.edition}>01 / OCT 2026</span></div>
    </header>

    <section className={styles.intro}>
      <div><p className={styles.kicker}>A LITTLE EFFORT. A LOT OF MOMENTUM.</p><h1>Make your <span>move.</span><span className={styles.titleArrow} aria-hidden="true">↗</span></h1></div>
      <div className={styles.introCopy}><p>The pass. The name. The feeling.<br /> {round === "refined" ? "Your favorites, brought together. A new angle on the name." : "Three ways to put movement at the heart of Overtaek."}</p><span>{round === "refined" ? "ROUND 02 · ONE COMBINED MOMENT + SIX NEW BRAND STUDIES" : "ROUND 01 · TWELVE ORIGINAL DIRECTIONS"}</span></div>
    </section>

    <div className={styles.roundBar}><span className={styles.smallLabel}>{round === "refined" ? "Refining your favorites" : "The first exploration"}</span><div className={styles.segment} aria-label="Study round"><button aria-pressed={round === "refined"} onClick={() => changeRound("refined")}>Round 2 · Refinements</button><button aria-pressed={round === "original"} onClick={() => changeRound("original")}>Original 12</button></div></div>

    <nav className={styles.families} aria-label="Motion experiences">
      {families.map((item, i) => <button key={item.id} className={family === item.id ? styles.familyActive : ""} onClick={() => choose(item.id, 0)} aria-pressed={family === item.id}>
        <span className={styles.familyNumber}>0{i + 1}</span><span><strong>{item.title}</strong><small>{item.short}</small></span><Icon name="arrow" />
      </button>)}
    </nav>

    <section className={styles.workspace} aria-label={`${currentFamily.title} concept comparison`}>
      <div className={styles.workspaceHeader}>
        <div><span className={styles.smallLabel}>{currentFamily.short}</span><h2>{currentFamily.description}</h2></div>
        <div className={styles.viewControls}>
          {concepts[family].length > 1 && <div className={styles.segment} aria-label="Comparison layout"><button onClick={() => setCompare(false)} aria-pressed={!compare}><Icon name="focus" size={15} /> Focus</button><button onClick={() => setCompare(true)} aria-pressed={compare}><Icon name="grid" size={15} /> Compare {concepts[family].length}</button></div>}
          <button className={styles.iconButton} onClick={() => setDark(v => !v)} aria-label={dark ? "Use light canvas" : "Use dark canvas"} title={dark ? "Light canvas" : "Dark canvas"}><Icon name="sun" /></button>
        </div>
      </div>

      <div className={styles.feature}>
        {compare ? <div className={styles.compareGrid} data-count={concepts[family].length}>{concepts[family].map((item, i) => <button key={item.id} className={styles.compareCard} onClick={() => { choose(family, i); setCompare(false); }} aria-label={`Focus ${item.name}`}><div className={styles.compareHeading}><span>0{i + 1} / {item.name}</span><Icon name="focus" size={14} /></div><div className={styles.compareScene} style={{ background: dark ? "#26382d" : "#fafbf8" }}><Scene {...sceneProps} concept={item.id} /></div></button>)}</div>
          : <div className={styles.stage} style={{ background: dark ? "#26382d" : "#fafbf8" }}><div className={styles.stageTag} data-dark={dark}><span /> {player.playing ? "IN MOTION" : player.progress === 1 ? "FINAL FRAME" : "FRAME STUDY"}</div><Scene {...sceneProps} /></div>}

        <aside className={styles.inspector}>
          <div className={styles.conceptTop}><span className={styles.conceptNumber}>0{selected + 1}<small> / 0{concepts[family].length}</small></span><button className={styles.favorite} onClick={shortlist} aria-pressed={favorites.includes(key)} aria-label={favorites.includes(key) ? "Remove from shortlist" : "Add to shortlist"}>{favorites.includes(key) ? "★" : "☆"}</button></div>
          <p className={styles.smallLabel}>{concept.label}</p><h3>{concept.name}</h3><p className={styles.conceptDescription}>{concept.description}</p><p className={styles.detail}>{concept.detail}</p>
          {family === "overtake" ? <div className={styles.options}>
            <fieldset><legend>AFTER THE RUN</legend><div className={styles.optionSegment}>{([0, 1, 2] as Outcome[]).map(n => <button key={n} aria-pressed={outcome === n} onClick={() => { setOutcome(n); player.replay(); }}>{n === 0 ? "No pass" : `${n} ${n === 1 ? "pass" : "passes"}`}</button>)}</div></fieldset>
            <fieldset><legend>YOUR CHARACTER</legend><div className={styles.optionSegment}>{(["circle", "ember"] as Avatar[]).map(value => <button key={value} aria-pressed={avatar === value} onClick={() => setAvatar(value)}>{value === "circle" ? "Circle" : "Ember"}</button>)}</div></fieldset>
            <Dialog.Root open={preview} onOpenChange={open => { setPreview(open); if (open) player.replay(); }}><Dialog.Trigger asChild><button className={styles.contextButton}>Try the return moment <Icon name="arrow" size={16} /></button></Dialog.Trigger>
              <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.returnDialog} aria-describedby="return-description"><div className={styles.dialogHeader}><div><p className={styles.smallLabel}>COMPETE · SAMPLE RUN RECEIVED</p><Dialog.Title>Your run just landed.</Dialog.Title></div><Dialog.Close className={styles.iconButton} aria-label="Close return moment">×</Dialog.Close></div><Dialog.Description id="return-description" className={styles.dialogDescription}>An example of the panel you see when you return after a run. Fictional athletes and activity.</Dialog.Description><div className={styles.dialogStage}><Scene {...sceneProps} /></div><div className={styles.returnStats}><div><span>RUN ADDED</span><strong>+{runMiles[outcome].toFixed(1)} mi</strong></div><div><span>YOUR POSITION</span><strong>#{frame.rank} <small>{frame.done && outcome > 0 ? `↑ ${outcome}` : "this week"}</small></strong></div><div><span>OVERTAKES*</span><strong>{7 + frame.passed.length} <small>this week</small></strong></div></div><div className={styles.dialogFooter}><button className={styles.quietButton} onClick={player.replay}><Icon name="replay" size={16} /> Replay</button><Dialog.Close className={styles.contextButton}>Back to Compete →</Dialog.Close></div></Dialog.Content></Dialog.Portal>
            </Dialog.Root>
          </div> : <div className={styles.brandOptions}>{family === "logo" && round === "refined" && <fieldset className={styles.finishOptions}><legend>FINISH</legend><div className={styles.optionSegment}>{(["stacked", "inline"] as const).map(value => <button key={value} aria-pressed={lockup === value} onClick={() => { setLockup(value); player.replay(); }}>{value === "stacked" ? "Staggered" : "Single line"}</button>)}</div></fieldset>}<div className={styles.staticReady}><span>↗</span><p><strong>Motion with a destination.</strong><small>Every sequence holds on a usable final mark.</small></p></div><button className={styles.contextButton} onClick={() => { player.setPlaying(false); player.seek(1); }}>View final frame <Icon name="focus" size={16} /></button><button className={styles.quietButton} onClick={downloadFrame}><Icon name="download" size={16} /> Save final frame · SVG</button></div>}
        </aside>

        <div className={styles.player}>
          <button className={styles.playButton} onClick={player.toggle} disabled={player.reduced} aria-label={player.playing ? "Pause animation" : player.progress === 1 ? "Replay animation" : "Play animation"}><Icon name={player.playing ? "pause" : player.progress === 1 ? "replay" : "play"} size={19} /></button>
          <button className={styles.replayButton} onClick={player.replay} disabled={player.reduced} aria-label="Restart animation"><Icon name="replay" size={17} /></button>
          <div className={styles.timeline}><label className={styles.srOnly} htmlFor="motion-timeline">Animation progress</label><input id="motion-timeline" type="range" min="0" max="1" step=".001" value={player.progress} disabled={player.reduced} onChange={e => { player.setPlaying(false); player.seek(Number(e.target.value)); }} /><div className={styles.beats}>{concept.beats.map((beat, i) => <button key={beat} disabled={player.reduced} onClick={() => { player.setPlaying(false); player.seek([0, .44, .68, 1][i]); }} aria-label={`Seek to ${beat}`}><span className={player.progress >= [0, .44, .68, 1][i] ? styles.beatActive : ""} />{beat}</button>)}</div></div>
          <output className={styles.time}>{(player.progress * concept.duration / 1000).toFixed(1)}<span> / {(concept.duration / 1000).toFixed(1)}s</span></output>
          <label className={styles.speed}><span className={styles.srOnly}>Playback speed</span><select value={player.speed} disabled={player.reduced} onChange={e => player.setSpeed(Number(e.target.value))}><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option></select></label>
        </div>
      </div>

      <div className={styles.conceptCards} data-count={concepts[family].length} aria-label="Choose a concept">{concepts[family].map((item, i) => <button key={item.id} className={`${styles.conceptCard} ${selected === i ? styles.selectedCard : ""}`} aria-pressed={selected === i} onClick={() => choose(family, i)}><div className={styles.thumbnail}><Scene {...sceneProps} concept={item.id} progress={family === "overtake" ? .68 : 1} reduced />{favorites.includes(`${family}:${item.id}`) && <span className={styles.savedStar}>★</span>}</div><div className={styles.cardLabel}><span>0{i + 1}</span><strong>{item.name}</strong><span className={styles.cardDot} /></div><p>{item.description}</p></button>)}</div>

      <div className={styles.studyNotes}><p>{family === "overtake" ? "Fictional run + field. No tracker sync is made. *Overtakes are a proposed fun metric; the sample starts at 7. Scoring is unchanged." : "Exploratory brand directions. Final-frame SVG exports include the canvas background and available fonts. Words remain live vector text."}</p><p>{player.reduced ? "Reduced motion is on. Finished frames are shown." : "Plays once. Replay, slow down, or drag the timeline to inspect."}</p></div>
      <p className={styles.notice} role="status">{notice}</p>
    </section>

    {favorites.length > 0 && <section className={styles.shortlist} aria-label="Your shortlist"><p className={styles.smallLabel}>YOUR SHORTLIST <span>{favorites.length.toString().padStart(2, "0")}</span></p><div>{families.flatMap(f => allConcepts[f.id].filter(item => favorites.includes(`${f.id}:${item.id}`)).map(item => <button key={item.id} onClick={() => { const value = originalConcepts[f.id].includes(item) ? "original" : "refined"; setCompare(false); choose(f.id, (value === "refined" ? refinements : originalConcepts)[f.id].indexOf(item), value); }}><span>{f.title}</span>{item.name} ↗</button>))}</div><small>Saved in this browser.</small></section>}

    <footer className={styles.footer}><span className={styles.brand}>overtaek<span className={styles.footerArrow}>↗</span></span><p>EVERYDAY TRAINING. EXTRAORDINARY LITTLE MOMENTS.</p>{standalone ? <span className={styles.smallLabel}>19 CONCEPTS · TWO ROUNDS</span> : <Link href="/design/overtaek">Earlier identity studies ↗</Link>}</footer>
    <div hidden ref={finalFrame}><Scene {...sceneProps} progress={1} reduced /></div>
  </main>;
}
