"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { photoFinishFrame, sportById, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";

export function CompetitionMoment({ moment, remaining, onConfirm }: { moment: Moment; remaining: number; onConfirm: () => void }) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    let raf = 0;
    setProgress(0);
    const start = performance.now();
    const duration = 4200 + count * 1150;
    const tick = (now: number) => { if (skipped.current) return; const p = Math.min(1, (now - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count]);
  const frame = photoFinishFrame(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  const peers = Object.values(moment.plan.rivals).filter(r => passedBy ? r.passedYou : r.overtaken).sort((a, b) => a.endValue - b.endValue);
  const span = Math.max(.5, Math.abs(moment.plan.youAfter - moment.plan.youBefore), ...peers.map(r => Math.abs(r.endValue - moment.plan.youBefore))) * 1.25;
  const x = (value: number) => 310 + (value - frame.youValue) / span * 390;
  const zoom = reduced ? 1 : 1 + frame.focus * .28;
  const names = peers.map(r => r.name ?? "Rival").join(", ");
  return <div className="moment-step">
    <p className="fb-kicker">{sportById(moment.sport).name} · {passedBy ? "THE FIELD MOVED" : "PHOTO FINISH"}</p>
    <h1>{frame.done ? passedBy ? "The chase is on." : "That’s your move." : passedBy ? "A rival is making a move." : "Every pass. Earned."}</h1>
    <p className="fb-copy">{frame.done ? `${passedBy ? "Passed by" : "You passed"} ${names}.` : passedBy ? "Here’s how your field changed." : "Your effort is moving you through the field."}</p>
    <div className={`moment-counter${passedBy ? " is-rival" : ""}`} aria-live="polite" aria-atomic="true">
      <strong>{frame.count}</strong><span>{passedBy ? `rival${frame.count === 1 ? "" : "s"} passed you` : `overtake${frame.count === 1 ? "" : "s"}`}</span>
      {!passedBy && frame.count > 1 && <b>×{frame.count} COMBO</b>}
    </div>
    <svg className="moment-scene" viewBox="0 0 620 370" role="img" aria-label={`${frame.count} ${passedBy ? "rivals passed you" : "overtakes"}. Place ${frame.rank}. ${names}`}>
      <defs><linearGradient id="moment-track" x2="1" y2="1"><stop stopColor="#176c75"/><stop offset="1" stopColor="#103e46"/></linearGradient></defs>
      <rect width="620" height="370" rx="24" fill="url(#moment-track)"/>
      <g transform={`translate(${310 * (1 - zoom)} ${180 * (1 - zoom)}) scale(${zoom})`}>
        {[92, 180, 268].map(y => <g key={y}><rect x="-200" y={y - 35} width="1000" height="70" rx="18" fill="#ffffff09"/><path d={`M-200 ${y}H900`} stroke="#ffffff26" strokeDasharray="5 12"/></g>)}
        {peers.map((r, i) => { const px = x(frame.values[r.id]), y = i % 2 ? 268 : 92; const label = (r.name ?? "Rival").split(" ")[0]; return <g key={r.id} transform={`translate(${px} ${y})`}>
          {frame.nearestId === r.id && frame.focus > .2 && <circle r={34 + frame.focus * 14} fill="none" stroke="#f7c948" strokeWidth="2" opacity={frame.focus}/>}
          <path d="M-100 0H-20" stroke="#c9d6e3" strokeWidth="12" opacity=".16" strokeLinecap="round"/>
          <rect x="-13" y="-20" width="26" height="40" rx="13" fill="#c9d6e3" stroke="white"/>
          <text y="-33" textAnchor="middle" fill="white" fontSize="14">{label}</text>
        </g>; })}
        <g transform="translate(310 180)">
          {[0, 1, 2, 3].map(i => <path key={i} d={`M${-110 - i * 22} ${-12 + i * 8}H-18`} stroke="#f7c948" opacity={.4 - i * .08} strokeWidth="5" strokeLinecap="round"/>)}
          <rect x="-15" y="-23" width="30" height="46" rx="15" fill="#ffc400" stroke="#fff5d1" strokeWidth="2"/>
          <text y="-38" textAnchor="middle" fill="#fff5d1" fontWeight="700" fontSize="14">YOU</text>
        </g>
      </g>
      {!reduced && frame.focus > .55 && <><path d="M260 134v-12h18m64 0h18v12m0 92v12h-18m-64 0h-18v-12" stroke="#fff5d1" strokeWidth="2" fill="none"/><text x="310" y="333" fill="#fff5d1" textAnchor="middle" fontSize="12" letterSpacing="3">PHOTO FINISH</text></>}
      {!passedBy && frame.count > 0 && !frame.done && <g><rect x="420" y="18" width="180" height="34" rx="17" fill="#f7c948"/><text x="510" y="40" textAnchor="middle" fill="#142b3b" fontSize="13" fontWeight="700">+1 OVERTAKE · ×{frame.count}</text></g>}
    </svg>
    <div className="moment-result"><span>Your place</span><strong>#{moment.plan.rankBefore} <span>→</span> #{frame.rank}</strong><small>{frame.youValue.toFixed(1)} {moment.unit} this round</small></div>
    <p className="fb-note">{frame.done ? remaining > 1 ? "There’s more to your update." : "Your stats are up to date." : "Replaying the change in accumulated effort."}</p>
    <button className="fb-btn moment-continue" type="button" onClick={() => frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}>{frame.done ? remaining > 1 ? "Continue →" : "Back to the app →" : "Skip animation"}</button>
  </div>;
}
