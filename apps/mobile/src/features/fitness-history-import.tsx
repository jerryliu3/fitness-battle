import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { activityFromSample, type ActivitySample, type FitnessHistoryStatus, type FitnessHistoryTicket, type ProviderId, type ReadinessSample } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { createAppleHealthDeps, createHealthConnectDeps, syncAppleHealth, syncHealthConnect } from "../lib/device-health";
import { providersForDevice } from "../lib/platform-providers";
import { FocusButton, FocusSheet } from "../ui/focus";
import { NumberPicker } from "../ui/form-picker";
import { AppText, SectionHeader } from "../ui/section";

const supported = new Set(["apple_health", "google_health", "strava", "whoop", "oura"]);

type HistoryImportProps = { offer: ProviderId | null; onDismiss: () => void; showSettings?: boolean };

export function FitnessHistoryImport(props: HistoryImportProps) {
  const { user } = useAuth();
  return <AccountHistoryImport key={user?.id ?? "guest"} {...props} />;
}

function AccountHistoryImport({ offer, onDismiss, showSettings = true }: HistoryImportProps) {
  const { user, accessToken, offlineMode } = useAuth();
  const { state, dispatch } = useCompeteStore();
  const [status, setStatus] = useState<FitnessHistoryStatus | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [days, setDays] = useState("90");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  async function importHistory() {
    if (!user || !provider || !live || flight.current) return;
    const id = user.id;
    const token = accessToken;
    flight.current = true; setBusy(true); setError("");
    let ticket: FitnessHistoryTicket | undefined;
    try {
      ticket = await requestApi<FitnessHistoryTicket>(mobileEnv.apiUrl, token, "/api/fitness/history", { body: { provider, days: Number(days) } });
      if (!mounted.current) return;
      let activities: ActivitySample[] = [], readiness: ReadinessSample[] = [];
      if (provider === "apple_health" || provider === "google_health") {
        const deps = { syncRange: ticket, historyLease: ticket.lease, getAccessToken: async () => ({ token: token ?? undefined, userId: id }) };
        const result = provider === "apple_health"
          ? await syncAppleHealth(createAppleHealthDeps(deps))
          : await syncHealthConnect(createHealthConnectDeps(deps));
        if (!result.ok) throw new Error(result.message);
        activities = result.activities ?? [];
      } else {
        const result = await requestApi<{ activities?: ActivitySample[]; readiness?: ReadinessSample[] }>(mobileEnv.apiUrl, token, "/api/fitness/sync", { body: { provider, historyLease: ticket.lease } });
        activities = result.activities ?? []; readiness = result.readiness ?? [];
      }
      if (!mounted.current) return;
      // Lock the settings action immediately, independently of the sync receipt.
      setStatus({ completed: true, provider, days: Number(days) });
      setProvider(null);
      afterClose.current = () => {
        if (!mounted.current) return;
        dispatch({ type: "apply-sync", accountId: id, provider, linkStatus: "connected", activities: activities.flatMap(sample => {
          const activity = activityFromSample(sample, "recorded"); return activity ? [activity] : [];
        }), readiness: readiness.filter(r => r.provider === provider).map(r => ({ id: r.id, provider, day: r.day, score: r.score })) });
        dismiss.current();
      };
      ticket = undefined;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "History import failed. Please try again.");
    } finally {
      if (ticket) await requestApi(mobileEnv.apiUrl, token, "/api/fitness/history", { method: "DELETE", body: { lease: ticket.lease } }).catch(() => {});
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <>
    {showSettings && <View style={{ gap: 12 }}>
      <SectionHeader title="Import fitness history" />
      <AppText secondary>{completed ? "History is locked in. This one-time import cannot run again." : "Choose up to 90 days of workouts. You can import history only once for your account."}</AppText>
      <FocusButton secondary label={completed ? "History imported" : "Import fitness history"} disabled={busy || completed || !status || !live || !providers.length}
        onPress={() => { setDays("90"); setError(""); setProvider(providers[0].id); }} />
      {!completed && !providers.length && <AppText secondary>Connect Apple Health, Health Connect, Strava, WHOOP or Oura to import history.</AppText>}
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
