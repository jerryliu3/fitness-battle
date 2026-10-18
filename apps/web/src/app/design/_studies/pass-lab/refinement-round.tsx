import { useRef, useState } from "react";
import { LanePhone } from "./lane-art";
import { RefinementIcon } from "./refinement-art";
import { REFINEMENTS, TWIN_REFINEMENT, type RefinedSpec } from "./refinements";

type Player = { progress: number; playing: boolean; reduced: boolean; replay: () => void; setPlaying: (v: boolean) => void; seek: (v: number) => void };
type Props = { player: Player; flow: boolean; flowRequested: boolean; setFlow: (v: boolean) => void; gain: number; setGain: (v: number) => void };

export function RefinementRound({ player, flow, flowRequested, setFlow, gain, setGain }: Props) {
  const [afterimage, setAfterimage] = useState("echo-gold-light");
  const [track, setTrack] = useState("track-echo-light");
  const [twinDark, setTwinDark] = useState(false);
  const [notice, setNotice] = useState("");
  const fields = useRef<HTMLElement>(null);
  const after = REFINEMENTS.find(s => s.id === afterimage)!;
  const open = REFINEMENTS.find(s => s.id === track)!;
  const twin = { ...TWIN_REFINEMENT, dark: twinDark };

  function choose(spec: RefinedSpec) {
    if (spec.family === "afterimage") setAfterimage(spec.id); else setTrack(spec.id);
    setNotice(`${spec.name} is now paired with its lane below.`);
  }
  function download(spec: RefinedSpec, source: SVGSVGElement | null) {
    if (!source) return;
    const svg = source.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("width", "1024"); svg.setAttribute("height", "1024");
    svg.querySelector("g[clip-path]")?.removeAttribute("clip-path");
    // Store artwork is a still frame. A moving wake is only for in-app/web previews.
    svg.querySelectorAll(".pass-flow-echo,.pass-flow-line").forEach(node => node.removeAttribute("class"));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    const a = document.createElement("a"); a.href = url; a.download = `overtaek-${spec.id}-1024.svg`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function card(spec: RefinedSpec, i: number) {
    const selected = spec.id === afterimage || spec.id === track;
    return <article className={`pass-ref-card ${selected ? "is-selected" : ""}`} key={spec.id}>
      <div className="pass-ref-meta"><span>{spec.family === "afterimage" ? "A" : "O"}{String(i + 1).padStart(2, "0")}</span><span>{spec.dark ? "CHARCOAL" : "DAYLIGHT"}</span></div>
      <div className="pass-ref-icon"><RefinementIcon spec={spec} size={176} /></div>
      <h3>{spec.name}</h3><p>{spec.note}</p>
      <div className="pass-ref-small"><RefinementIcon spec={spec} size={48} /><RefinementIcon spec={spec} size={24} /><RefinementIcon spec={spec} size={16} /><span>48 / 24 / 16 px</span></div>
      <div className="pass-ref-actions"><button aria-pressed={selected} onClick={() => choose(spec)}>{selected ? "Paired with field ✓" : "Pair with field ↓"}</button><button aria-label={`Export ${spec.name} SVG`} onClick={e => download(spec, e.currentTarget.closest("article")?.querySelector("svg") ?? null)}>SVG ↗</button></div>
    </article>;
  }
  return <section className="pass-round">
    <div className="pass-section-intro"><div><p className="pass-eyebrow">ROUND 2 / THREE DIRECTIONS, ONE MATCHING IDENTITY</p><h2>A wake you can feel.</h2></div><p>Afterimage and Open Track, refined around your feedback. Every variation below uses the same racer geometry in its icon and its lane. Twin trails stays in the movement comparison.</p></div>
    <div className="pass-round-summary"><span><b>08</b> Afterimage variations</span><span><b>04</b> Open Track variations</span><span><b>03</b> Moving fields</span><a href="#pass-round-fields">Jump to movement lab ↓</a></div>
    <div className="pass-ref-heading"><div><span className="pass-eyebrow">A / AFTERIMAGE</span><h3>Different speeds. Different wakes.</h3></div><p>Tight echoes mean slower motion. Wider spacing and a longer wake mean faster motion. The gold and Ember options share that same principle.</p></div>
    <div className="pass-ref-grid">{REFINEMENTS.filter(s => s.family === "afterimage").map(card)}</div>
    <div className="pass-ref-heading"><div><span className="pass-eyebrow">O / OPEN TRACK</span><h3>Leave the track open.</h3></div><p>All four lose the bottom border. Compare clean, solid tokens with flowing contour wakes, in daylight and charcoal.</p></div>
    <div className="pass-ref-grid">{REFINEMENTS.filter(s => s.family === "open-track").map(card)}</div>

    <section id="pass-round-fields" ref={fields} className="pass-round-fields">
      <div className="pass-section-intro"><div><p className="pass-eyebrow">MOVEMENT LAB / SAME MARK, SAME FIELD</p><h2>Hold the field.<br />Watch the wake.</h2></div><p>Trails stream downward even while positions and distances stay still. Play the pass separately to add the lead change. These are fictional movement cues, not a live activity feed.</p></div>
      <div className="pass-round-controls">
        <label className="pass-check"><input type="checkbox" checked={flowRequested} disabled={player.reduced} onChange={e => setFlow(e.target.checked)} /> Flowing trails</label>
        <button className="pass-button" disabled={player.reduced} onClick={player.replay}>↗ Replay the pass</button>
        <button className="pass-button pass-button-light" onClick={() => player.setPlaying(false)}>Ⅱ Hold positions still</button>
        <label>Run<select aria-label="Refinement sample run" value={gain} onChange={e => { setGain(Number(e.target.value)); player.setPlaying(false); player.seek(0); }}><option value="0.8">+0.8 km · no pass</option><option value="2">+2.0 km · one pass</option><option value="4.2">+4.2 km · two passes</option></select></label>
        <label className="pass-round-slider">Run progress <span>{Math.round(player.progress * 100)}%</span><input aria-label="Refinement run progress" type="range" min="0" max="1" step=".001" value={player.progress} onChange={e => { player.setPlaying(false); player.seek(Number(e.target.value)); }} /></label>
      </div>
      <p className="pass-round-status" role="status">{player.reduced ? "Reduced motion is on: static trails and manual run scrubbing remain available." : `${player.playing ? "Pass playing" : "Positions held"} · ${flowRequested ? "trails flowing independently" : "trails paused"}. Fast wakes travel downward faster; dense rival wakes move more slowly.`}</p>
      <div className="pass-paired-grid">
        {([{ name: "Twin trails", spec: twin, index: 0 }, { name: "Afterimage", spec: after, index: 4 }, { name: "Open Track", spec: open, index: 6 }]).map(({ name, spec, index }) => <article className="pass-paired-card" key={name}>
          <div className="pass-paired-top"><RefinementIcon spec={spec} size={80} flow={flow} /><div><span className="pass-eyebrow">ICON ↔ FIELD</span><h3>{name}</h3><small>{spec.name}</small></div></div>
          {index === 0 ? <label className="pass-paired-select">Treatment<select value={twinDark ? "dark" : "light"} onChange={e => setTwinDark(e.target.value === "dark")}><option value="light">Gold / daylight</option><option value="dark">Gold / after dark</option></select></label> : <label className="pass-paired-select">Variation<select aria-label={`${name} field variation`} value={spec.id} onChange={e => index === 4 ? setAfterimage(e.target.value) : setTrack(e.target.value)}>{REFINEMENTS.filter(s => s.family === spec.family).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
          <LanePhone index={index} progress={player.progress} gain={gain} refinement={spec} flow={flow} />
          <p>{spec.family === "twin-trails" ? "A steady line with a downward-running pulse." : spec.family === "afterimage" ? "The exact icon contours peel away behind each token." : spec.echoes ? "Open lane rules stay fixed while contour wakes flow backward." : "The clean icon stays trail-free. Add afterimage in the selector to compare a flowing wake."}</p>
        </article>)}
      </div>
      <div className="pass-contract"><span>READING THE MOTION</span><p>Heads move up during a pass. Wakes always travel down behind them. A denser, shorter rival wake moves more slowly; the longer, more open wake belongs to you. Out-of-window markers remain honest arrows, and past you stays unranked.</p></div>
    </section>
    <p className="pass-ref-notice" role="status">{notice || "Choose any variation to pair it with its matching field below. App icon artwork remains a still image."}</p>
  </section>;
}
