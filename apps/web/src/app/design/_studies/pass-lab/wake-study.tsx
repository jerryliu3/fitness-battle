import { useState } from "react";
import { finalistSpec } from "./afterimage-finalists";
import { RefinementIcon } from "./refinement-art";

export const WAKE_CONCEPTS = [
  { id: "stretched", name: "Long stride", line: "Four echoes stretched over the longer wake. More air between rings makes the extra speed explicit." },
  { id: "balanced", name: "Shared start", line: "Six echoes carry the gold wake back to silver’s endpoint. A fuller history with spacing close to the selected mark." },
  { id: "dense", name: "Long exposure", line: "Eight echoes create a continuous contour. Strongest sense of accumulated motion, with more visual texture at small sizes." },
] as const;
export const wakeSpec = () => finalistSpec("circle-outline", "rich-gold-silver", "white", "subtle");
type Wake = typeof WAKE_CONCEPTS[number]["id"];
type Props = { player: { progress: number; reduced: boolean; playing: boolean; replay: () => void; setPlaying: (v: boolean) => void; seek: (v: number) => void }; flow: boolean; flowRequested: boolean; setFlow: (v: boolean) => void };

function download(svg: SVGSVGElement | null, id: string) {
  if (!svg) return;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("width", "1024"); copy.setAttribute("height", "1024");
  copy.querySelector("g[clip-path]")?.removeAttribute("clip-path");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
  const link = document.createElement("a"); link.href = url; link.download = `${id}-1024.svg`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function WakeStudy({ player, flow, flowRequested, setFlow }: Props) {
  const [selected, setSelected] = useState<Wake>("balanced");
  const spec = wakeSpec();
  return <section className="pass-round">
    <div className="pass-section-intro"><div><p className="pass-eyebrow">SELECTED / SHARED START</p><h2>Further ahead.<br />The same starting point.</h2></div><p>Rich gold and silver, hollow circles, white. Gold’s afterimage now extends to the bottom of silver’s afterimage. Shared Start, with six gold echoes, is now the finalized app icon. The four- and eight-echo alternatives remain here for comparison.</p></div>
    <div className="pass-ref-grid wake-study-grid">
      <article className="pass-ref-card"><div className="pass-ref-icon"><RefinementIcon spec={spec} size={224} /></div><span className="pass-eyebrow">EARLIER / REFERENCE</span><h3>Original wake</h3><p>Four echoes per racer. Gold’s wake ends higher; this was the previous production mark.</p><div className="pass-ref-small">{[48,24,16].map(size => <RefinementIcon key={size} spec={spec} size={size}/>)}<span>48 / 24 / 16 px</span></div></article>
      {WAKE_CONCEPTS.map(c => <article key={c.id} className={`pass-ref-card ${selected === c.id ? "is-selected" : ""}`}><div className="pass-ref-icon"><RefinementIcon spec={spec} size={224} wake={c.id}/></div><span className="pass-eyebrow">{c.id === "balanced" ? "SELECTED / " : "ALTERNATIVE / "}{c.id === "stretched" ? "04" : c.id === "balanced" ? "06" : "08"} GOLD ECHOES</span><h3>{c.name}</h3><p>{c.line}</p><div className="pass-ref-small">{[48,24,16].map(size => <RefinementIcon key={size} spec={spec} size={size} wake={c.id}/>)}<span>48 / 24 / 16 px</span></div><div className="pass-ref-actions"><button aria-pressed={selected === c.id} onClick={() => setSelected(c.id)}>{selected === c.id ? "Previewing ✓" : "Preview movement"}</button><button onClick={e=>download(e.currentTarget.closest("article")?.querySelector("svg") ?? null,c.id)}>Export SVG ↗</button></div></article>)}
    </div>
    <div className="pass-ref-heading"><div><span className="pass-eyebrow">MOVEMENT / HOLD OR SCRUB</span><h3>A longer wake as gold pulls ahead.</h3></div><p>The silver racer stays fixed. Gold starts just behind, passes, and keeps a shared trail endpoint throughout. Flow runs backward even while positions are held. Static cards above show the final pose.</p></div>
    <div className="pass-round-controls"><label className="pass-check"><input type="checkbox" checked={flowRequested} disabled={player.reduced} onChange={e=>setFlow(e.target.checked)}/> Flowing trails</label><button className="pass-button" disabled={player.reduced} onClick={player.replay}>↗ Replay the pass</button><button className="pass-button pass-button-light" onClick={()=>player.setPlaying(false)}>Ⅱ Hold positions still</button><label className="pass-round-slider">Pass progress <span>{Math.round(player.progress*100)}%</span><input aria-label="Long wake pass progress" type="range" min="0" max="1" step=".001" value={player.progress} onChange={e=>{player.setPlaying(false);player.seek(Number(e.target.value));}}/></label></div>
    <p className="pass-round-status">{player.reduced ? "Reduced motion: static wakes and manual scrubbing." : `${player.playing ? "Pass playing" : "Positions held"} · ${flowRequested ? "wakes flowing" : "wakes paused"}`}</p>
    <div className="wake-study-motion"><RefinementIcon spec={spec} size={320} wake={selected} passProgress={player.progress} flow={flow}/><div><span className="pass-eyebrow">{WAKE_CONCEPTS.find(c=>c.id===selected)!.name}</span><h3>One endpoint. More distance covered.</h3><p>At the final pose, gold’s wake is about 60% longer than the original. Silver keeps its four echoes and slightly slower flow. The last static echo centers align; both wakes fade softly at their shared lower edge.</p><p>Compare the 16px samples before choosing: the long wake strengthens the story but adds detail.</p></div></div>
  </section>;
}
