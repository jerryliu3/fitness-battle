"use client";

import { useEffect, useRef, useState } from "react";
import { activityFromSample, type ActivitySample, type FitnessHistoryStatus, type FitnessHistoryTicket, type ProviderId, type ReadinessSample } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { Sheet } from "@/ui/sheet";
import { AppParagraph, SectionHeader } from "@/ui/section";

const providers = [{ id: "strava", name: "Strava" }, { id: "whoop", name: "WHOOP" }, { id: "oura", name: "Oura" }] as const;

async function historyRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok || body.persisted === false) throw new Error(body.message ?? "History import is unavailable. Please try again.");
  return body as T;
}

export function FitnessHistoryImport({ offer, onDismiss, showSettings = true }: {
  offer: ProviderId | null;
  onDismiss: () => void;
  showSettings?: boolean;
}) {
  const { user, offlineMode } = useAuth();
  const { state, dispatch } = useCompete();
  const [status, setStatus] = useState<FitnessHistoryStatus | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner = useRef(user?.id);
  owner.current = user?.id;
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
    let alive = true;
    setStatus(null); setProvider(null); setError(""); setBusy(false); afterClose.current = null;
    if (live) void historyRequest<FitnessHistoryStatus>("/api/fitness/history").then(result => { if (alive) setStatus(current => current?.completed ? current : result); })
      .catch(() => { if (alive) setError("Could not check history import. Please try again."); });
    return () => { alive = false; };
  }, [user?.id, live]);

  useEffect(() => {
    if (!offer || !live) return;
    let alive = true;
    void historyRequest<FitnessHistoryStatus>("/api/fitness/history").then(result => {
      if (!alive) return;
      setStatus(current => current?.completed ? current : result);
      if (!result.completed && !state?.calibrated && providers.some(p => p.id === offer)) { setDays(90); setError(""); setProvider(offer); }
      else dismiss.current();
    }).catch(() => { if (alive) { setProvider(offer); setError("Could not check history import. Please try again."); } });
    return () => { alive = false; };
  }, [offer, live, user?.id, state?.calibrated]);

  function close() {
    if (flight.current) return;
    afterClose.current = () => dismiss.current();
    setProvider(null); setError("");
  }

  async function importHistory() {
    if (!user || !provider || !live || flight.current) return;
    const id = user.id;
    flight.current = true; setBusy(true); setError("");
    let ticket: FitnessHistoryTicket | undefined;
    try {
      ticket = await historyRequest<FitnessHistoryTicket>("/api/fitness/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, days }) });
      if (!mounted.current || owner.current !== id) return;
      const result = await historyRequest<{ activities?: ActivitySample[]; readiness?: ReadinessSample[] }>("/api/fitness/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, historyLease: ticket.lease }) });
      if (!mounted.current || owner.current !== id) return;
      setStatus({ completed: true, provider, days });
      setProvider(null);
      afterClose.current = () => {
        if (!mounted.current || owner.current !== id) return;
        dispatch({ type: "apply-sync", accountId: id, provider, linkStatus: "connected", activities: (result.activities ?? []).flatMap(sample => {
          const activity = activityFromSample(sample, "recorded"); return activity ? [activity] : [];
        }), readiness: (result.readiness ?? []).filter(r => r.provider === provider).map(r => ({ id: r.id, provider, day: r.day, score: r.score })) });
        dismiss.current();
      };
      ticket = undefined;
    } catch (e) {
      if (mounted.current && owner.current === id) setError(e instanceof Error ? e.message : "History import failed. Please try again.");
    } finally {
      if (ticket && mounted.current && owner.current === id) await historyRequest("/api/fitness/history", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lease: ticket.lease }) }).catch(() => {});
      flight.current = false;
      if (mounted.current && owner.current === id) setBusy(false);
    }
  }

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
          const id = user?.id;
          void historyRequest<FitnessHistoryStatus>("/api/fitness/history").then(result => {
            if (mounted.current && owner.current === id) { setStatus(result); setError(""); }
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
