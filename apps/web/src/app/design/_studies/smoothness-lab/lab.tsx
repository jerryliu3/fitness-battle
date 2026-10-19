"use client";

import Link from "next/link";
import { LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Demo } from "./demos";
import { HAPTICS, STUDIES, type Haptic, type StudyId } from "./catalog";
import "./smoothness.css";

export function SmoothnessLab() {
  const [id, setId] = useState<StudyId>("arena");
  const [reset, setReset] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [slow, setSlow] = useState(false);
  const systemReduce = useReducedMotion();
  const reduced = reduce || Boolean(systemReduce);
  const [pulse, setPulse] = useState<{ kind: Haptic; event: string; sequence: number }>({ kind: "none", event: "Interact with the demo to see its touch cue.", sequence: 0 });
  const lastCue = useRef(0);
  const index = STUDIES.findIndex(s => s.id === id);
  const study = STUDIES[index];
  const haptic = HAPTICS[pulse.kind];
  const speed = slow ? 2.5 : 1;

  useEffect(() => {
    function readHash() {
      const match = STUDIES.find(s => s.id === window.location.hash.slice(1));
      if (match) setId(match.id);
    }
    readHash(); window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  const cue = useCallback((kind: Haptic, event: string) => {
    // A visual annotation, never browser vibration. Native adapters use the same event boundary.
    const now = performance.now();
    if (kind === "selection" && now - lastCue.current < 80) return;
    if (kind === "selection") lastCue.current = now;
    setPulse(p => ({ kind, event, sequence: p.sequence + 1 }));
  }, []);

  function select(next: StudyId) {
    setId(next); setReset(0); lastCue.current = 0;
    setPulse(p => ({ kind: "none", event: "Interact with the demo to see its touch cue.", sequence: p.sequence + 1 }));
    window.history.replaceState(null, "", `#${next}`);
  }

  return <main className="smoothness-lab" data-reduced={reduced}>
    <header className="sl-header"><Link href="/today" className="sl-brand">OVERTAEK<span>Motion & touch</span></Link><Link href="/design">All design studies ↗</Link></header>
    <section className="sl-intro"><p className="sl-eyebrow">Interaction study · 18 opportunities</p><h1>Everything goes<br />somewhere.</h1><p>Pick a flow. Touch the components. Follow what stays, what moves, and what you would feel.</p><p className="sl-muted">Lightweight fictional scenes. Haptics are visual annotations, not device vibration. No account, tracker or competition writes.</p></section>
    <div className="sl-controls"><label><input type="checkbox" checked={reduced} disabled={Boolean(systemReduce)} onChange={e => setReduce(e.target.checked)} /> Reduced motion{systemReduce ? " · system preference" : ""}</label><label><input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)} /> Slow motion</label><button type="button" className="sl-text-button" onClick={() => { setReset(n => n + 1); lastCue.current = 0; setPulse(p => ({ kind: "none", event: "Demo reset.", sequence: p.sequence + 1 })); }}>Reset this demo ↻</button></div>
    <div className="sl-study-layout">
      <nav className="sl-index" aria-label="Motion opportunities">{STUDIES.map((s, i) => <button key={s.id} type="button" aria-current={s.id === id ? "true" : undefined} onClick={() => select(s.id)}><span className="sl-index-number">{String(i + 1).padStart(2, "0")}</span><span>{s.title}<small>{s.area}</small></span>{s.id === id && <span aria-hidden="true">↗</span>}</button>)}</nav>
      <section className="sl-workspace" aria-labelledby="sl-study-title">
        <div className="sl-study-heading"><div><p className="sl-eyebrow">{String(index + 1).padStart(2, "0")} / 18 · {study.area}</p><h2 id="sl-study-title">{study.title}</h2></div><div className="sl-paging"><button type="button" aria-label="Previous opportunity" disabled={index === 0} onClick={() => select(STUDIES[index - 1].id)}>←</button><button type="button" aria-label="Next opportunity" disabled={index === STUDIES.length - 1} onClick={() => select(STUDIES[index + 1].id)}>→</button></div></div>
        <p className="sl-instruction">{study.action}</p>
        <MotionConfig reducedMotion={reduced ? "always" : "never"} transition={{ duration: reduced ? 0 : .32 * speed, ease: [.22, 1, .36, 1] }}>
          <LayoutGroup id={`${id}-${reset}`}><div key={`${id}-${reset}`} className={`sl-stage sl-stage-${id}`} data-testid="motion-stage"><Demo id={id} cue={cue} reduced={reduced} speed={speed} /></div></LayoutGroup>
          <section className="sl-touch-monitor" aria-label="Visual haptic cue"><div className="sl-touch-heading"><span className="sl-eyebrow">Mobile touch cue · visual only</span><span className="sl-cue-name">{pulse.kind === "none" ? "Silent" : pulse.kind}</span></div><div className="sl-touch-event"><div className="sl-beats" aria-hidden="true" key={pulse.sequence}>{haptic.beats.length ? haptic.beats.map((size, i) => <motion.i key={i} style={{ height: 6 + size * 4 }} initial={{ opacity: .25, scaleY: 1 }} animate={{ opacity: 1, scaleY: reduced ? 1 : [1, 1.7, 1] }} transition={{ duration: reduced ? 0 : .3, delay: reduced ? 0 : i * .09 }} />) : <span>—</span>}</div><p aria-live="polite">{pulse.event}</p></div><p className="sl-muted">{haptic.feel}</p></section>
        </MotionConfig>
        <div className="sl-review-notes"><section><p className="sl-eyebrow">The movement</p><p>{study.motion}</p><code>{study.recipe}</code></section><section><p className="sl-eyebrow">The mobile feel</p><p>{study.haptics}</p><details><summary>Native haptic mapping</summary>{study.cues.map(kind => <p key={kind}><b>{kind}</b><code>{HAPTICS[kind].api}</code></p>)}<p className="sl-muted">Proposed Expo Haptics mapping. Respect user/system haptic settings; avoid duplicate cues from native controls. Device tuning is required.</p></details></section></div>
      </section>
    </div>
    <footer className="sl-footer">Motion preserves identity. Touch confirms intent. Passive updates stay quiet.<br /><Link href="/ux#awards" onClick={() => select("awards")}>Jump to medals ↗</Link></footer>
  </main>;
}
