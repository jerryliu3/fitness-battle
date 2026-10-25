"use client";
import { useState, type CSSProperties } from "react";
import { HOME_HEALTH_COLORS as colors } from "@fitness-battle/shared";
import "./study.css";
import { SignalVisual, SignalVisualDetail } from "./signal-visuals";

const signalPalette = Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--signal-${key}`, value])) as CSSProperties;

const concepts = [
  { id: "portfolio", name: "01 / The Portfolio", idea: "One confident number. A quiet cumulative line. Daily health reads like a watchlist.", chart: "Cumulative training hours" },
  { id: "orbit", name: "02 / Daily Orbit", idea: "A weekly arc becomes an anchor. Four daily signals stay in its orbit.", chart: "Weekly training composition" },
  { id: "ledger", name: "03 / The Ledger", idea: "An editorial weekly receipt. Individual sessions and crisp daily numbers, without a dashboard of boxes.", chart: "Daily training hours" },
  { id: "pulse", name: "04 / Signal Room", idea: "A light instrument panel. A week of activity cells sits above four small daily signal charts.", chart: "Weekly activity time grid" },
  { id: "tempo", name: "05 / Tempo", idea: "A spacious calendar ribbon. The rhythm of your week leads into a compact daily health strip.", chart: "Daily training timeline" },
  { id: "dials", name: "06 / Signal Dials", idea: "Portfolio above, Signal Room below. A quiet dial places each daily reading within its observed seven-day range.", chart: "Cumulative training hours" },
  { id: "halos", name: "07 / Seven-Day Halo", idea: "The same selected chart, with seven daily observations arranged around the latest reading. Variation becomes a constellation, not a score.", chart: "Cumulative training hours" },
  { id: "fills", name: "08 / Signal Fill", idea: "Signal Dials with a continuous teal arc filling from zero to the current reading. Each scale ends at its observed seven-day maximum.", chart: "Cumulative training hours" },
] as const;
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = [.5, .85, 0, 1.25, .6, .9, 0];
const cumulative = [.5, 1.35, 1.35, 2.6, 3.2, 4.1, 4.1];
const metrics = [
  { name: "Sleep", value: "7h 42m", unit: "Last night", icon: "☾", note: "Sample sleep duration, 11:18 PM–7:00 AM. Duration only; no invented sleep score.", points: "0,19 10,12 20,17 30,8 40,10 50,4 60,8" },
  { name: "Steps", value: "8,450", unit: "Today", icon: "↟", note: "Fictional daily step total through 3:20 PM. No target is assumed.", points: "0,27 10,25 20,25 30,18 40,12 50,10 60,2" },
  { name: "Resting HR", value: "52", unit: "bpm · Today", icon: "♡", note: "Fictional resting heart rate. This is separate from workout average heart rate.", points: "0,9 10,13 20,7 30,16 40,12 50,18 60,15" },
  { name: "HRV", value: "58", unit: "ms · Last night", icon: "⌁", note: "Fictional overnight HRV. No readiness, diagnosis or normal range is inferred.", points: "0,20 10,14 20,18 30,8 40,12 50,4 60,10" },
];
function Chart({ kind, day }: { kind: string; day: number }) {
  const selectedDirection = kind === "dials" || kind === "halos" || kind === "fills";
  const lineEnd = 24 + (selectedDirection ? day : 6) * 43;
  const line = cumulative.slice(0, selectedDirection ? day + 1 : 7).map((value, index) => `${24 + index * 43},${150 - value * 29}`).join(" ");
  if (kind === "orbit") return <svg viewBox="0 0 330 205" role="img" aria-label="4.1 hours this week, five active days">
    <circle cx="165" cy="108" r="78" fill="none" stroke="currentColor" strokeWidth="12" opacity=".1" />
    <circle cx="165" cy="108" r="78" fill="none" stroke="var(--study-accent)" strokeWidth="12" strokeDasharray="350 491" strokeLinecap="round" transform="rotate(-90 165 108)" />
    <text x="165" y="104" textAnchor="middle" className="orbit-value">4.1</text><text x="165" y="128" textAnchor="middle" className="svg-caption">HOURS THIS WEEK</text>
    <text x="165" y="151" textAnchor="middle" className="svg-caption">5 active days</text>
  </svg>;
  if (kind === "ledger") return <svg viewBox="0 0 330 180" role="img" aria-label="Daily training hours Monday through Sunday">
    {[0, .5, 1].map(v => <g key={v}><line x1="24" x2="312" y1={152-v*100} y2={152-v*100} stroke="currentColor" opacity=".12"/><text x="2" y={155-v*100} className="svg-caption">{v}h</text></g>)}
    {hours.map((h, i) => <g key={i}><rect x={31+i*41} y={152-h*100} width="23" height={Math.max(2,h*100)} rx="3" fill={i===day?"var(--study-accent)":"currentColor"} opacity={i===day?1:.3}/><text x={42+i*41} y="174" textAnchor="middle" className="svg-caption">{days[i][0]}</text></g>)}
  </svg>;
  if (kind === "pulse") return <div className="signal-grid" role="img" aria-label="Sample sessions across this week; columns are days and rows are morning, afternoon and evening">
    <div className="signal-axis"><span>AM</span><span>PM</span><span>EVE</span></div>
    {days.map((d,i)=><div key={d}><b>{d[0]}</b>{[0,1,2].map(j=><span key={j} className={(hours[i]>0 && j===i%3)?"lit":""} style={{opacity:i===day?1:.65}} />)}</div>)}
  </div>;
  if (kind === "tempo") return <div className="tempo-week" role="img" aria-label="Training sessions placed along the week">
    {days.map((d,i)=><div key={d} className={i===day?"selected":""}><span>{d}</span><b>{19+i}</b><div className="tempo-track">{hours[i]>0&&<i style={{height:hours[i]*80+12,top:(i%3)*12}}/>}</div><small>{hours[i]?`${Math.round(hours[i]*60)}m`:"Rest"}</small></div>)}
  </div>;
  return <svg viewBox="0 0 330 180" role="img" aria-label="Cumulative training rises to 4.1 hours; previous week ended at 3.5 hours">
    <defs><linearGradient id="health-study-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--study-accent)" stopOpacity=".22"/><stop offset="1" stopColor="var(--study-accent)" stopOpacity="0"/></linearGradient></defs>
    <polyline points="24,140 67,120 110,120 153,90 196,72 239,55 282,48" fill="none" stroke="currentColor" strokeDasharray="3 5" opacity=".22"/>
    <polygon points={`24,160 ${line} ${lineEnd},160`} fill="url(#health-study-fill)"/>
    <polyline points={line} fill="none" stroke="var(--study-accent)" strokeWidth="3" strokeLinejoin="round" />
    <line x1={24+day*43} x2={24+day*43} y1="20" y2="160" stroke="currentColor" opacity=".15"/><circle cx={24+day*43} cy={150-cumulative[day]*29} r="5" fill="var(--study-accent)" stroke="var(--study-paper)" strokeWidth="3" />
    <text x="24" y="178" className="svg-caption">MON 19</text><text x="282" y="178" textAnchor="end" className="svg-caption">SUN 25</text>
  </svg>;
}
function Concept({ concept, unavailable }: { concept: typeof concepts[number]; unavailable: boolean }) {
  const visual = concept.id === "dials" || concept.id === "halos" || concept.id === "fills" ? concept.id : null;
  const [day,setDay]=useState(5);
  const [detail,setDetail]=useState<string|null>(null);
  return <article className={`health-concept ${concept.id}${concept.id === "fills" ? " dials" : ""}`}>
    <div className="concept-caption"><span>{concept.name}</span><p>{concept.idea}</p></div>
    <div className="concept-phone">
      <header className="health-shell"><span>overtaek<span className="brand-dot">.</span></span><span className="sample-avatar">AL</span></header>
      <div className="health-greeting"><span>Saturday, October 24</span><h2>{concept.id==="pulse"?"Your daily signals.":concept.id==="ledger"?"A week worth keeping.":"Find your rhythm, Alex."}</h2></div>
      <section className="health-training" aria-label={concept.chart}>
        <div className="training-title"><h3>Current week</h3><span>Oct 19–25</span></div>
        {concept.id!=="orbit"&&<div className="training-total"><strong>4.1<span> hrs</span></strong><span>5 sessions<br/><b>+0.6h vs last week</b></span></div>}
        <Chart kind={concept.id} day={day}/>
        {!visual && <><div className="health-day-picker" aria-label="Inspect training day">{days.map((d,i)=><button key={d} aria-label={`Inspect ${d}`} aria-pressed={day===i} onClick={()=>setDay(i)}>{d[0]}</button>)}</div>
        <div className="training-receipt" aria-live="polite">{days[day]} · {day===6?"No sample session scheduled":`${Math.round(hours[day]*60)} minutes · ${cumulative[day].toFixed(1)}h cumulative`}</div></>}
      </section>
      <section className="health-vitals" aria-label="Today's core health metrics">
        <div className="vitals-title"><h3>Today’s health</h3><span>Sample · 3:20 PM</span></div>
        {visual && <p className="signal-concept-note">{visual === "fills" ? "From zero to your reading. Scale ends at your 7-day maximum." : visual === "dials" ? "Your observed range. No targets or scores." : "Seven readings. Teal is the latest, not the best."}</p>}
        <div className="health-metrics">{metrics.map((metric,i)=><button key={metric.name} className="health-metric" aria-expanded={detail===metric.name} onClick={()=>setDetail(detail===metric.name?null:metric.name)}>
          <span className="metric-symbol" aria-hidden="true">{metric.icon}</span><span className="metric-name">{metric.name}</span>{visual ? <SignalVisual kind={visual} index={i} unavailable={unavailable}/> : <strong>{unavailable?"—":metric.value}</strong>}<span className="metric-unit">{unavailable?"Not available":metric.unit}</span>
          {concept.id==="pulse"&&<svg viewBox="0 0 60 32" aria-hidden="true"><polyline points={unavailable?"0,16 60,16":metric.points} fill="none" stroke={i%2?colors.comparison:colors.accent} strokeWidth="2"/></svg>}
          {concept.id==="orbit"&&<span className="metric-orbit" aria-hidden="true"/>}
        </button>)}</div>
        {detail&&<div className="health-detail" role="status"><b>{detail}</b>{visual ? <SignalVisualDetail kind={visual} index={metrics.findIndex(m=>m.name===detail)} unavailable={unavailable}/> : <p>{unavailable?"No reading is available. A production design would show the source and last successful reading, without substituting a score or zero.":metrics.find(m=>m.name===detail)?.note}</p>}<span>Illustrative data · No live connection</span></div>}
      </section>
      <div className="health-rival"><span>WEEKLY RUNNING <b>2nd</b></span><strong>0.6 mi behind Mara</strong><small>Next rival · Fictional sample</small></div>
      <footer className="health-tabs"><b>⌂<span>Home</span></b><span>⚑<small>Compete</small></span><span>↗<small>Progress</small></span><span>◎<small>Crew</small></span></footer>
    </div>
  </article>;
}
export function HomeHealthStudy() {
  const [selected,setSelected]=useState("new");
  const [unavailable,setUnavailable]=useState(false);
  return <main className="health-study" style={signalPalette}>
    <div className="health-study-intro"><span className="study-eyebrow">OVERTAEK / HOME EXPLORATIONS / 08</span><h1>Your week.<br/>Your body. One glance.</h1><p>The selected Portfolio chart meets Signal Room’s daily health panel. Compare the dot dial with a new arc that fills from zero. Seven-day halos and the original five concepts remain available in the chooser. All metrics are fictional. No production data or health connections are changed.</p></div>
    <div className="health-study-controls"><label>Concept<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="new">Compare dot and fill</option><option value="all">Compare all eight</option>{concepts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button aria-pressed={unavailable} onClick={()=>setUnavailable(!unavailable)}>{unavailable?"Show sample readings":"Preview missing readings"}</button><span>Inspect a metric. Preview missing readings.</span></div>
    <div className={`health-study-grid ${selected!=="all"&&selected!=="new"?"focused":""}`}>{concepts.filter(c=>selected==="all"||(selected==="new"&&(c.id==="dials"||c.id==="fills"))||selected===c.id).map(c=><Concept key={c.id} concept={c} unavailable={unavailable}/>)}</div>
  </main>;
}
