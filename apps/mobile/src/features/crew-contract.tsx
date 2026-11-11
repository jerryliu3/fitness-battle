import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  crewContractMetrics, crewContractTarget, crewContractValue,
  type CrewContractMetric, type CrewPassport, type CrewPassportMutation, type UnitSystem,
} from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCachedApi } from "../lib/use-cached-api";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { useFocusStyles, FocusSheet, FocusButton } from "../ui/focus";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";

export function CrewContractPanel({ crewId, sport, units }: { crewId: string; sport: string; units?: UnitSystem }) {
  const c = useThemeColors(), f = useFocusStyles();
  const { user, accessToken, offlineMode } = useAuth();
  const live = !!user && !!accessToken && !offlineMode;
  const api = useCachedApi<CrewPassport>(live ? `/api/crews/passport?crewId=${encodeURIComponent(crewId)}` : null);
  const data = api.data, contract = data?.contract;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [panel, setPanel] = useState<"contract" | null>(null);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState("");
  const progress = contract ? Math.min(100, contract.value / contract.target * 100) : 0;
  function editContract() {
    setExpectedId(contract?.id ?? null); setTitle(contract?.title ?? ""); setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
  }
  async function save(body: CrewPassportMutation) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try {
      await requestApi(mobileEnv.apiUrl, accessToken, "/api/crews/passport", { body });
      setEditing(false); setPanel(null);
      const refreshed = await api.reload();
      if (!refreshed) throw Error("Saved. Refresh to load your updated crew.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your crew."); void api.reload(); }
    finally { flight.current = false; setBusy(false); }
  }
  function submit() {
    try {
      void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, target), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  return <>
    <Pressable accessibilityRole="button" onPress={() => { setPanel("contract"); setEditing(false); setError(""); }} style={[f.card, { backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.tennis, padding: 20, gap: 10 }]}>
      <AppText role="caption">Weekly contract ↗</AppText><AppText role="heading">{contract?.title ?? (live ? "Choose this week’s contract" : "Contracts unavailable")}</AppText>
      {contract && <><AppText role="caption">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}{progress >= 100 ? " · Reached" : ""}</AppText><View style={{ height: 5, backgroundColor: c.line, borderRadius: 4, overflow: "hidden" }}><View style={{ height: 5, width: `${progress}%`, backgroundColor: c.ink }} /></View></>}
    </Pressable>
    <FocusSheet open={panel !== null} minimal title="Weekly contract" onClose={() => { if (!busy) setPanel(null); }}>
      {!live ? <AppText role="body">Connect your account to manage contracts.</AppText> : !data ? <><AppText role="body">{api.error || "Loading your crew…"}</AppText><FocusButton secondary label="Refresh" onPress={() => void api.reload()} /></> : editing ? <View style={{ gap: 16 }}>
        <AppText role="caption">Name</AppText><TextInput accessibilityLabel="Name" maxLength={80} style={f.input} value={title} onChangeText={setTitle} editable={!busy} />
        <View style={f.chipRow}>{crewContractMetrics(sport).map(m => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === metric }} disabled={busy} onPress={() => setMetric(m.id)} style={[f.chip, m.id === metric && f.chipActive]}><AppText role="label">{m.label}</AppText></Pressable>)}</View>
        <AppText role="caption">Target</AppText><TextInput accessibilityLabel="Contract target" style={f.input} keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!busy} />
        <AppText role="caption" secondary>This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppText>
        <FocusButton label={busy ? "Saving…" : "Save contract"} disabled={busy || !title.trim()} onPress={submit} />
      </View> : <View style={{ gap: 16 }}>
        {contract ? <><AppText role="display">{contract.title}</AppText><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppText role="caption" secondary>{contract.contributors} / {contract.roster_size} teammates contributed.</AppText></> : <AppText role="body">Choose one shared objective for this week.</AppText>}
        <FocusButton label={contract ? "Change contract" : "Set contract"} onPress={editContract} />
      </View>}
      {error || api.error ? <AppText role="body" accessibilityRole="alert">{error || api.error}</AppText> : null}
    </FocusSheet>
  </>;
}
