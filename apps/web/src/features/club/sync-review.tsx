"use client";
import { AppHeading } from "@/ui/section";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { APP_TIMEZONE, syncReviewMetrics, clubDuration, formatVolume, sportById, SYNC_REVIEW_SAVE_DELAY_MS, type CompeteState, type CompetitionMoment, type SyncReviewReceipt } from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
import { ActivityRoute } from "@/components/routes/activity-route";
import { CompetitionMoment as Moment } from "./competition-moment";

export function SyncReview({ receipt, state, moment, debug = false, remaining = 0, onComplete, onAcknowledge = () => {} }: {
  receipt: SyncReviewReceipt | null; state: CompeteState; debug?: boolean; moment?: CompetitionMoment | null; remaining?: number;
  onComplete: (selected?: readonly string[], quiet?: boolean) => unknown; onAcknowledge?: () => void;
}) {
  const title = receipt ? "Sync completed" : moment?.plan.hasOvertake ? "Your overtakes" : "Your field changed";
  return <Sheet open hideTitle={Boolean(receipt)} title={title} body="" fullScreen minimal={!receipt} scrollResetKey={receipt ? "review" : moment?.id} onClose={() => { if (receipt) onComplete(undefined, true); }}>
    {debug && receipt && <p className="fb-kicker" style={{ textAlign: "center", marginTop: 20 }}>DEBUG PREVIEW · LOCAL DATA ONLY</p>}
    {receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete}/> : moment ? <Moment key={moment.id} moment={moment} debug={debug} remaining={remaining} onConfirm={onAcknowledge}/> : null}
  </Sheet>;
}
function Review({ receipt, state, onComplete }: { receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [saving, setSaving] = useState(false);
  const complete = useRef(false), start = useRef(0), step = useRef<HTMLDivElement | null>(null), saveTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const excludedRef = useRef(excluded);
  excludedRef.current = excluded;
  useLayoutEffect(() => { step.current?.closest(".sheet-content")?.scrollTo({ top: 0 }); }, [detail]);
  useEffect(() => () => {
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
  }, []);
  const activities = receipt.activities;
  const selected = activities.filter(a => !excluded.includes(a.id));
  const finish = () => {
    if (complete.current || saving) return;
    const ids = activities
      .filter((a) => !excludedRef.current.includes(a.id))
      .map((a) => a.id);
    setProgress(1);
    setSaving(true);
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
    saveTimer.current = globalThis.setTimeout(() => {
      saveTimer.current = null;
      if (complete.current) return;
      complete.current = true;
      onComplete(ids);
    }, SYNC_REVIEW_SAVE_DELAY_MS);
  };
  const openDetail = (id: string) => {
    if (saving) return;
    setDetail(id);
  };
  const activity = activities.find(a => a.id === detail);
  if (activity) return <div ref={step} className="sync-review-step">
    <button type="button" className="fb-btn-line" disabled={saving} onClick={() => setDetail(null)}>← All activities</button>
    <p className="fb-kicker">ACTIVITY DETAILS</p><AppHeading level={1} role="display">{sportById(activity.sport).name}</AppHeading>
    <ActivityRoute activity={activity} units={state.units}/>
    <div className="moment-result"><strong>{formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units)}</strong><span>{clubDuration(activity.movingSec)}</span></div>
    <p className="fb-copy">{new Date(activity.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE })}</p>
    <ActivityMetricBars activity={activity} history={[...receipt.activities, ...state.activities]} units={state.units}/>
  </div>;
  return <div ref={step} className="sync-review-step">
    {receipt.preview && <p className="fb-kicker">SAMPLE PREVIEW · NO COMPETITION CREDIT</p>}
    <AppHeading level={1} role="display">Sync completed</AppHeading>
    <div className="sync-review-total">{clubDuration(selected.reduce((n, a) => n + a.movingSec, 0))}</div>
    <p className="fb-copy">{selected.length} of {activities.length} activities selected.</p>
    {activities.length > 0 && <ActivityRoute activity={selected[0] ?? activities[0]} units={state.units}/>}
    <div className="sync-review-list">{activities.map(a => <div key={a.id} className="sync-review-row">
      <label><input type="checkbox" disabled={saving} checked={!excluded.includes(a.id)} onChange={e => { if (saving) return; setExcluded(ids => e.target.checked ? ids.filter(id => id !== a.id) : [...ids, a.id]); setProgress(0); }} aria-label={`Count ${sportById(a.sport).name} activity ${a.id}`}/><span className="sr-only">Include activity</span></label>
      <button type="button" disabled={saving} onClick={() => openDetail(a.id)}><span><b>{sportById(a.sport).name}</b><small>{new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</small></span><span aria-hidden="true">↗</span></button>
      <ActivityMetricBars activity={a} history={[...receipt.activities, ...state.activities]} units={state.units}/>
    </div>)}</div>
    {!receipt.preview && excluded.length > 0 && <p className="fb-note">Deselected activities stay saved, excluded from competition.</p>}
    <div className="sync-review-footer">
      <div className={saving ? "club-sync-swipe sync-review-swipe is-saving" : "club-sync-swipe sync-review-swipe"} role="slider" tabIndex={0} aria-busy={saving} aria-label="Swipe to confirm synced activities" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={saving ? "Saving" : progress >= .85 ? "Ready to confirm" : "Slide right to confirm; Enter also confirms"}
        onKeyDown={e => { if (["Enter", " ", "End"].includes(e.key)) { e.preventDefault(); finish(); } }}
        onPointerDown={e => { if (saving || e.clientX - e.currentTarget.getBoundingClientRect().left > 64) return; start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (saving || !e.currentTarget.hasPointerCapture(e.pointerId)) return; setProgress(Math.max(0, Math.min(1, (e.clientX - start.current) / Math.max(1, e.currentTarget.clientWidth - 60)))); }}
        onPointerUp={e => { if (saving || !e.currentTarget.hasPointerCapture(e.pointerId)) return; const distance = (e.clientX - start.current) / Math.max(1, e.currentTarget.clientWidth - 60); e.currentTarget.releasePointerCapture(e.pointerId); if (distance >= .85) finish(); else setProgress(0); }}
        onPointerCancel={() => { if (!saving) setProgress(0); }}>
        <span className="sync-review-swipe-label" style={{ clipPath: `inset(0 0 0 ${Math.round(progress * 100)}%)` }}>{receipt.preview ? "Swipe to preview" : selected.length ? "Swipe to lock it in" : "Swipe to save as excluded"}</span><i style={{ left: `calc(${progress * 100}% - ${progress * 56}px)` }} aria-hidden="true">{saving ? <span className="sync-review-swipe-spin" /> : "→"}</i>
      </div>
      <p className="fb-note">{receipt.preview ? "Preview only. No activities or points will be added." : "Your synced activities are saved safely."}</p>
    </div>
  </div>;
}

function ActivityMetricBars({ activity, history, units }: { activity: SyncReviewReceipt["activities"][number]; history: CompeteState["activities"]; units: CompeteState["units"] }) {
  return <div className="sync-review-metrics">
    {syncReviewMetrics(activity, history, units).map(metric => <div key={metric.id} className="sync-review-metric" role="group" aria-label={`${metric.label}: ${metric.valueLabel}. ${metric.comparisonLabel}`}>
      <strong>{metric.label}: {metric.valueLabel}</strong>
      <div className="sync-review-metric-track" aria-hidden="true"><div style={{ width: `${(metric.fraction ?? 0) * 100}%` }}/></div>
    </div>)}
  </div>;
}
