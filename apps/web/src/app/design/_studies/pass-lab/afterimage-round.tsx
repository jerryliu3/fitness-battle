import { useState } from "react";
import { AFTERIMAGE_SELECTION, FINALIST_SHAPES, FINALIST_PALETTES, FINALIST_BACKGROUNDS, finalistSpec, type FinalistShape, type FinalistBackground } from "./afterimage-finalists";
import { RefinementIcon } from "./refinement-art";
import { LanePhone } from "./lane-art";

type Player = { progress: number; playing: boolean; reduced: boolean; replay: () => void; setPlaying: (v: boolean) => void; seek: (v: number) => void };
type Props = { player: Player; flow: boolean; flowRequested: boolean; setFlow: (v: boolean) => void; gain: number; setGain: (v: number) => void };

export function AfterimageRound({ player, flow, flowRequested, setFlow, gain, setGain }: Props) {
  const [shape, setShape] = useState<FinalistShape>(AFTERIMAGE_SELECTION.shape);
  const [palette, setPalette] = useState<string>(AFTERIMAGE_SELECTION.palette);
  const [background, setBackground] = useState<FinalistBackground>(AFTERIMAGE_SELECTION.background);
  const [trail, setTrail] = useState<"equal" | "subtle">(AFTERIMAGE_SELECTION.trail);
  const [notice, setNotice] = useState("");
  const spec = finalistSpec(shape, palette, background, trail);
  function exportIcon(svg: SVGSVGElement | null) {
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("width", "1024"); copy.setAttribute("height", "1024");
    copy.querySelector("g[clip-path]")?.removeAttribute("clip-path");
    copy.querySelectorAll(".pass-flow-echo").forEach(n => n.removeAttribute("class"));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
    const link = document.createElement("a"); link.href = url; link.download = `${spec.id}-1024.svg`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setNotice("Static 1024 px SVG exported, with no baked-in rounded mask.");
  }
  return <section className="pass-round pass-finalists">
    <div className="pass-section-intro"><div><p className="pass-eyebrow">ARCHIVE / HOLLOW AFTERIMAGE</p><h2>A little ahead.<br />A clear identity.</h2></div><p>Earlier shape, color and short-wake comparisons. Shared Start is now the selected production icon; open the Shared Start tab for its six-echo gold wake. These controls remain available as design history.</p></div>
    <div className="pass-round-summary"><span><b>04</b> Head studies</span><span><b>{FINALIST_PALETTES.length * FINALIST_BACKGROUNDS.length}</b> Color studies</span><span><b>02</b> Wake rhythms</span><a href="#pass-finalist-preview">Jump to matching field ↓</a></div>

    <div className="pass-ref-heading"><div><span className="pass-eyebrow">01 / HOLLOW, SOLID OR EMBER</span><h3>Change the head. Keep the wake.</h3></div><p>All four use the selected palette, background and trail rhythm. Filled Ember always has the canonical face; outline echoes stay face-free.</p></div>
    <div className="pass-ref-grid pass-shape-grid">{FINALIST_SHAPES.map(s => <article key={s.id} className={`pass-ref-card ${shape === s.id ? "is-selected" : ""}`}>
      <div className="pass-ref-icon"><RefinementIcon spec={finalistSpec(s.id, palette, background, trail)} size={176} /></div>
      <h3>{s.name}</h3><p>{s.line}</p>
      <div className="pass-ref-small">{[48, 24, 16].map(size => <RefinementIcon key={size} spec={finalistSpec(s.id, palette, background, trail)} size={size} />)}<span>48 / 24 / 16 px</span></div>
      <div className="pass-ref-actions"><button aria-pressed={shape === s.id} onClick={() => setShape(s.id)}>{shape === s.id ? "Selected ✓" : `Use ${s.name.toLowerCase()}`}</button></div>
    </article>)}</div>

    <div className="pass-ref-heading"><div><span className="pass-eyebrow">02 / YELLOW ALWAYS HAS A PLACE</span><h3>Color changes the feeling.</h3></div><p>Each row keeps the pair fixed across white, grey and black. The leading racer stays yellow or gold, including a tonal yellow-on-gold option. Click any tile to preview it.</p></div>
    <div className="pass-color-head"><span>PAIRING</span>{FINALIST_BACKGROUNDS.map(b => <b key={b.id}>{b.name}</b>)}</div>
    <div className="pass-color-matrix">{FINALIST_PALETTES.map(p => <div className="pass-color-row" key={p.id}>
      <div className="pass-color-label"><span>{p.tag}</span><h4>{p.name}</h4><small><i style={{ background: p.main }} />{p.main}<br /><i style={{ background: p.peer }} />{p.peer}</small></div>
      {FINALIST_BACKGROUNDS.map(b => <button key={b.id} className={`pass-color-tile ${palette === p.id && background === b.id ? "is-selected" : ""}`} aria-label={`Preview ${p.name} on ${b.name.toLowerCase()}`} aria-pressed={palette === p.id && background === b.id} onClick={() => { setPalette(p.id); setBackground(b.id); }}><RefinementIcon spec={finalistSpec(shape, p.id, b.id, trail)} size={152} /><span>{b.name}{palette === p.id && background === b.id ? " · Selected ✓" : ""}</span></button>)}
    </div>)}</div>

    <div className="pass-ref-heading"><div><span className="pass-eyebrow">03 / MUCH CLOSER IN PACE</span><h3>Two wakes. A small difference.</h3></div><p>The dense, much slower rival wake from Round 2 is gone here. Both options have four echoes per racer; only length and flow rate change.</p></div>
    <div className="pass-wake-grid">{(["equal", "subtle"] as const).map(mode => <article key={mode} className={`pass-wake-card ${trail === mode ? "is-selected" : ""}`}>
      <RefinementIcon spec={finalistSpec(shape, palette, background, mode)} size={200} flow={flow} />
      <div><span className="pass-eyebrow">{mode === "equal" ? "SAME RHYTHM" : "A SMALL EDGE"}</span><h3>{mode === "equal" ? "Equal afterimages" : "Slightly slower rival"}</h3><p>{mode === "equal" ? "Same four echoes, same spacing, same flow speed. Only the stagger shows who is ahead." : "Both wakes stay long and open. The rival’s is about 11% shorter, with a roughly 22% slower downward flow."}</p><button className="pass-button pass-button-light" aria-pressed={trail === mode} onClick={() => setTrail(mode)}>{trail === mode ? "Selected ✓" : "Use this rhythm"}</button></div>
    </article>)}</div>

    <section className="pass-finalist-preview" id="pass-finalist-preview">
      <div className="pass-section-intro"><div><p className="pass-eyebrow">04 / YOUR CURRENT COMBINATION</p><h2>The icon and the field.<br />One Afterimage.</h2></div><p>Shape, palette and wake geometry come from the same renderer. Icon tiles stay still; movement previews let you hold positions and watch the wake.</p></div>
      <div className="pass-round-controls"><label className="pass-check"><input type="checkbox" checked={flowRequested} disabled={player.reduced} onChange={e => setFlow(e.target.checked)} /> Flowing trails</label><button className="pass-button" disabled={player.reduced} onClick={player.replay}>↗ Replay the pass</button><button className="pass-button pass-button-light" onClick={() => player.setPlaying(false)}>Ⅱ Hold positions still</button><label>Run<select aria-label="Finalist sample run" value={gain} onChange={e => { setGain(Number(e.target.value)); player.setPlaying(false); player.seek(0); }}><option value="0.8">+0.8 km · no pass</option><option value="2">+2.0 km · one pass</option><option value="4.2">+4.2 km · two passes</option></select></label><label className="pass-round-slider">Run progress <span>{Math.round(player.progress * 100)}%</span><input aria-label="Finalist run progress" type="range" min="0" max="1" step=".001" value={player.progress} onChange={e => { player.setPlaying(false); player.seek(Number(e.target.value)); }} /></label></div>
      <p className="pass-round-status">{player.reduced ? "Reduced motion: static wakes and manual scrubbing remain available." : `${player.playing ? "Pass playing" : "Positions held"} · ${flowRequested ? "wakes flowing" : "wakes paused"} · ${trail === "equal" ? "equal rhythm" : "subtle speed difference"}.`}</p>
      <div className="pass-finalist-pair"><article className="pass-finalist-master"><span className="pass-eyebrow">THE STATIC APP ICON</span><div className="pass-finalist-export"><RefinementIcon spec={spec} size={280} /></div><h3>{FINALIST_SHAPES.find(s => s.id === shape)!.name}</h3><p>{FINALIST_PALETTES.find(p => p.id === palette)!.name} · {background} · {trail === "equal" ? "equal wakes" : "slight speed difference"}</p><div className="pass-scale-row">{[60, 40, 24, 16].map(size => <div key={size}><RefinementIcon spec={spec} size={size} /><small>{size} px</small></div>)}</div><button className="pass-button" onClick={e => exportIcon(e.currentTarget.closest("article")?.querySelector(".pass-finalist-export svg") ?? null)}>Export 1024 px SVG ↗</button></article>
      <article className="pass-finalist-field"><div className="pass-paired-top"><RefinementIcon spec={spec} size={76} flow={flow} /><div><span className="pass-eyebrow">SAME CHARACTER / SAME WAKE</span><h3>Afterimage field</h3><small>{trail === "equal" ? "Equal rhythm" : "A small speed difference"}</small></div></div><LanePhone index={4} progress={player.progress} gain={gain} refinement={spec} flow={flow} /></article></div>
    </section>
    <p className="pass-ref-notice" role="status">{notice || "Shape, color and rhythm stay independent. Choose a color tile, then compare hollow, solid and Ember above."}</p>
  </section>;
}
