import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { activeMultiplier, activityFromSample, type TimedMultiplier, competeNow, dayKey, type SyncReviewReceipt, type ActivitySample, type FitnessHistoryStatus, type FitnessHistoryTicket, type ProviderId } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { createAppleHealthDeps, createHealthConnectDeps, syncAppleHealth, syncHealthConnect } from "../lib/device-health";
import { providersForDevice } from "../lib/platform-providers";
import { FocusButton, FocusSheet } from "../ui/focus";
import { NumberPicker } from "../ui/form-picker";
import { AppText, SectionHeader } from "../ui/section";

import { SyncReview } from "./sync-review";

const supported = new Set(["apple_health", "google_health", "strava", "whoop", "oura"]);

type HistoryImportProps = { offer: ProviderId | null; onDismiss: () => void; showSettings?: boolean };

type ImportConfirmation = { pending: true } | { pending: false; boost?: TimedMultiplier };

function HistoryImportResult({ confirmation, onContinue }: {
  confirmation: ImportConfirmation;
  onContinue: () => void;
}) {
  const boost = confirmation.pending ? null : activeMultiplier(confirmation.boost, new Date());
  const title = confirmation.pending ? "Calibrating your Effort Boost…" : boost ? "You earned an Effort Boost" : "History imported";
  const body = confirmation.pending ? "Saving your selected workouts." : boost
    ? "Your training history earned you a 30-day head start across all sports. Eligible training advances your Effort progression faster."
    : "Your selected workouts are ready to view.";
  return <FocusSheet open fullScreen title={title} body={body} onClose={onContinue}>
    <View style={{ alignItems: "center", gap: 24, paddingBlock: 24 }}>
      {boost && <AppText role="display">{boost.label}</AppText>}
      {!confirmation.pending && <FocusButton label="Continue" onPress={onContinue} />}
    </View>
  </FocusSheet>;
}

export function HistoryImportPreview() {
  const [confirmation, setConfirmation] = useState<ImportConfirmation | null>(null);
  useEffect(() => {
    if (!confirmation?.pending) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setConfirmation({ pending: false, boost: {
        multiplier: 3,
        startsAt: new Date(now).toISOString(),
        boostEndsAt: new Date(now + 30 * 86_400_000).toISOString(),
      } });
    }, 650);
    return () => clearTimeout(timer);
  }, [confirmation]);
  return confirmation
    ? <HistoryImportResult confirmation={confirmation} onContinue={() => {
        if (!confirmation.pending) setConfirmation(null);
      }} />
    : <FocusButton secondary label="Preview history import" onPress={() => setConfirmation({ pending: true })} />;
}

export function FitnessHistoryImport(props: HistoryImportProps) {
  const { user } = useAuth();
  return <AccountHistoryImport key={user?.id ?? "guest"} {...props} />;
}

