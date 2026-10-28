"use client";

import { AppHeading } from "@/ui/section";
import { useState, type ReactNode } from "react";
import { ActivityRoute } from "@/components/routes/activity-route";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import { ImpactReceipt } from "@/features/progress/effort-rail";
import { APP_TIMEZONE, PROVIDERS, countsOnTrack, activityContextRecordedHr, clubSessionMetrics, formatClockTime, formatTrainingHours, formatVolume, isVerifiedActivity, sessionStageModel, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { ActivityComparison } from "./activity-comparison";
import { ActivityContext } from "./activity-context";

export function SessionStage({ state, activities, suggestion, onRemove, actions }: {
  state: CompeteState; activities: Activity[]; suggestion?: { title: string; minutes?: number | null; detail: string };
  onRemove: (id: string) => void; actions?: ReactNode;
}) {
  const model = sessionStageModel(activities), [selected, setSelected] = useState<string | null>(null);
  const current = model.rows.find(row => row.id === selected) ?? model.rows[0];
  if (!current) return <section className="session-stage" aria-label="Today's suggestion"><AppHeading role="display">{suggestion?.title ?? "Make room to move."}</AppHeading><div className="session-stage-object"><div><strong className="session-stage-hours">{formatTrainingHours((suggestion?.minutes ?? 0) * 60)}</strong><small>hr · Suggested time</small></div><AnimatedEmber expression="happy" action="idle" loop={false} /></div><p>{suggestion?.detail ?? "Nothing recorded today."}</p>{actions}</section>;
  return <section className="session-detail" aria-label="Recorded activity">
    {model.rows.length > 1 && <div className="ac-group"><b>{model.sessions} recorded sessions · {formatTrainingHours(model.movingSec)} hr total</b><div className="ac-choices" role="group" aria-label="Choose a session">{model.rows.map(row => <button type="button" key={row.id} aria-pressed={row.id === current.id} onClick={() => setSelected(row.id)}>{sportById(row.sport).name} · {new Date(row.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}</button>)}</div></div>}
    <ActivityDetails key={current.id} activity={current} state={state} onRemove={onRemove} />
  </section>;
}
function ActivityDetails({ activity, state, onRemove }: { activity: Activity; state: CompeteState; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false), gps = sportById(activity.sport).gps, hr = activityContextRecordedHr(activity);
  const primary = gps && activity.distanceM > 0 ? formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units) : formatClockTime(activity.movingSec);
  const metrics = clubSessionMetrics([activity], state.units).filter(metric => metric.label !== (gps ? "Distance" : "Moving time"));
  return <div className="session-detail-content">
    <header className="session-overview"><b>{sportById(activity.sport).name}</b><p>{new Date(activity.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: APP_TIMEZONE })} · {new Date(activity.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}</p>
      {!countsOnTrack(activity, "open") && <small>Not counted in your totals</small>}<AppHeading role="hero">{primary}</AppHeading>
      <div className="session-detail-metrics">{metrics.map(metric => <div key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></div>)}{hr !== null && <div><strong>{Math.round(hr)} bpm</strong><small>Avg heart rate</small></div>}{Number.isFinite(activity.elevationGainM) && activity.elevationGainM! >= 0 && <div><strong>{Math.round(activity.elevationGainM! * (state.units === "us" ? 3.28084 : 1))} {state.units === "us" ? "ft" : "m"}</strong><small>Elevation gain</small></div>}</div>
    </header>
    <ActivityRoute activity={activity} units={state.units} />
    <ActivityContext activity={activity} state={state} />
    <ActivityComparison activity={activity} state={state} compact />
    <footer className="session-detail-footer"><small>{activity.source === "manual" ? "Manually logged" : activity.source === "history" ? "Sample history" : `From ${PROVIDERS.find(provider => provider.id === activity.source)?.name ?? activity.source}`} · {isVerifiedActivity(activity) ? "GPS tracked" : "Recorded activity"}</small>
      <ImpactReceipt title="Your Effort Score this week" state={state} seconds={activity.movingSec} sport={activity.sport} />
      {removing ? <div className="ac-group"><p>Remove this session from your activity?</p><button type="button" className="fb-btn-line" onClick={() => onRemove(activity.id)}>Remove session</button><button type="button" className="fb-btn-ghost" onClick={() => setRemoving(false)}>Keep session</button></div> : <button type="button" className="fb-btn-ghost" onClick={() => setRemoving(true)}>Remove session</button>}
    </footer>
  </div>;
}
