import { useRef, useState } from "react";
import { crewContractMetrics, crewContractTarget, crewContractValue, crewTargetSpec, type CrewContractMetric, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { Pressable, TextInput, View } from "react-native";
import { useFocusStyles, FocusSheet, FocusButton } from "../ui/focus";
import { NumberStepper } from "../ui/number-stepper";
import { AppText } from "../ui/section";

export function useCrewContractModal(crewId: string, input: CrewOverviewInput) {
  const { sport, units } = input;
  const f = useFocusStyles();
  const passport = useCrewPassport(crewId, input);
  const { data, error: loadError, reload, save: write, available, unavailable } = passport;
  const contract = data?.contract ?? null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState<number>(40);
  function editContract() {
    const nextMetric = contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m");
    setExpectedId(contract?.id ?? null); setTitle(contract?.title ?? ""); setMetric(nextMetric);
    setTarget(contract ? Math.max(1, Math.round(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1))) : crewTargetSpec(nextMetric).defaultValue);
    setEditing(true);
  }
  function openSummary() { setOpen(true); setEditing(false); setError(""); }
  function openEditor() { setOpen(true); setError(""); editContract(); }
  async function save(body: CrewPassportMutation) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try { await write(body); setEditing(false); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your crew."); }
    finally { flight.current = false; setBusy(false); }
  }
  function submit() {
    try {
      void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, String(target)), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  const targetSpec = crewTargetSpec(metric);
  const sheet = <FocusSheet open={open} minimal title="Weekly contract" onClose={() => { if (!busy) setOpen(false); }}>
    {!available ? <AppText role="body">{unavailable}</AppText> : !data ? <><AppText role="body">{loadError || "Loading your crew…"}</AppText><FocusButton secondary label="Refresh" onPress={() => void reload()} /></> : editing ? <View style={{ gap: 16 }}>
      <AppText role="caption">Name</AppText><TextInput accessibilityLabel="Name" maxLength={80} style={f.input} value={title} onChangeText={setTitle} editable={!busy} />
      <View style={f.chipRow}>{crewContractMetrics(sport).map(m => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === metric }} disabled={busy} onPress={() => { setMetric(m.id); setTarget(crewTargetSpec(m.id).defaultValue); }} style={[f.chip, m.id === metric && f.chipActive]}><AppText role="label">{m.label}</AppText></Pressable>)}</View>
      <AppText role="caption">Target</AppText>
      <NumberStepper label="Contract target" value={target} min={targetSpec.min} max={targetSpec.max} step={targetSpec.step} unit={targetSpec.unit} presets={targetSpec.presets} disabled={busy} onChange={setTarget} />
      <AppText role="caption" secondary>This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppText>
      <FocusButton label="Save contract" busy={busy} disabled={!title.trim()} onPress={submit} />
    </View> : <View style={{ gap: 16 }}>
      {contract ? <><AppText role="display">{contract.title}</AppText><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppText role="caption" secondary>{contract.contributors} / {contract.roster_size} teammates contributed.</AppText></> : <AppText role="body">Choose one shared objective for this week.</AppText>}
      <FocusButton label={contract ? "Change contract" : "Set contract"} onPress={editContract} />
    </View>}
    {open && data && (error || loadError) ? <AppText role="body" accessibilityRole="alert">{error || loadError}</AppText> : null}
  </FocusSheet>;
  return { passport, contract, openSummary, openEditor, sheet };
}
