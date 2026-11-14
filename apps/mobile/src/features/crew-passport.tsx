import { useRef, useState } from "react";
import { APP_TIMEZONE, crewContractMetrics, crewContractTarget, crewContractValue, crewPassportCardModel, crewSeasonBounds, crewStampIcon, crewStampLabel, dayKey, weeklyPeriodBounds, type CrewContractMetric, type CrewPassport, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useFocusStyles, FocusSheet, FocusButton } from "../ui/focus";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { AppText, TextAction } from "../ui/section";
import { DateTimeField } from "../ui/form-picker";

export function useCrewContractModal(crewId: string, input: CrewOverviewInput) {
  const { sport, units, now } = input;
  const c = useThemeColors(), f = useFocusStyles();
  const passport = useCrewPassport(crewId, input);
  const { data, error: loadError, reload, save: write, available, unavailable } = passport;
  const contract = data?.contract ?? null;
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
  function editContract() {
    setExpectedId(contract?.id ?? null); setTitle(contract?.title ?? ""); setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
  }
  function openSummary() { setPanel("contract"); setEditing(false); setError(""); }
  function openEditor() { setPanel("contract"); setError(""); editContract(); }
  function openPassport() { setPanel("passport"); setEditing(false); setError(""); }
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
  const sheet = <FocusSheet open={panel !== null} minimal title={panel === "contract" ? "Weekly contract" : panel === "season" ? "New season" : "Crew passport"} onClose={() => { if (!busy) setPanel(null); }}>
    {!available ? <AppText role="body">{unavailable}</AppText> : !data ? <><AppText role="body">{loadError || "Loading your crew…"}</AppText><FocusButton secondary label="Refresh" onPress={() => void reload()} /></> : panel === "season" || editing ? <View style={{ gap: 16 }}>
      <AppText role="caption">Name</AppText><TextInput accessibilityLabel="Name" maxLength={80} style={f.input} value={title} onChangeText={setTitle} editable={!busy} />
      {panel === "season" ? <>
        <AppText role="caption">Start date · Eastern</AppText><DateTimeField label="Season start date · Eastern" mode="date" value={start} onChange={setStart} />
        <AppText role="caption">End date · Eastern</AppText><DateTimeField label="Season end date · Eastern" mode="date" value={end} onChange={setEnd} />
        <AppText role="caption" secondary>Contracts fully inside these dates earn stamps. Earned stamps stay in your passport.</AppText>
      </> : <>
        <View style={f.chipRow}>{crewContractMetrics(sport).map(m => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === metric }} disabled={busy} onPress={() => setMetric(m.id)} style={[f.chip, m.id === metric && f.chipActive]}><AppText role="label">{m.label}</AppText></Pressable>)}</View>
        <AppText role="caption">Target</AppText><TextInput accessibilityLabel="Contract target" style={f.input} keyboardType="decimal-pad" value={target} onChangeText={setTarget} editable={!busy} />
        <AppText role="caption" secondary>This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppText>
      </>}
      <FocusButton label={busy ? "Saving…" : panel === "season" ? "Create season" : "Save contract"} disabled={busy || !title.trim()} onPress={submit} />
    </View> : panel === "contract" ? <View style={{ gap: 16 }}>
      {contract ? <><AppText role="display">{contract.title}</AppText><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppText role="caption" secondary>{contract.contributors} / {contract.roster_size} teammates contributed.</AppText></> : <AppText role="body">Choose one shared objective for this week.</AppText>}
      <FocusButton label={contract ? "Change contract" : "Set contract"} onPress={editContract} />
    </View> : <View style={{ gap: 20 }}>
      {(data.seasons ?? []).map(s => <View key={s.id} style={{ gap: 12 }}>
        <AppText accessibilityRole="header" role="heading">{s.title}</AppText>
        <AppText role="caption" secondary>{new Date(s.starts_at).toLocaleDateString("en-US", { timeZone: s.time_zone })} – {new Date(s.ends_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppText>
        {(data.stamps ?? []).filter(stamp => stamp.season_id === s.id).map(stamp => <View key={stamp.id} style={[f.card, { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.actionSoft }]}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" }}><AppIcon name={crewStampIcon(stamp.code)} size={18} color={c.tennis} /></View>
          <View style={{ flex: 1, gap: 4 }}><AppText role="row">{crewStampLabel(stamp.code)}</AppText><AppText role="caption" secondary>{new Date(stamp.earned_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppText></View>
        </View>)}
      </View>)}
      {!(data.seasons ?? []).length && <AppText role="body">Start a season to keep your crew’s earned stamps.</AppText>}
      <FocusButton label="New season" onPress={openSeason} />
    </View>}
    {panel && data && (error || loadError) ? <AppText role="body" accessibilityRole="alert">{error || loadError}</AppText> : null}
  </FocusSheet>;
  return { passport, contract, openSummary, openEditor, openPassport, sheet };
}

export function CrewPassportCard({ passport, crewName, now, onOpen }: {
  passport: CrewPassport | null | undefined;
  crewName?: string;
  now: string;
  onOpen: () => void;
}) {
  const c = useThemeColors(), f = useFocusStyles();
  const model = crewPassportCardModel(passport, crewName, now);
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <AppText role="heading" accessibilityRole="header">Crew passport</AppText>
      <TextAction label="All records →" accessibilityLabel="View all crew passport records" onPress={onOpen} />
    </View>
    <View style={[f.card, { backgroundColor: c.card, borderColor: c.line, borderRadius: 24, padding: 20, gap: 16, overflow: "hidden" }]}>
      <Svg width={140} height={140} viewBox="0 0 140 140" style={{ position: "absolute", top: 0, right: 0 }} pointerEvents="none">
        <Circle cx={132} cy={8} r={66} stroke={c.line} strokeWidth={1} fill="none" opacity={0.65} />
        <Circle cx={132} cy={8} r={104} stroke={c.line} strokeWidth={1} fill="none" opacity={0.45} />
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <AppText role="field" secondary style={{ flex: 1 }} numberOfLines={1}>{model.eyebrow}</AppText>
        <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: c.card }}>
          <AppText role="nav" secondary>{model.seasonBadge}</AppText>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <AppText role="display">{model.headline}</AppText>
        <AppText role="support" secondary>{model.subtitle}</AppText>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        {model.slots.map((slot) => {
          const earned = slot.kind === "earned";
          const next = slot.kind === "next";
          return <Pressable key={slot.id} accessibilityRole="button" accessibilityLabel={slot.label} onPress={onOpen} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={{
              width: "100%", maxWidth: 56, aspectRatio: 1, borderRadius: 999,
              backgroundColor: earned ? c.surfaceInverse : next ? c.actionSoft : c.soft,
              borderWidth: earned ? 2 : 1.5,
              borderColor: earned ? c.surfaceInverse : next ? c.tennis : c.line,
              borderStyle: earned ? "solid" : "dashed",
              alignItems: "center", justifyContent: "center", padding: 3,
            }}>
              <View style={{
                width: "100%", height: "100%", borderRadius: 999,
                borderWidth: earned ? 1 : 0, borderColor: c.line,
                alignItems: "center", justifyContent: "center",
              }}>
                {earned ? <AppIcon name={slot.icon} size={20} color={c.tennis} />
                  : next ? <AppIcon name="plus" size={18} color={c.ink} />
                    : <AppText role="heading" secondary>?</AppText>}
              </View>
            </View>
            <AppText role="nav" secondary={!earned && !next} numberOfLines={1}>{slot.label}</AppText>
          </Pressable>;
        })}
      </View>
      <View style={{ height: 1, backgroundColor: c.line }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <AppText role="caption" secondary style={{ flex: 1 }}>{model.footerNote}</AppText>
        <Pressable accessibilityRole="button" onPress={onOpen} style={{ backgroundColor: c.surfaceInverse, paddingHorizontal: 16, minHeight: 40, borderRadius: 99, alignItems: "center", justifyContent: "center" }}>
          <AppText role="label" style={{ color: c.textOnInverse }}>Open passport →</AppText>
        </Pressable>
      </View>
    </View>
  </View>;
}
