import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { crewOverview, readCrewReplay, weeklyPeriodBounds, type CrewActivityPage, type CrewOverviewInput } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { useFocusStyles, FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { UserAvatar } from "../ui/user-avatar";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { CrewRelay } from "./crew-relay";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

type Props = CrewOverviewInput & { crewId: string; onSelectMember: (id: string) => void; hiddenIds: readonly string[]; children?: ReactNode };
export function CrewOverview({ crewId, onSelectMember, hiddenIds, children, ...input }: Props) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const reduced = useReducedMotion();
  const { accessToken, offlineMode } = useAuth();
  const [replayEntries, setReplayEntries] = useState<CrewOverviewInput["entries"]>();
  const [replayError, setReplayError] = useState("");
  useEffect(() => {
    setReplayEntries(undefined);
    setReplayError("");
    if (offlineMode) { setReplayEntries(input.entries); return; }
    if (!accessToken) return;
    let active = true;
    const since = weeklyPeriodBounds(new Date(input.now)).startsAt.toISOString();
    void readCrewReplay(cursor => {
      const params = new URLSearchParams({ crewId, since, limit: "100" });
      if (cursor) { params.set("before", cursor.before); params.set("beforeId", cursor.beforeId); }
      return requestApi<CrewActivityPage>(mobileEnv.apiUrl, accessToken, `/api/crews/activities?${params}`);
    }, input.sport).then(rows => { if (active) setReplayEntries(rows); }).catch(() => { if (active) setReplayError("Replay unavailable"); });
    return () => { active = false; };
  }, [crewId, accessToken, offlineMode]);
  const full = crewOverview(input);
  const lastFrame = full.lastFrame;
  const [frame, setFrame] = useState(lastFrame);
  const [playing, setPlaying] = useState(false);
  const [detail, setDetail] = useState<"contract" | "passport" | "story" | null>(null);
  const [trackWidth, setTrackWidth] = useState(1);
  const view = crewOverview({ ...input, replayEntries }, frame);
  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state !== "active") setPlaying(false); });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setFrame(old => Math.min(lastFrame, old + 1)), reduced ? 900 : 650);
    return () => clearInterval(timer);
  }, [playing, reduced, lastFrame]);
  useEffect(() => { if (frame === lastFrame) setPlaying(false); }, [frame, lastFrame]);
  const selectFrame = (value: number) => { if (!replayEntries) return; setPlaying(false); setFrame(Math.max(0, Math.min(lastFrame, value))); };
  return <View style={{ gap: 28 }}>
    <View style={[f.card, { backgroundColor: c.actionSoft, borderColor: c.tennis, gap: 12, overflow: "hidden", padding: 20 }]}>
      <AppText role="label">This week · {input.sport}</AppText>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <AppText role="hero">{view.reading}</AppText><AppText role="body">{view.targetReading != null ? `/ ${view.targetReading} ` : ""}{view.unit}</AppText></View>
      {input.previousDistanceM != null && !view.relay.sessions && <View style={{ padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
        <AppText role="caption">Crew Ghost · {view.volume(input.previousDistanceM)} last week</AppText>
      </View>}
      <View>
        <CrewRelay {...input} entries={view.entries} compact hiddenIds={hiddenIds} onSelectMember={onSelectMember} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }}>
        <Pressable accessibilityRole="button" disabled={!replayEntries} accessibilityLabel={playing ? "Pause replay" : "Replay this week"} accessibilityState={{ selected: playing }} onPress={() => { if (!playing && frame === lastFrame) setFrame(0); setPlaying(!playing); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceInverse, opacity: replayEntries ? 1 : 0.4, alignItems: "center", justifyContent: "center" }}>
          <AppIcon name={playing ? "pause" : "play"} size={20} color={c.textOnInverse} />
        </Pressable>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Weekly replay timeline" accessibilityValue={{ min: 0, max: lastFrame, now: frame, text: frame === lastFrame ? "Now" : `Day ${frame}` }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => selectFrame(frame + (e.nativeEvent.actionName === "increment" ? 1 : -1))} onLayout={e => setTrackWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onResponderGrant={e => selectFrame(Math.round(e.nativeEvent.locationX / trackWidth * lastFrame))} onResponderMove={e => selectFrame(Math.round(e.nativeEvent.locationX / trackWidth * lastFrame))} style={{ flex: 1, height: 44, justifyContent: "center" }}>
          <View pointerEvents="none" style={{ height: 5, borderRadius: 4, backgroundColor: c.line }}>
            <View style={{ height: 5, width: `${frame / lastFrame * 100}%`, borderRadius: 4, backgroundColor: c.ink }} />
          </View>
          <View pointerEvents="none" style={{ position: "absolute", left: `${frame / lastFrame * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.ink }} />
        </View>
        <AppText role="caption">{frame === lastFrame ? "Now" : frame === 0 ? "Start" : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][frame - 1]}</AppText>
      </View>
      {replayError && <AppText role="caption" secondary>{replayError}</AppText>}
    </View>
    <View style={{ gap: 12 }}>
      <AppText role="heading" accessibilityRole="header">Teammate lineup</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{input.members.map(m => <View key={m.user_id} style={{ width: "23%", flexGrow: 1, maxWidth: "31%" }}>{hiddenIds.includes(m.user_id) ? null : <Pressable accessibilityRole="button" accessibilityLabel={`Compare ${m.display_name}'s contribution`} onPress={() => onSelectMember(m.user_id)} style={{ alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.card }}>
            <View style={{ borderWidth: 2, borderColor: full.relay.model.segments.find(s => s.id === m.user_id)?.color, borderRadius: 30, padding: 3 }}>
              <UserAvatar src={m.avatar_url} name={m.display_name} size={40} />
            </View>
            <AppText role="label" numberOfLines={1}>{m.display_name.split(" ")[0]}</AppText>
            <AppText role="caption" secondary numberOfLines={1}>{full.volume(full.relay.model.segments.find(s => s.id === m.user_id)?.value ?? 0)}</AppText>
          </Pressable>}</View>)}</View>
    </View>
    <Pressable accessibilityRole="button" onPress={() => setDetail("contract")} style={[f.card, { backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.tennis, gap: 10 }]}>
      <AppText role="caption">Weekly contract ↗</AppText>
      <AppText role="heading">{full.relay.target ? `${full.volume(full.relay.target)} together` : "All hands on deck"}</AppText>
      <AppText role="caption">{full.contributors} / {input.members.length} contributed</AppText>
    </Pressable>
    <View style={{ flexDirection: "row", gap: 12 }}>{children}<Pressable accessibilityRole="button" onPress={() => setDetail("passport")} style={[f.card, { flex: 1, minHeight: 170, justifyContent: "space-between", backgroundColor: c.surfaceInverse }]}>
      <AppText role="label" style={{ color: c.textOnInverse }}>Crew Passport ↗</AppText><AppText role="heading" style={{ color: c.textOnInverse }}>Earned together.</AppText><AppText role="caption" style={{ color: c.textOnInverse }}>{full.highlights.length} weekly milestones</AppText>
    </Pressable></View>
    {full.highlights.length > 0 && <View style={{ gap: 12 }}>
      <AppText accessibilityRole="header" role="heading">Crew highlights</AppText>
      <Pressable accessibilityRole="button" onPress={() => setDetail("story")} style={{ gap: 12, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 14 }}>{full.highlights.map(h => <AppText role="body" key={h}>✦ {h} ↗</AppText>)}</Pressable>
    </View>}
    <FocusSheet open={detail !== null} minimal title={detail === "contract" ? "Weekly contract" : detail === "passport" ? "Your crew passport" : "This week, together"} onClose={() => setDetail(null)}>
      {detail === "contract" ? <AppText role="body">{full.relay.target ? `${full.volume(full.relay.model.total)} / ${full.volume(full.relay.target)}` : `${full.contributors} / ${input.members.length} contributed`}</AppText> : null}
      {!full.highlights.length && detail !== "contract" ? <AppText role="body">This week’s shared milestones will appear here.</AppText> : null}
      {full.highlights.map(h => <AppText key={h} role="body">✦ {h}</AppText>)}
    </FocusSheet>
  </View>;
}
