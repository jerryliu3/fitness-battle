"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EXPERIENCE_CONCEPTS, experienceConceptId, type ExperienceConceptId } from "@fitness-battle/shared";
import { AppHeading, typographyStyle } from "@/ui/section";
import { Ember } from "@/components/mascot/ember";
import styles from "./experience-lab.module.css";

function StoryArt({ flow, step, effort }: { flow: ExperienceConceptId; step: number; effort: number }) {
  if (flow === "onboarding" && step !== 2 || flow === "week" && step === 3) return <div className={styles.emberWorld}>
    <svg viewBox="0 0 360 280" aria-hidden="true"><circle cx="180" cy="142" r="104" fill="var(--soft)"/><path d="M25 230 Q90 170 153 227 T337 205" fill="none" stroke="var(--line)" strokeWidth="3" strokeDasharray="5 9"/>{[0,1,2,3].map(i=><g key={i} transform={`translate(${55+i*83} ${i%2?66:165})`}><path d="M0 -8V8M-8 0H8" stroke="var(--yellow)" strokeWidth="3" strokeLinecap="round"/></g>)}</svg>
    <Ember className={styles.ember} expression={step === 3 ? "happy" : undefined} label="Ember welcomes you to the starting line"/>
    <span className={styles.floatLabel}>{step === 3 ? "YOUR NEXT CHAPTER" : "YOUR TINY TEAMMATE"}</span>
  </div>;
  if (flow === "week") return <svg viewBox="0 0 360 280" className={styles.art} role="img" aria-label={step === 0 ? "Three sample sessions along a winding weekly trail" : step === 1 ? "Third place podium" : "Weekly activity chart, 12.4 km over three sessions"}>
    {step === 0 ? <><path d="M65 242 C300 245 300 175 160 164 S26 75 278 48" fill="none" stroke="var(--line)" strokeWidth="19" strokeLinecap="round"/><path className={styles.drawPath} d="M65 242 C300 245 300 175 160 164 S26 75 278 48" fill="none" stroke="var(--teal)" strokeWidth="7" strokeLinecap="round"/>{[[74,236,"TUE"],[208,168,"THU"],[239,55,"SUN"]].map(([x,y,l])=><g key={l} transform={`translate(${x} ${y})`}><circle r="22" fill="var(--yellow)"/><text y="5" textAnchor="middle" style={typographyStyle("heading")} fill="var(--ink)">✓</text><text y="-34" textAnchor="middle" style={typographyStyle("caption")} fill="var(--muted)">{l}</text></g>)}</> : step === 1 ? <><circle cx="180" cy="109" r="72" fill="var(--soft)"/><path d="m146 39 15 48h38l15-48" fill="var(--teal)"/><circle cx="180" cy="120" r="45" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3"/><text x="180" y="138" textAnchor="middle" style={typographyStyle("hero")} fill="var(--ink)">3</text><path d="M50 250v-45h85v-18h90v-37h85v100" fill="var(--line)"/><text x="267" y="183" style={typographyStyle("caption")} fill="var(--ink)">YOU</text></> : <><text x="34" y="57" style={typographyStyle("hero")} fill="var(--ink)">12.4<tspan style={typographyStyle("heading")}> km</tspan></text>{[0,3.2,0,4,0,0,5.2].map((v,i)=><g key={i}><rect x={35+i*43} y={225-v*25} width="24" height={Math.max(4,v*25)} rx="10" fill={v?"var(--yellow)":"var(--line)"}/><text x={47+i*43} y="251" style={typographyStyle("caption")} textAnchor="middle" fill="var(--muted)">{["M","T","W","T","F","S","S"][i]}</text></g>)}</>}
  </svg>;
  const p = flow === "onboarding" ? effort : step === 0 ? 0 : step === 1 ? 30 : 100;
  return <svg viewBox="0 0 360 280" className={styles.art} role="img" aria-label={`Sample field. You ${p > 60 ? "have passed" : "are approaching"} Alex. Both athletes are visible.`}>
    <rect x="32" y="10" width="296" height="262" rx="32" fill="var(--soft)"/>
    {[116,244].map(x=><path key={x} d={`M${x} 32V255`} stroke="var(--line)" strokeWidth="2" strokeDasharray="4 8"/>)}
    <path d="M52 144H308" stroke="var(--teal)" strokeWidth="2" strokeDasharray="5 5"/>
    <text x="180" y="133" textAnchor="middle" style={typographyStyle("caption")} fill="var(--teal)">THE PASS</text>
    <g className={styles.racer} style={{ transform: `translate(116px, ${214-p*1.4}px)` }}><path d="M-7 22v30M0 22v48M7 22v40" stroke="var(--yellow)" strokeWidth="5" strokeLinecap="round"/><rect x="-18" y="-26" width="36" height="52" rx="18" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2"/><text y="-40" textAnchor="middle" style={typographyStyle("caption")} fill="var(--ink)">YOU</text></g>
    <g transform="translate(244 146)"><path d="M-5 22v32M5 22v46" stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" opacity=".3"/><rect x="-18" y="-26" width="36" height="52" rx="18" fill="var(--card)" stroke="var(--muted)" strokeWidth="2"/><text y="-40" textAnchor="middle" style={typographyStyle("caption")} fill="var(--muted)">ALEX</text></g>
    {p>60 && <g className={styles.pop}><rect x="150" y="194" width="64" height="32" rx="16" fill="var(--teal)"/><text x="182" y="215" textAnchor="middle" style={typographyStyle("caption")} fill="white">+1</text></g>}
  </svg>;
}

export function ExperienceLab({ standalone = false }: { standalone?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const requestedFlow = experienceConceptId(params.get("flow"));
  const [flow, setFlow] = useState<ExperienceConceptId>(requestedFlow);
  const [step, setStep] = useState(0), [sport, setSport] = useState("Running"), [effort, setEffort] = useState(0), [complete, setComplete] = useState(false);
  const screen = useRef<HTMLDivElement>(null);
  const concept = EXPERIENCE_CONCEPTS[flow], beat = concept.steps[step];
  function choose(id: ExperienceConceptId) { setFlow(id); setStep(0); setEffort(0); setComplete(false); }
  useEffect(() => { setFlow(requestedFlow); setStep(0); setEffort(0); setComplete(false); }, [requestedFlow]);
  useEffect(()=>{ screen.current?.querySelector("h2")?.focus({preventScroll:true}); },[step,flow,complete]);
  return <main className={`${styles.lab}${standalone ? "" : ` ${styles.inApp}`}`}>
    <header className={styles.top}><a href={standalone?"#":"/today"}>overtaek<span> / experience lab</span></a><span>INTERACTIVE CONCEPTS · 01</span></header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><p className={styles.kicker}>A LITTLE MORE FEELING</p><AppHeading level={1} role="hero">Make the<br/>effort <em>feel good.</em></AppHeading><p>Three everyday moments. A little anticipation, a clear story, and something to smile about.</p>
        <nav aria-label="Choose an experience">{(Object.keys(EXPERIENCE_CONCEPTS) as ExperienceConceptId[]).map((id,i)=><button key={id} aria-pressed={flow===id} onClick={()=>choose(id)}><span>0{i+1}</span><div><b>{EXPERIENCE_CONCEPTS[id].label}</b><small>{EXPERIENCE_CONCEPTS[id].name}</small></div><span>↗</span></button>)}</nav>
        <div className={styles.note}><b>THE IDEA</b><p>{concept.note}</p><small>Fictional data · no account changes.<br/>Existing brand, scoring, and tracker rules stay intact.</small></div>
      </aside>
      <section className={styles.preview} aria-label={`${concept.label} prototype`}>
        <div className={styles.phone}>
          <div className={styles.flowTop}><button aria-label={step?"Previous step":"Restart concept"} onClick={()=>{setComplete(false);setStep(Math.max(0,step-1));}}>←</button><div role="progressbar" aria-label="Story progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={complete?4:step+1}>{concept.steps.map((_,i)=><i key={i} className={i<=step?styles.filled:undefined}/>)}</div><small>{step+1}/4</small></div>
          <div className={styles.screen} ref={screen}>
            <div className={styles.artWrap}><StoryArt flow={flow} step={step} effort={effort}/></div>
            <p className={styles.kicker}>{complete?"PREVIEW COMPLETE":beat.eyebrow}</p><AppHeading level={2} role="display" tabIndex={-1}>{complete?"That’s the feeling.":beat.title}</AppHeading><p className={styles.body}>{complete?"Try another moment, or replay this one and explore each step again.":beat.body}</p>
            {!complete && flow==="onboarding" && step===1 && <div className={styles.choices}>{["Running","Cycling","Walking","Strength"].map((s,i)=><button key={s} aria-pressed={sport===s} onClick={()=>setSport(s)}><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="8" r="4" fill="currentColor"/><path d={i===1?"M5 25a5 5 0 1 0 0-.1M24 25a5 5 0 1 0 0-.1M9 25l6-12 9 12H9":i===3?"M4 15v12M28 15v12M4 21h24M16 12v9":"M9 30l6-12 7 9M5 20l9-7 11 5"} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg><span>{s}</span><i>{sport===s?"✓":""}</i></button>)}</div>}
            {!complete && flow==="onboarding" && step===2 && <label className={styles.slider}>Try adding a sample {sport.toLowerCase()} session<input aria-label="Sample session effort" type="range" min="0" max="100" value={effort} onChange={e=>setEffort(Number(e.target.value))}/><span>{effort>60?"You passed Alex. That’s how your effort moves you.":"Drag right to move your athlete."}</span></label>}
            {!complete && flow==="overtake" && step===3 && <div className={styles.receipt}><span>YOUR PLACE<b>#4 → #3</b></span><span>OVERTAKES<b>+1</b></span></div>}
            {!complete && flow==="week" && step===2 && <div className={styles.receipt}><span>ACTIVITY STREAK<b>4 weeks</b></span><span>SHOWED UP<b>3 days</b></span></div>}
          </div>
          <footer className={styles.actions}><button className={styles.primary} onClick={()=>complete?(setStep(0),setComplete(false),setEffort(0)):step===3?setComplete(true):setStep(step+1)}>{complete?"Replay this concept":beat.action}<span>→</span></button><button className={styles.quiet} onClick={()=>standalone?choose(flow):router.back()}>{standalone?"Start over":"Close preview"}</button><small>CONCEPT PREVIEW · SAMPLE DATA</small></footer>
        </div>
        <div className={styles.beats} aria-label="Jump to a story beat">{concept.steps.map((s,i)=><button key={s.eyebrow} aria-current={i===step?"step":undefined} onClick={()=>{setStep(i);setComplete(false);}}><span>{i+1}</span>{["Arrive","Discover","Feel it","Carry it on"][i]}</button>)}</div>
      </section>
    </div>
  </main>;
}
