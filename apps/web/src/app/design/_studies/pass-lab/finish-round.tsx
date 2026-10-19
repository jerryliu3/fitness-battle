import {useState} from "react";
import {FINISHES,finishSpec,type FinishId,type CompareShape} from "./finish-comparison";
import {GOLD_COLORS,SILVER_COLORS,DEFAULT_FINISH_PALETTE,type FinishPalette} from "./finish-colors";
import {UniformGlassHead} from "./glass-art";
import {MaterialIcon} from "./material-art";
import {LanePhone} from "./lane-art";

type Props={player:{progress:number;playing:boolean;reduced:boolean;replay:()=>void;setPlaying:(v:boolean)=>void;seek:(v:number)=>void};flow:boolean;flowRequested:boolean;setFlow:(v:boolean)=>void};
export function TransmissionCheck({opacity=.5,shape="pill",dark=false,palette=DEFAULT_FINISH_PALETTE}: {opacity?:number;shape?:CompareShape;dark?:boolean;palette?:FinishPalette}){
  const spec=finishSpec("tinted",shape,opacity,palette);if(!("glass" in spec))return null;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 175" width="300" height="175" role="img" aria-label={`Gold and silver both ${Math.round(opacity*100)} percent opacity over the same contrasting backdrop`}>
    <rect width="300" height="175" rx="14" fill={dark?"#000":"#fff"}/><path d="M15 84H285" stroke={dark?"#d8e2e8":"#526575"} strokeWidth="24"/><path d="M15 60H285M15 108H285" stroke={dark?"#56616a":"#e4e9eb"} strokeWidth="12"/>
    <g transform="translate(85 84) scale(1.1)"><UniformGlassHead concept={spec} fast={false}/></g><g transform="translate(215 84) scale(1.1)"><UniformGlassHead concept={spec} fast light={0}/></g>
    <g fill={dark?"#e5ebed":"#4b5655"} textAnchor="middle" fontSize="10" fontFamily="sans-serif"><text x="85" y="149">SILVER · {Math.round(opacity*100)}%</text><text x="215" y="149">GOLD · {Math.round(opacity*100)}%</text></g>
  </svg>;
}
function download(svg:SVGSVGElement|null,id:string){
  if(!svg)return;const copy=svg.cloneNode(true) as SVGSVGElement;copy.setAttribute("width","1024");copy.setAttribute("height","1024");
  copy.querySelector("g[clip-path]")?.removeAttribute("clip-path");
  // Keep the wake exclusion clips: only the outer display mask is removed.
  copy.querySelectorAll(".pass-flow-echo").forEach(n=>n.removeAttribute("class"));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:"image/svg+xml"}));const a=document.createElement("a");a.href=url;a.download=`shared-start-${id}-1024.svg`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function FinishRound({player,flow,flowRequested,setFlow}:Props){
  const [finish,setFinish]=useState<FinishId>("tinted"),[opacity,setOpacity]=useState(.5),[dark,setDark]=useState(false);
  const [goldId,setGoldId]=useState<string>(GOLD_COLORS[0].id),[silverId,setSilverId]=useState<string>(SILVER_COLORS[0].id);
  const gold=GOLD_COLORS.find(c=>c.id===goldId)!,silver=SILVER_COLORS.find(c=>c.id===silverId)!;
  const palette={gold:gold.hex,silver:silver.hex},spec=finishSpec(finish,"pill",opacity,palette);
  const exportId=(id:FinishId)=>`${id}-capsule-${goldId}-${silverId}-${["tinted","rolled","bevel","meniscus"].includes(id)?Math.round(opacity*100)+"pct-":""}${dark?"black":"white"}`;
  return <section className="pass-round mat-round finish-round">
    <div className="pass-section-intro"><div><p className="pass-eyebrow">CAPSULE LOCKED / SEVEN FINISHES · 100 COLOR PAIRS</p><h2>One shape.<br/>Find its colors.</h2></div><p>The standard 40 × 58 capsule is locked for this review. Compare all seven finishes with independent gold and silver/platinum colors. Uniform glass offers 26%, 38% and 50% opacity. Every finish uses the same satin-glass wake. Its exclusion mask follows the rounded capsule, both still and moving.</p></div>
    <div className="mat-toolbar"><fieldset><legend>Backdrop</legend><button aria-pressed={!dark} onClick={()=>setDark(false)}>White</button><button aria-pressed={dark} onClick={()=>setDark(true)}>Black</button></fieldset><fieldset><legend>Uniform glass opacity · both racers</legend>{[.26,.38,.5].map(v=><button key={v} aria-pressed={opacity===v} onClick={()=>setOpacity(v)}>{Math.round(v*100)}%</button>)}</fieldset><span>Opacity presets affect uniform glass. All finishes share the selected color pair.</span><a href="#finish-field">Jump to matching field ↓</a></div>
    <section className="finish-palette" aria-label="Independent capsule colors">
      <fieldset><legend>Gold · leading racer <small>{gold.name} · {gold.hex}</small></legend><div className="finish-swatches">{GOLD_COLORS.map(c=><button key={c.id} aria-label={`Gold: ${c.name}`} aria-pressed={goldId===c.id} onClick={()=>setGoldId(c.id)}><i style={{background:c.hex}}/><span>{c.name}</span><small>{c.hex}</small></button>)}</div></fieldset>
      <fieldset><legend>Silver / platinum · rival <small>{silver.name} · {silver.hex}</small></legend><div className="finish-swatches">{SILVER_COLORS.map(c=><button key={c.id} aria-label={`Silver: ${c.name}`} aria-pressed={silverId===c.id} onClick={()=>setSilverId(c.id)}><i style={{background:c.hex}}/><span>{c.name}</span><small>{c.hex}</small></button>)}</div></fieldset>
      <p>Swatches show the base colors. Materials and opacity change their appearance in the icon. Try Solar Gold with Bright Platinum for a brighter pairing.</p><button className="pass-button pass-button-light" onClick={()=>{setGoldId("rich");setSilverId("silver");}}>Reset colors</button>
    </section>
    <div className="finish-capsule-grid">{FINISHES.map(f=>{const c=finishSpec(f.id,"pill",opacity,palette);return <article key={f.id} className={`mat-card ${finish===f.id?"is-selected":""}`}>
      <div className={`finish-tile ${dark?"is-dark":""}`}><MaterialIcon concept={c} dark={dark} size={256}/></div>
      <div className="mat-card-copy"><span className="pass-eyebrow">CAPSULE / {["tinted","rolled","bevel","meniscus"].includes(f.id)?`${Math.round(opacity*100)}% ALPHA`:f.source}</span><h3>{f.name}</h3><p>{f.line}</p><div className="mat-small">{[64,32,16].map(size=><MaterialIcon key={size} concept={c} dark={dark} size={size}/>)}<span>64 / 32 / 16 px</span></div><div className="mat-card-actions"><button aria-pressed={finish===f.id} onClick={()=>setFinish(f.id)}>{finish===f.id?"In the field ✓":"Compare in field"}</button><button onClick={e=>download(e.currentTarget.closest("article")?.querySelector("svg")??null,exportId(f.id))}>SVG ↗</button></div></div>
    </article>;})}</div>
    <div className="finish-check"><div><span className="pass-eyebrow">TRANSMISSION CHECK / UNIFORM GLASS</span><h3>Same opacity.<br/>Your chosen colors.</h3><p>Both faces use exactly {Math.round(opacity*100)}% alpha. The same contrasting bands sit behind them here; those bands are an inspection backdrop and never appear in icon exports. Wakes are excluded from the live capsule, so they cannot darken its interior.</p><p>From the flattened reference, the stronger colored pieces look roughly 60–80% opaque to me. That is a visual estimate; the original alpha cannot be recovered reliably from a screenshot. These 26–50% options explore the lighter treatment you prefer.</p></div><TransmissionCheck opacity={opacity} dark={dark} palette={palette}/></div>
    <section className="mat-inspect" id="finish-field"><div className="pass-ref-heading"><div><span className="pass-eyebrow">SELECTED / {FINISHES.find(f=>f.id===finish)!.name}</span><h3>The capsule, in the field.</h3></div><p>{gold.name} + {silver.name}. The same shape, colors and wake exclusion carry through to the athlete markers.</p></div>
      <div className="pass-round-controls"><label className="pass-check"><input type="checkbox" checked={flowRequested} disabled={player.reduced} onChange={e=>setFlow(e.target.checked)}/> Flowing trails</label><button className="pass-button" disabled={player.reduced} onClick={player.replay}>↗ Replay the pass</button><button className="pass-button pass-button-light" onClick={()=>player.setPlaying(false)}>Ⅱ Hold positions still</button><label className="pass-round-slider">Run progress <span>{Math.round(player.progress*100)}%</span><input aria-label="Finish run progress" type="range" min="0" max="1" step=".001" value={player.progress} onChange={e=>{player.setPlaying(false);player.seek(Number(e.target.value));}}/></label></div><p className="pass-round-status">{player.reduced?"Reduced motion: static wakes and manual scrubbing.":`${player.playing?"Pass playing":"Positions held"} · ${flowRequested?"wakes flowing":"wakes paused"}`}</p>
      <div className="mat-pair"><article className={`mat-master ${dark?"is-dark":""}`}><span className="pass-eyebrow">{spec.name}</span><MaterialIcon concept={spec} dark={dark} size={320}/><p>{["tinted","rolled","bevel","meniscus"].includes(finish)?`${Math.round(opacity*100)}% opacity for both colors. An even translucent face with boundary-only lighting.`:finish==="amber"?"The original Amber Capsule tinted glass, with your selected colors.":finish==="satin"?"The softly diffused Frosted Pebble finish on the locked capsule.":"The opaque enamel and porcelain highlights of Glazed Ceramic on the locked capsule."}</p><button className="pass-button pass-button-light" onClick={e=>download(e.currentTarget.closest("article")?.querySelector("svg")??null,exportId(finish))}>Export static 1024px SVG ↗</button></article><LanePhone index={4} progress={player.progress} gain={2} flow={flow} material={spec} materialDark={dark}/></div>
    </section>
  </section>;
}