function AccountHistoryImport({ offer, onDismiss, showSettings = true }: HistoryImportProps) {
  const { user, accessToken, offlineMode } = useAuth();
  const { state, refresh } = useCompeteStore();
  const [status, setStatus] = useState<FitnessHistoryStatus | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [days, setDays] = useState("90");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<ImportConfirmation | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState<{ lease: string; provider: ProviderId; receipt: SyncReviewReceipt } | null>(null);
  const flight = useRef(false);
  const afterClose = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const live = Boolean(user && accessToken && !offlineMode);
  const completed = Boolean(state?.calibrated || status?.completed);
  const providers = providersForDevice().filter(p => supported.has(p.id) && state?.links.some(l => l.provider === p.id && l.status === "connected"));

  useEffect(() => {
    if (!live) return;
    if (offer && !supported.has(offer)) { dismiss.current(); return; }
    let alive = true;
    void requestApi<FitnessHistoryStatus>(mobileEnv.apiUrl, accessToken, "/api/fitness/history").then(result => {
      if (!alive) return;
      setStatus(current => current?.completed ? current : result);
      if (!offer || flight.current) return;
      if (result.completed || state?.calibrated) dismiss.current();
      else { setDays("90"); setError(""); setProvider(offer); }
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
        const result = await requestApi<{ boost?: TimedMultiplier }>(mobileEnv.apiUrl, accessToken, "/api/fitness/sync", { method: "PATCH", body: { historyLease: review.lease, selected } });
        if (!mounted.current) return;
        setStatus({ completed: true, provider: review.provider, days: Number(days) });
        void refresh({ skipSyncReview: true });
        setConfirmation({ pending: false, boost: result.boost });
        return;
      } else {
        await requestApi(mobileEnv.apiUrl, accessToken, "/api/fitness/history", { method: "DELETE", body: { lease: review.lease } });
      }
      if (mounted.current) dismiss.current();
    } catch (error) {
      if (mounted.current) {
        setConfirmation(null);
        setError(error instanceof Error ? error.message : "Could not finish the history import.");
        setProvider(review.provider);
        await requestApi(mobileEnv.apiUrl, accessToken, "/api/fitness/history", { method: "DELETE", body: { lease: review.lease } }).catch(() => {});
      }
    } finally {
      if (mounted.current) setReview(null);
      flight.current = false;
    }
  }

  async function importHistory() {
    if (!user || !provider || !live || !state || flight.current) return;
    const id = user.id;
    const token = accessToken;
    flight.current = true; setBusy(true); setError("");
    let ticket: FitnessHistoryTicket | undefined;
    try {
      ticket = await requestApi<FitnessHistoryTicket>(mobileEnv.apiUrl, token, "/api/fitness/history", { body: { provider, days: Number(days) } });
      if (!mounted.current) return;
      let activities: ActivitySample[];
      if (provider === "apple_health" || provider === "google_health") {
        const deps = { syncRange: ticket, historyLease: ticket.lease, reviewHistory: true, getAccessToken: async () => ({ token: token ?? undefined, userId: id }) };
        const result = provider === "apple_health"
          ? await syncAppleHealth(createAppleHealthDeps(deps))
          : await syncHealthConnect(createHealthConnectDeps(deps));
        if (!result.ok) throw new Error(result.message);
        activities = result.activities ?? [];
      } else {
        const result = await requestApi<{ activities?: ActivitySample[] }>(mobileEnv.apiUrl, token, "/api/fitness/sync", { body: { provider, historyLease: ticket.lease, reviewHistory: true } });
        activities = result.activities ?? [];
      }
      if (!mounted.current) return;
      const activitiesForReview = activities.flatMap(sample => {
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
      if (ticket) await requestApi(mobileEnv.apiUrl, token, "/api/fitness/history", { method: "DELETE", body: { lease: ticket.lease } }).catch(() => {});
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  if (confirmation) return <HistoryImportResult confirmation={confirmation} onContinue={() => {
    if (confirmation.pending) return;
    setConfirmation(null);
    dismiss.current();
  }} />;
  if (review && state) return <SyncReview receipt={review.receipt} state={state} onComplete={finishReview} />;

  return <>
    {showSettings && !completed && <View style={{ gap: 12 }}>
      <SectionHeader title="Import fitness history" />
      <AppText secondary>Choose up to 90 days of workouts. You can import history only once for your account.</AppText>
      <FocusButton secondary label="Import fitness history" disabled={busy || !status || !live || !providers.length}
        onPress={() => { setDays("90"); setError(""); setProvider(providers[0].id); }} />
      {!providers.length && <AppText secondary>Connect Apple Health, Health Connect, Strava, WHOOP or Oura to import history.</AppText>}
      {error && !provider ? <>
        <AppText secondary>{error}</AppText>
        <FocusButton secondary label="Retry" onPress={() => {
          void requestApi<FitnessHistoryStatus>(mobileEnv.apiUrl, accessToken, "/api/fitness/history").then(result => {
            if (mounted.current) { setStatus(result); setError(""); }
          }).catch(() => {});
        }} />
      </> : null}
    </View>}
    <FocusSheet open={Boolean(provider)} title="Import your fitness history" body="Choose how far back to import. This is a one-time import for your entire account, even if you change trackers. New workouts will keep syncing normally." onClose={close} onClosed={() => { const next = afterClose.current; afterClose.current = null; next?.(); }}>
      <View style={{ gap: 16 }}>
        {providers.length > 1 && !offer ? providers.map(p => <FocusButton key={p.id} secondary={provider !== p.id} label={p.name} disabled={busy} onPress={() => setProvider(p.id)} />) : null}
        <NumberPicker label="History to import" value={days} onChange={setDays} max={90} unit="days" />
        <AppText secondary>1–90 days. Choose Later to return here from Settings → Data Sync.</AppText>
        {error ? <AppText secondary>{error}</AppText> : null}
        <FocusButton label={busy ? "Importing history…" : `Import ${days} days`} disabled={busy || completed || !Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 90} onPress={() => void importHistory()} />
        <FocusButton secondary label="Later" disabled={busy} onPress={close} />
      </View>
    </FocusSheet>
  </>;
}
