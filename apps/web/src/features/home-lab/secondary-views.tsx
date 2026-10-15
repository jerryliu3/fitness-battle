import {
  countsOnTrack, formatVolume, initialsFromName, progressionTrends, rankForElo,
  sportById, type Activity, type CompeteState,
} from "@fitness-battle/shared";
import Link from "next/link";
import type { ProgressSnapshot } from "./model";

export function DockIcon({ view }: { view: "today" | "arena" | "progress" | "athlete" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {view === "today" ? <><circle cx="7" cy="17" r="3" /><circle cx="17" cy="7" r="3" /><path d="M7 14v-2a5 5 0 0 1 5-5h2" /></> : view === "arena" ? <><path d="M4 20V9m8 11V4m8 16V12M2 20h20" /><circle cx="4" cy="7" r="2" /><circle cx="12" cy="2" r="1" /><circle cx="20" cy="10" r="2" /></> : view === "progress" ? <><path d="M3 3v18h18M7 15l5-5 4 2 5-7" /></> : <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
  </svg>;
}

export function HomeSecondaryView({ view, state, snapshot, sampleMode, unsynced, onActivity, onProfile }: {
  view: "progress" | "athlete"; state: CompeteState; snapshot: ProgressSnapshot;
  sampleMode: boolean; unsynced: boolean; onActivity: (activity: Activity) => void; onProfile: () => void;
}) {
  const spec = sportById(state.primary);
  const counted = state.activities.filter(a => a.sport===state.primary && countsOnTrack(a,"open"));
  const rating = state.ratings.find(r => r.sport===state.primary)?.openElo ?? 1000;
  if (view === "athlete") {
    const connected = !sampleMode && state.links.some(link => link.status === "connected");
    return <section className="ah-athlete-view" aria-label="Athlete profile">
      <button className="ah-athlete-portrait" onClick={onProfile} aria-label="Open athlete details">{initialsFromName(state.name)}</button>
      <h1>{state.name}</h1><p className="ah-athlete-city">{state.city}</p>
      <div className="ah-athlete-rating"><span>{rankForElo(rating).name}</span><b>{rating}</b></div>
      <Link className="ah-tracker-link" href="/you#connections"><DockIcon view="arena" /><span>{unsynced || !connected ? "Connect tracker" : "Trackers"}</span><span aria-hidden="true">↗</span></Link>
      <Link className="ah-text-link" href="/you">Settings ↗</Link>
    </section>;
  }
  const trends = progressionTrends(state.activities,state.primary,state.periodResults.filter(r=>r.sport===state.primary && r.track==="open").map(r=>({day:r.periodStart.slice(0,10),elo:r.eloAfter})));
  const points = spec.gps ? trends.distance.slice(-7) : [...new Set(counted.map(a=>a.startedAt.slice(0,10)))].sort().slice(-7).map(day=>({day,value:Math.round(counted.filter(a=>a.startedAt.startsWith(day)).reduce((sum,a)=>sum+a.movingSec,0)/60)}));
  const max = Math.max(1,...points.map(p=>p.value));
  const lastPace = trends.pace.at(-1)?.value;
  return <section className="ah-progress-view" aria-label="Your progress">
    <h1>Progress</h1><strong className="ah-progress-volume">{formatVolume(state.primary,snapshot.distanceM,snapshot.movingSec)}</strong>
    <div className="ah-progress-chart" role="group" aria-label={`Recent daily ${spec.gps ? "distance in kilometers" : "movement in minutes"}`}>
      {points.map(point => <button key={point.day} onClick={() => { const activity=counted.filter(a=>a.startedAt.startsWith(point.day)).at(-1); if(activity)onActivity(activity); }} aria-label={`${point.day}, ${point.value} ${spec.gps ? "km" : "min"}. Open activity`}><span className="ah-chart-bar" style={{height:`${point.value/max*120}px`}} /><b>{point.value}</b><small>{new Date(`${point.day}T12:00:00Z`).toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"})}</small></button>)}
      {!points.length && <p>No activities yet.</p>}
    </div>
    <div className="ah-progress-metrics"><div><span>Rating</span><b>{rating}</b></div>{lastPace != null && <div><span>Latest pace</span><b>{lastPace.toFixed(1)}<small> min/km</small></b></div>}</div>
    <Link className="ah-text-link" href="/progress">History ↗</Link>
  </section>;
}
