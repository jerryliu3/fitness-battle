import { useRef, useState, type ReactNode } from "react";
import { crewContractMetrics, crewContractTarget, crewContractValue, crewSeasonBounds, crewStampLabel, crewSeasonProgress, dayKey, APP_TIMEZONE, weeklyPeriodBounds, type CrewContractMetric, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { Pressable, TextInput, View } from "react-native";
import { useFocusStyles, FocusSheet, FocusButton } from "../ui/focus";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { DateTimeField } from "../ui/form-picker";

export function CrewPassportPanel({ crewId, input, children }: { crewId: string; input: CrewOverviewInput; children?: ReactNode }) {
  const { sport, units, now } = input;
  const c = useThemeColors(), f = useFocusStyles();
  const { data, error: loadError, reload, save: write, available, unavailable } = useCrewPassport(crewId, input);
  const contract = data?.contract;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [panel, setPanel] = useState<"contract" | "passport" | "season" | null>(null);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const season = data?.seasons.find(s => Date.parse(s.starts_at) <= Date.parse(now) && Date.parse(s.ends_at) > Date.parse(now));
  const stamps = data?.stamps.filter(s => s.season_id === season?.id) ?? [];
  const progress = contract ? Math.min(100, contract.value / contract.target * 100) : 0;
  function editContract() {
    setExpectedId(contract?.id ?? null); setTitle(contract?.title ?? ""); setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
  }
  function openSeason() {
    setTitle(""); setStart(dayKey(weeklyPeriodBounds(new Date(now)).startsAt, APP_TIMEZONE)); setEnd(""); setPanel("season"); setError("");
  }
  async function save(body: CrewPassportMutation) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try { await write(body); setEditing(false); setPanel(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your crew."); }
    finally { flight.current = false; setBusy(false); }
  }
  function submit() {
    try {
      if (panel === "season") void save({ action: "season", crewId, title, ...crewSeasonBounds(start, end) });
      else void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, target), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  return <>
    <Pressable accessibilityRole="button" onPress={() => { setPanel("contract"); setEditing(false); setError(""); }} style={[f.card, { backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.tennis, padding: 20, gap: 10 }]}>
      <AppText role="caption">Weekly contract</AppText>
      <AppText role="heading">{contract?.title ?? (available ? "Choose this week’s contract" : "Contracts unavailable")}</AppText>
      {contract && <><AppText role="caption">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}{progress >= 100 ? " · Reached" : ""}</AppText><View style={{ height: 5, backgroundColor: c.line, borderRadius: 4, overflow: "hidden" }}><View style={{ height: 5, width: `${progress}%`, backgroundColor: c.ink }} /></View></>}
    </Pressable>
    <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12 }}>{children}<Pressable accessibilityRole="button" onPress={() => { setPanel("passport"); setError(""); }} style={[f.card, { flex: 1, minHeight: 170, backgroundColor: c.surfaceInverse, justifyContent: "space-between", gap: 12 }]}>
      <AppText role="label" style={{ color: c.textOnInverse }}>Crew Passport</AppText><AppText role="heading" style={{ color: c.textOnInverse }}>{season?.title ?? "Your next chapter"}</AppText>
      <View style={{ flexDirection: "row", gap: 6 }}>{stamps.slice(0, 4).map(s => <AppText key={s.id} role="heading" style={{ color: c.tennis }}>✦</AppText>)}</View>
      <View accessibilityRole="progressbar" accessibilityLabel="Season elapsed" accessibilityValue={{ min: 0, max: 100, now: season ? Math.round(crewSeasonProgress(season, now)) : 0 }} style={{ height: 5, backgroundColor: c.line, borderRadius: 4, overflow: "hidden" }}><View style={{ height: 5, width: `${season ? crewSeasonProgress(season, now) : 0}%`, backgroundColor: c.tennis }} /></View>
      <AppText role="caption" style={{ color: c.textOnInverse }}>{season ? `${stamps.length} stamps · ${new Date(season.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: season.time_zone })}` : "Seasons & earned stamps"}</AppText>
    </Pressable></View>
    {!panel && error ? <AppText role="body" accessibilityRole="alert">{error || loadError}</AppText> : null}
    {!panel && (loadError || error) ? <FocusButton secondary label="Refresh passport" onPress={() => void reload()} /> : null}
    <FocusSheet open={panel !== null} minimal title={panel === "contract" ? "Weekly contract" : panel === "season" ? "New season" : "Your crew passport"} onClose={() => { if (!busy) setPanel(null); }}>
      {!available ? <AppText role="body">{unavailable}</AppText> : !data ? <><AppText role="body">{loadError || "Loading your crew…"}</AppText><FocusButton secondary label="Refresh" onPress={() => void reload()} /></> : panel === "season" || editing ? <View style={{ gap: 16 }}>
        <AppText role="caption">Name</AppText><TextInput accessibilityLabel="Name" maxLength={80} style={f.input} value={title} onChangeText={setTitle} editable={!busy} />
        {panel === "season" ? <><AppText role="caption">Start date · Eastern</AppText><DateTimeField label="Season start date · Eastern" mode="date" value={start} onChange={setStart} /><AppText role="caption">End date · Eastern</AppText><DateTimeField label="Season end date · Eastern" mode="date" value={end} onChange={setEnd} /><AppText role="caption" secondary>Contracts fully inside these dates earn stamps. Earned stamps stay in your passport.</AppText></> : <>
          <View style={f.chipRow}>{crewContractMetrics(sport).map(m => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === metric }} disabled={busy} onPress={() => setMetric(m.id)} style={[f.chip, m.id === metric && f.chipActive]}><AppText role="label">{m.label}</AppText></Pressable>)}</View>
          <AppText role="caption">Target</AppText><TextInput accessibilityLabel="Contract target" style={f.input} keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!busy} />
          <AppText role="caption" secondary>This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppText>
        </>}
        <FocusButton label={busy ? "Saving…" : panel === "season" ? "Create season" : "Save contract"} disabled={busy || !title.trim()} onPress={submit} />
      </View> : panel === "contract" ? <View style={{ gap: 16 }}>
        {contract ? <><AppText role="display">{contract.title}</AppText><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppText role="caption" secondary>{contract.contributors} / {contract.roster_size} teammates contributed.</AppText></> : <AppText role="body">Choose one shared objective for this week.</AppText>}
        <FocusButton label={contract ? "Change contract" : "Set contract"} onPress={editContract} />
      </View> : <View style={{ gap: 20 }}>
        {data.seasons.map(s => <View key={s.id} style={{ gap: 12 }}><AppText accessibilityRole="header" role="heading">{s.title}</AppText><AppText role="caption" secondary>{new Date(s.starts_at).toLocaleDateString("en-US", { timeZone: s.time_zone })} – {new Date(s.ends_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppText>{data.stamps.filter(stamp => stamp.season_id === s.id).map(stamp => <View key={stamp.id} style={[f.card, { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.actionSoft }]}><AppText role="heading">✦</AppText><View style={{ flex: 1, gap: 4 }}><AppText role="row">{crewStampLabel(stamp.code)}</AppText><AppText role="caption" secondary>{new Date(stamp.earned_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppText></View></View>)}</View>)}
        {!data.seasons.length && <AppText role="body">Start a season to keep your crew’s earned stamps.</AppText>}
        <FocusButton label="New season" onPress={openSeason} />
      </View>}
      {panel && data && (error || loadError) ? <AppText role="body" accessibilityRole="alert">{error || loadError}</AppText> : null}
    </FocusSheet>
  </>;
}
