"use client";
import { AppHeading } from "@/ui/section";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { APP_TIMEZONE, clubDuration, formatVolume, sportById, type CompeteState, type CompetitionMoment, type SyncReviewReceipt } from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
import { ActivityRoute } from "@/components/routes/activity-route";
import { CompetitionMoment as Moment } from "./competition-moment";

export function SyncReview({ receipt, state, moment, debug = false, remaining = 0, onComplete, onAcknowledge = () => {} }: {
  receipt: SyncReviewReceipt | null; state: CompeteState; debug?: boolean; moment?: CompetitionMoment | null; remaining?: number;
  onComplete: (selected?: readonly string[], quiet?: boolean) => unknown; onAcknowledge?: () => void;
}) {
  const title = receipt ? "Review your activities" : moment?.plan.hasOvertake ? "Your overtakes" : "Your field changed";
  return <Sheet open title={title} body="" fullScreen minimal={!receipt} scrollResetKey={receipt ? "review" : moment?.id} onClose={() => { if (receipt) onComplete(undefined, true); }}>
    {debug && receipt && <p className="fb-kicker" style={{ textAlign: "center", marginTop: 20 }}>DEBUG PREVIEW · LOCAL DATA ONLY</p>}
    {receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete}/> : moment ? <Moment key={moment.id} moment={moment} debug={debug} remaining={remaining} onConfirm={onAcknowledge}/> : null}
  </Sheet>;
}
function Review({ receipt, state, onComplete }: { receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [saving, setSaving] = useState(false);
  const complete = useRef(false), start = useRef(0), step = useRef<HTMLDivElement | null>(null), saveTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  useLayoutEffect(() => { step.current?.closest(".sheet-content")?.scrollTo({ top: 0 }); }, [detail]);
  useEffect(() => () => {
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
  }, []);
  const activities = receipt.activities;
  const selected = activities.filter(a => !excluded.includes(a.id));
  const finish = () => {
    if (complete.current || saving) return;
    const ids = selected.map((a) => a.id);
    setProgress(1);
    setSaving(true);
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
    saveTimer.current = globalThis.setTimeout(() => {
      saveTimer.current = null;
      if (complete.current) return;
      complete.current = true;
      onComplete(ids);
    }, 900);
  };
  const activity = activities.find(a => a.id === detail);
  if (activity) return <div ref={step} className="sync-review-step">
    <button type="button" className="fb-btn-line" disabled={saving} onClick={() => setDetail(null)}>← All activities</button>
    <p className="fb-kicker">ACTIVITY DETAILS</p><AppHeading level={1} role="display">{sportById(activity.sport).name}</AppHeading>
    <ActivityRoute activity={activity} units={state.units}/>
    <div className="moment-result"><strong>{formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units)}</strong><span>{clubDuration(activity.movingSec)}</span></div>
    <p className="fb-copy">{new Date(activity.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE })}</p>
    <p className="fb-note">{activity.verified ? "GPS Tracked" : "Open activity"}{activity.avgHr ? ` · ${activity.avgHr} bpm average` : ""}{activity.elevationGainM != null ? ` · ${activity.elevationGainM} m elevation gain` : ""}</p>
  </div>;
  return <div ref={step} className="sync-review-step">
    <p className="fb-kicker">{receipt.preview ? "SAMPLE PREVIEW · NO COMPETITION CREDIT" : "SYNC COMPLETE · YOUR NEXT MOVE"}</p>
    <AppHeading level={1} role="display">Make it count.</AppHeading>
    <div className="sync-review-total">{clubDuration(selected.reduce((n, a) => n + a.movingSec, 0))}</div>
    <p className="fb-copy">{selected.length} of {activities.length} activities selected. Review your effort, then slide to see what changed.</p>
    {activities.length > 0 && <ActivityRoute activity={selected[0] ?? activities[0]} units={state.units}/>}
    <div className="sync-review-list">{activities.map(a => <div key={a.id} className="sync-review-row">
      <label><input type="checkbox" disabled={saving} checked={!excluded.includes(a.id)} onChange={e => { if (saving) return; setExcluded(ids => e.target.checked ? ids.filter(id => id !== a.id) : [...ids, a.id]); setProgress(0); }} aria-label={`Count ${sportById(a.sport).name} activity ${a.id}`}/><span className="sr-only">Include activity</span></label>
      <button type="button" disabled={saving} onClick={() => setDetail(a.id)}><span><b>{sportById(a.sport).name}</b><small>{formatVolume(a.sport, a.distanceM, a.movingSec, state.units)} · {clubDuration(a.movingSec)}</small><small>{new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} · {a.verified ? "GPS Tracked" : "Open"}</small></span><span aria-hidden="true">↗</span></button>
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
