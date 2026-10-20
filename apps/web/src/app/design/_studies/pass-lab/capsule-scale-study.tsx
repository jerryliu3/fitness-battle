import {useState} from "react";
import {FINISH_SELECTION,finishSpec} from "./finish-comparison";
import {downloadFinishIcon} from "./finish-round";
import {MaterialIcon} from "./material-art";
import {LanePhone} from "./lane-art";

export const CAPSULE_SCALES=[
  {id:"current",scale:1.35,name:"Current · 135%"},
  {id:"larger",scale:1.5,name:"Larger · 150%"},
  {id:"midpoint",scale:1.625,name:"In between · 162.5%"},
  {id:"big",scale:1.75,name:"Big · 175%"},
  {id:"maximum",scale:2,name:"Maximum · 200%"},
] as const;
export const CAPSULE_WAKES=[
  {id:"original",name:"Original wake",line:"The original longer wake. Larger capsules crop more of its fading steps."},
  {id:"four",name:"4 fading echoes",line:"Four closer echoes on each path, with the final fade just inside the tile."},
  {id:"five",name:"5 fading echoes",line:"Five closer echoes on each path. A denser, more gradual fade to compare."},
] as const;
export type CapsuleWake=typeof CAPSULE_WAKES[number]["id"];
export function selectedCapsule(wake:CapsuleWake="original",scale=1.35){
  const concept=finishSpec(FINISH_SELECTION.id,"pill");
  if(wake==="original"||!("glass" in concept))return concept;
  // Both final echo bottoms reach y=248. Fit the wake in the available space,
  // independently of head scale, while retaining the aligned shared endpoint.
  const count=wake==="four"?4:5;
  const wakeProfile={goldCount:count,silverCount:count,goldLength:(248-93)/scale-29,silverLength:(248-145)/scale-29};
  return {...concept,glass:{...concept.glass,wakeProfile}};
}
type Props={player:{progress:number;playing:boolean;reduced:boolean;replay:()=>void;setPlaying:(v:boolean)=>void;seek:(v:number)=>void};flow:boolean;flowRequested:boolean;setFlow:(v:boolean)=>void};

export function CapsuleScaleStudy({player,flow,flowRequested,setFlow}:Props){
  const [dark,setDark]=useState(false),[centers,setCenters]=useState(false);
  const [scale,setScale]=useState<number>(1.75),[wake,setWake]=useState<CapsuleWake>("five");
  const concept=selectedCapsule(wake,scale);
  const exportIcon=(svg:SVGSVGElement|null,value:number)=>{
    const clean=svg?.cloneNode(true) as SVGSVGElement|undefined;
    clean?.querySelector('[data-center-guides]')?.remove();
    downloadFinishIcon(clean??null,`polished-glass-80pct-solar-cool-${value*100}pct-${wake}-${dark?"black":"white"}`);
  };
  return <section className="pass-round mat-round capsule-scale-round">
    <div className="pass-section-intro"><div><p className="pass-eyebrow">MATERIAL LOCKED / SIZE + WAKE EXPERIMENT</p><h2>A larger capsule.<br/>More of the fade.</h2></div><p>Polished glass · 80% alpha · Solar Gold + Cool Platinum. Compare the original wake with four or five closer afterimages that fit inside the icon. Try 162.5% or 175%. Each capsule stays centered in the same place; the material and colors stay locked.</p></div>
    <div className="mat-toolbar"><fieldset><legend>Backdrop</legend><button aria-pressed={!dark} onClick={()=>setDark(false)}>White</button><button aria-pressed={dark} onClick={()=>setDark(true)}>Black</button></fieldset><fieldset><legend>Afterimage experiment</legend>{CAPSULE_WAKES.map(w=><button key={w.id} aria-pressed={wake===w.id} onClick={()=>setWake(w.id)}>{w.name}</button>)}</fieldset><label className="pass-check"><input type="checkbox" checked={centers} onChange={e=>setCenters(e.target.checked)}/> Show fixed centers</label><a href="#capsule-scale-field">Compare in the field ↓</a></div>
    <p className="pass-round-status">{CAPSULE_WAKES.find(w=>w.id===wake)!.line} This is an experiment; Original wake is always available for comparison.</p>
    <div className="finish-capsule-grid">{CAPSULE_SCALES.map(s=><article key={s.id} className={`mat-card ${scale===s.scale?"is-selected":""}`}>
      <div className={`finish-tile ${dark?"is-dark":""}`}><MaterialIcon concept={selectedCapsule(wake,s.scale)} objectScale={s.scale} showCenters={centers} dark={dark}/></div>
      <div className="mat-card-copy"><span className="pass-eyebrow">{Math.round(40*s.scale)} × {Math.round(58*s.scale)} CAPSULE · {Math.round((s.scale/1.35-1)*100)}% LARGER THAN CURRENT</span><h3>{s.name}</h3><p>Both head centers stay at (74, 145) and (182, 93). Clear horizontal gap: {108-40*s.scale} units.</p><div className="mat-small">{[64,32,16].map(size=><MaterialIcon key={size} concept={selectedCapsule(wake,s.scale)} objectScale={s.scale} dark={dark} size={size}/>)}<span>64 / 32 / 16 px</span></div><div className="mat-card-actions"><button aria-pressed={scale===s.scale} onClick={()=>setScale(s.scale)}>{scale===s.scale?"In the field ✓":"Compare in field"}</button><button onClick={e=>exportIcon(e.currentTarget.closest("article")?.querySelector("svg")??null,s.scale)}>SVG ↗</button></div></div>
    </article>)}</div>
    <section className="mat-inspect" id="capsule-scale-field"><div className="pass-ref-heading"><div><span className="pass-eyebrow">{scale*100}% / MATCHING ICON AND FIELD</span><h3>A larger capsule, in motion.</h3></div><p>Lane markers grow by the same relative amount. Their lane centers, distances and passing positions stay fixed. Larger edge markers may crop within the field viewport.</p></div>
      <div className="pass-round-controls"><label className="pass-check"><input type="checkbox" checked={flowRequested} disabled={player.reduced} onChange={e=>setFlow(e.target.checked)}/> Flowing trails</label><button className="pass-button" disabled={player.reduced} onClick={player.replay}>↗ Replay the pass</button><button className="pass-button pass-button-light" onClick={()=>player.setPlaying(false)}>Ⅱ Hold positions still</button><label className="pass-round-slider">Run progress <span>{Math.round(player.progress*100)}%</span><input aria-label="Capsule scale run progress" type="range" min="0" max="1" step=".001" value={player.progress} onChange={e=>{player.setPlaying(false);player.seek(Number(e.target.value));}}/></label></div>
      <p className="pass-round-status">{player.reduced?"Reduced motion: static wakes and manual scrubbing.":`${player.playing?"Pass playing":"Positions held"} · ${flowRequested?"wakes flowing":"wakes paused"}`}</p>
      <div className="mat-pair"><article className={`mat-master ${dark?"is-dark":""}`}><span className="pass-eyebrow">POLISHED GLASS · {scale*100}%</span><MaterialIcon concept={concept} objectScale={scale} showCenters={centers} dark={dark} size={320}/><p>80% face alpha. Solar Gold #ffc400 + Cool Platinum #c9d6e3. Shared satin wake.</p><button className="pass-button pass-button-light" onClick={e=>exportIcon(e.currentTarget.closest("article")?.querySelector("svg")??null,scale)}>Export static 1024px SVG ↗</button></article><LanePhone index={4} progress={player.progress} gain={2} material={concept} materialDark={dark} materialScale={scale/1.35} flow={flow}/></div>
    </section>
  </section>;
}
