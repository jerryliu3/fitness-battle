"use client";
import Link from "next/link";
import { competeNow, formatEffort, formatVolume, nextClubRival, sportById, weeklyBoard, type CompeteState } from "@fitness-battle/shared";
import { PolishedRacer } from "@/features/brand/polished-racer";
export function RivalCard({state}:{state:CompeteState}) {
  const sport=state.ratings.find(r=>r.sport===state.primary&&r.optedIn)?.sport??state.ratings.find(r=>r.optedIn)?.sport;
  const {you,rival,fieldSize}=nextClubRival(sport?weeklyBoard(state,sport,"open",competeNow(state)):[]);
  const synthetic=Boolean(rival&&state.enrollments.find(e=>e.sport===sport)?.syntheticIds.includes(rival.id));
  const gap=rival&&you&&sport?(sportById(sport).gps?formatVolume(sport,Math.max(0,rival.distanceM-you.distanceM),0,state.units):`${formatEffort(Math.max(0,rival.effort-you.effort))} pts`):null;
  return <Link href="/arena" className="club-rival-card"><img className="club-landscape" src="/club/alpine-trail.jpg" alt=""/><div className="club-rival-top"><div><span className="club-eyebrow">Your competition · Open</span><h2>{sport?sportById(sport).name:"Find your field"}</h2></div>{you?<span className="club-place"><b>{you.place}</b> / {fieldSize}<small>place</small></span>:null}</div><div className="club-rival-bottom"><div><strong>{rival?`${gap} to ${rival.name.split(" ")[0]}`:you?"You’re leading the way.":"Your next chapter starts here."}</strong><p>{rival?(synthetic?"Next rival · simulated athlete":"Next rival in your field"):you?"Keep showing up. Every effort counts.":"Register for a weekly event."}</p></div><span className="club-round-arrow" aria-hidden="true">↗</span></div><svg className="club-rival-markers" viewBox="0 0 220 140" aria-hidden="true"><PolishedRacer x={70} y={90} you gold={you?.place===1} sizeScale={.75}/>{rival?<PolishedRacer x={150} y={45} you={false} gold={rival.place===1} sizeScale={.7}/>:null}</svg></Link>;
}
