"use client";

import { useEffect, useRef, useState } from "react";
import { activeMultiplier, activityFromSample, type TimedMultiplier, competeNow, dayKey, type SyncReviewReceipt, type ActivitySample, type FitnessHistoryStatus, type FitnessHistoryTicket, type ProviderId } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { Sheet } from "@/ui/sheet";
import { AppParagraph, SectionHeader } from "@/ui/section";

import { SyncReview } from "../club/sync-review";

const providers = [{ id: "strava", name: "Strava" }, { id: "whoop", name: "WHOOP" }, { id: "oura", name: "Oura" }] as const;

async function historyRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok || body.persisted === false) throw new Error(body.message ?? "History import is unavailable. Please try again.");
  return body as T;
}

type HistoryImportProps = { offer: ProviderId | null; onDismiss: () => void; showSettings?: boolean };

export function FitnessHistoryImport(props: HistoryImportProps) {
  const { user } = useAuth();
  return <AccountHistoryImport key={user?.id ?? "guest"} {...props} />;
}

function AccountHistoryImport({ offer, onDismiss, showSettings = true }: HistoryImportProps) {
  const { user, offlineMode } = useAuth();
  const { state, refresh } = useCompete();
  const [status, setStatus] = useState<FitnessHistoryStatus | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pending: true } | { pending: false; boost?: TimedMultiplier } | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<{ lease: string; provider: ProviderId; receipt: SyncReviewReceipt } | null>(null);
  const flight = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const live = Boolean(user && !offlineMode);
  const completed = Boolean(state?.calibrated || status?.completed);
  const connected = providers.filter(p => state?.links.some(l => l.provider === p.id && l.status === "connected"));

  useEffect(() => {
    if (!live) return;
    if (offer && !providers.some(p => p.id === offer)) { dismiss.current(); return; }
    let alive = true;
    void historyRequest<FitnessHistoryStatus>("/api/fitness/history").then(result => {
      if (!alive) return;
      setStatus(current => current?.completed ? current : result);
      if (!offer || flight.current) return;
      if (result.completed || state?.calibrated) dismiss.current();
      else { setDays(90); setError(""); setProvider(offer); }
    }).catch(() => {
      if (alive) { setError("Could not check history import. Please try again."); if (offer) setProvider(offer); }
    });
    return () => { alive = false; };
  }, [live, offer, state?.calibrated]);

  function close() {
    if (flight.current) return;
    afterClose.current = () => { if (mounted.current) dismiss.current(); };
    setProvider(null); setError("");
  }

  async function finishReview(selected?: readonly string[], quiet?: boolean) {
    if (!review || flight.current) return;
    flight.current = true;
    const confirmed = !quiet && Boolean(selected?.length);
    try {
      if (confirmed) {
        setConfirmation({ pending: true });
        const result = await historyRequest<{ boost?: TimedMultiplier }>("/api/fitness/sync", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ historyLease: review.lease, selected }) });
        if (!mounted.current) return;
        setStatus({ completed: true, provider: review.provider, days: Number(days) });
        void refresh({ skipSyncReview: true });
        setConfirmation({ pending: false, boost: result.boost });
        return;
      } else {
        await historyRequest("/api/fitness/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lease: review.lease }) });
      }
      if (mounted.current) dismiss.current();
    } catch (error) {
      if (mounted.current) {
        setConfirmation(null);
        setError(error instanceof Error ? error.message : "Could not finish the history import.");
        setProvider(review.provider);
        await historyRequest("/api/fitness/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lease: review.lease }) }).catch(() => {});
      }
    } finally {
      if (mounted.current) setReview(null);
      flight.current = false;
    }
  }

  async function importHistory() {
    if (!user || !provider || !live || !state || flight.current) return;
    const id = user.id;
    flight.current = true; setBusy(true); setError("");
    let ticket: FitnessHistoryTicket | undefined;
    try {
      ticket = await historyRequest<FitnessHistoryTicket>("/api/fitness/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, days }) });
      if (!mounted.current) return;
      const result = await historyRequest<{ activities?: ActivitySample[] }>("/api/fitness/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, historyLease: ticket.lease, reviewHistory: true }) });
      if (!mounted.current) return;
      const activitiesForReview = (result.activities ?? []).flatMap(sample => {
        const activity = activityFromSample(sample, "recorded");
        return activity ? [activity] : [];
      });
      if (!activitiesForReview.length) throw new Error("No activities found for that time range.");
      const draft = {
        lease: ticket.lease,
        provider,
        receipt: { account: id, day: dayKey(competeNow(state)), activities: activitiesForReview, preview: false, confirmBeforeSave: true },
      };
      afterClose.current = () => { if (mounted.current) setReview(draft); };
      setProvider(null);
      ticket = undefined;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "History import failed. Please try again.");
    } finally {
      if (ticket && mounted.current) await historyRequest("/api/fitness/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lease: ticket.lease }) }).catch(() => {});
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (confirmation) {
    const boost = confirmation.pending ? null : activeMultiplier(confirmation.boost, new Date());
    const title = confirmation.pending ? "Calibrating your Effort Boost…" : boost ? "You earned an Effort Boost" : "History imported";
    const body = confirmation.pending ? "Saving your selected workouts." : boost
      ? "Your training history earned you a 30-day head start across all sports. Eligible training advances your Effort progression faster."
      : "Your selected workouts are ready to view.";
    const closeConfirmation = () => {
      if (confirmation.pending) return;
      setConfirmation(null);
      dismiss.current();
    };
    return <Sheet open fullScreen title={title} body={body} onClose={closeConfirmation}>
      <div className="history-import-reveal">
        {boost && <strong className="history-import-reveal-value">{boost.label}</strong>}
        {!confirmation.pending && <button type="button" className="fb-btn" onClick={closeConfirmation}>Continue</button>}
      </div>
    </Sheet>;
  }

  if (review && state) return <SyncReview receipt={review.receipt} state={state} onComplete={finishReview} />;

  return <>
    {showSettings && <section className="fb-card">
      <SectionHeader title="Import fitness history" />
      <AppParagraph>{completed ? "History is locked in. This one-time import cannot run again." : "Choose up to 90 days of workouts. You can import history only once for your account."}</AppParagraph>
      <button type="button" className="fb-btn-line" disabled={busy || completed || !status || !live || !connected.length}
        onClick={() => { setDays(90); setError(""); setProvider(connected[0].id); }}>{completed ? "History imported" : "Import fitness history"}</button>
      {!completed && !connected.length && <AppParagraph>Connect Strava, WHOOP or Oura to import here, or use the mobile app for Apple Health and Health Connect.</AppParagraph>}
      {error && !provider ? <>
        <AppParagraph role="alert">{error}</AppParagraph>
        <button type="button" className="fb-btn-line" onClick={() => {
          void historyRequest<FitnessHistoryStatus>("/api/fitness/history").then(result => {
            if (mounted.current) { setStatus(result); setError(""); }
          }).catch(() => {});
        }}>Retry</button>
      </> : null}
    </section>}
    <Sheet open={Boolean(provider)} title="Import your fitness history" body="Choose how far back to import. This is a one-time import for your entire account, even if you change trackers. New workouts will keep syncing normally." onClose={close} onClosed={() => { const next = afterClose.current; afterClose.current = null; next?.(); }}>
      <div style={{ display: "grid", gap: 16 }}>
        {connected.length > 1 && !offer ? <label>Tracker <select disabled={busy} value={provider ?? ""} onChange={e => setProvider(e.target.value as ProviderId)}>{connected.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label> : null}
        <label style={{ display: "grid", gap: 12 }}>Last {days} days
          <input type="range" aria-label="History to import in days" min={1} max={90} step={1} value={days} disabled={busy} onChange={e => setDays(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--app-action-primary)" }} />
        </label>
        <AppParagraph>1–90 days. Choose Later to return here from Settings → Data Sync.</AppParagraph>
        {error ? <AppParagraph role="alert">{error}</AppParagraph> : null}
        <button type="button" className="fb-btn" disabled={busy || completed} onClick={() => void importHistory()}>{busy ? "Importing history…" : `Import ${days} days`}</button>
        <button type="button" className="fb-btn-line" disabled={busy} onClick={close}>Later</button>
      </div>
    </Sheet>
  </>;
}
