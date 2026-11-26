import { pageCarouselStyles } from "../ui/carousel-styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CREW_INVITE_WEEKLY_PLACEHOLDER, crewMemberRelayColor, crewOverview, crewReplayEvents, readCrewReplay, resolveCrewWeekMetric, weeklyPeriodBounds, type CrewActivityPage, type CrewOverviewInput } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { FocusButton, useFocusStyles } from "../ui/focus";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { UserAvatar } from "../ui/user-avatar";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { CrewRelay } from "./crew-relay";
import { useCrewContractModal } from "./crew-passport";
import { CrewBadgeCard } from "./crew-badge-card";
import { CrewDerbyCard } from "./crew-derby";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

type Props = CrewOverviewInput & {
  crewId: string;
  crewName: string;
  onSelectMember: (id: string) => void;
  onViewMembers: () => void;
  hiddenIds: readonly string[];
  invitePreview?: boolean;
};
export function CrewOverview({ crewId, crewName, onSelectMember, onViewMembers, hiddenIds, invitePreview = false, ...input }: Props) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const reduced = useReducedMotion();
  const { accessToken, offlineMode } = useAuth();
  const [replayEntries, setReplayEntries] = useState<CrewOverviewInput["entries"]>();
  const [replayError, setReplayError] = useState("");
  const contractUi = useCrewContractModal(crewId, input);
  const { passport, contract } = contractUi;
  const activeMetric = resolveCrewWeekMetric({
    format: input.format,
    sport: input.sport,
    contract: contract ? { metric: contract.metric, target: contract.target } : null,
  });
  const replaySport = activeMetric === "distance_m" ? input.sport : null;
  const weekStart = weeklyPeriodBounds(new Date(input.now)).startsAt.toISOString();
  useEffect(() => {
    setReplayEntries(undefined);
    setReplayError("");
    if (offlineMode) { setReplayEntries(input.entries); return; }
    if (!accessToken) return;
    let active = true;
    void readCrewReplay(cursor => {
      const params = new URLSearchParams({ crewId, since: weekStart, limit: "100" });
      if (cursor) { params.set("before", cursor.before); params.set("beforeId", cursor.beforeId); }
      return requestApi<CrewActivityPage>(mobileEnv.apiUrl, accessToken, `/api/crews/activities?${params}`);
    }, replaySport).then(rows => { if (active) setReplayEntries(rows); }).catch(() => { if (active) setReplayError("Replay unavailable"); });
    return () => { active = false; };
  }, [crewId, accessToken, offlineMode, replaySport, weekStart]);
  const overviewInput = useMemo<CrewOverviewInput>(
    () => ({ ...input, contract: contract ? { metric: contract.metric, target: contract.target } : null }),
    [input, contract?.metric, contract?.target],
  );
  const events = useMemo(() => crewReplayEvents(overviewInput, offlineMode ? overviewInput.entries : replayEntries ?? []), [replayEntries, overviewInput, offlineMode]);
  const full = crewOverview(overviewInput, 1, events);
  const [frame, setFrame] = useState(1);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [playing, setPlaying] = useState(false);
  const [trackWidth, setTrackWidth] = useState(1);
  const view = crewOverview(overviewInput, frame, events);
  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => { if (state !== "active") setPlaying(false); });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!playing || !events.length) return;
    if (reduced) { setFrame(1); setPlaying(false); return; }
    let animation = 0, lastPaint = 0;
    const from = frameRef.current, started = Date.now();
    const duration = Math.min(12000, Math.max(1800, events.length * 700));
    const tick = () => {
      const elapsed = Date.now() - started;
      const next = Math.min(1, from + elapsed / duration);
      if (elapsed - lastPaint >= 32 || next === 1) { setFrame(next); lastPaint = elapsed; }
      if (next < 1) animation = requestAnimationFrame(tick); else setPlaying(false);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [playing, reduced, events.length]);
  const [lineupWidth, setLineupWidth] = useState(320);
  const cardWidth = Math.max(64, (lineupWidth - 24) / 4);
  const selectFrame = (value: number) => { if (!events.length) return; setPlaying(false); setFrame(Math.max(0, Math.min(1, value))); };
  const scrubTrack = (locationX: number) => selectFrame(locationX / Math.max(1, trackWidth));
  return <><View style={{ gap: 28 }}>
  {invitePreview ? (
    <View style={[f.card, { gap: 8, paddingVertical: 16, paddingHorizontal: 18 }]}>
      <AppText role="label">Weekly field</AppText>
      <AppText role="body" secondary>
        {CREW_INVITE_WEEKLY_PLACEHOLDER}
      </AppText>
    </View>
  ) : (
    <View style={[f.card, { backgroundColor: c.actionSoft, borderColor: c.tennis, gap: 12, overflow: "hidden", padding: 20 }]}>
      {contract ? <>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppText role="label">Weekly contract</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change weekly contract"
              hitSlop={8}
              onPress={contractUi.openSummary}
              style={{ minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" }}
            >
              <AppIcon name="edit" size={16} color={c.ink} />
            </Pressable>
          </View>
          <AppText role="caption" secondary>{contract.contributors}/{contract.roster_size} active{view.complete ? " · Reached" : ""}</AppText>
        </View>
        <AppText role="heading">{contract.title}</AppText>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <AppText role="hero">{view.reading}</AppText><AppText role="body">{view.targetReading != null ? `/ ${view.targetReading} ` : ""}{view.unit}</AppText>
        </View>

        <View>
          <CrewRelay {...overviewInput} entries={view.entries} model={view.relay.model} compact hiddenIds={hiddenIds} onSelectMember={onSelectMember} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={playing ? "Pause replay" : "Replay this week"} accessibilityState={{ selected: playing }} onPress={() => { if (!events.length) return; if (!playing && frame === 1) setFrame(0); setPlaying(!playing); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" }}>
            <AppIcon name={playing ? "pause" : "play"} size={20} color={c.textOnInverse} />
          </Pressable>
          <View accessible accessibilityRole="adjustable" accessibilityLabel="Weekly replay timeline" accessibilityValue={{ min: 0, max: 100, now: Math.round(frame * 100), text: view.replayLabel }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => selectFrame(frame + (e.nativeEvent.actionName === "increment" ? 0.05 : -0.05))} onLayout={e => setTrackWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onResponderGrant={e => scrubTrack(e.nativeEvent.locationX)} onResponderMove={e => scrubTrack(e.nativeEvent.locationX)} style={{ flex: 1, height: 44, justifyContent: "center" }}>
            <View pointerEvents="none" style={{ height: 5, borderRadius: 4, backgroundColor: c.line }}>
              <View style={{ height: 5, width: `${frame * 100}%`, borderRadius: 4, backgroundColor: c.ink }} />
            </View>
            <View pointerEvents="none" style={{ position: "absolute", left: `${frame * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.ink }} />
          </View>
          <AppText role="caption">{view.replayLabel}</AppText>
        </View>
        {replayError && <AppText role="caption" secondary>{replayError}</AppText>}
      </> : <>
        <AppText role="label">Weekly contract</AppText>
        <AppText role="heading">{!passport.available ? "Contracts unavailable" : !passport.data ? (passport.error ? "Could not load contract" : "Loading weekly contract…") : "Set this week’s contract"}</AppText>
        <AppText role="caption" secondary>{!passport.available ? passport.unavailable : passport.data ? "Set one shared distance, time, or check-in goal for your crew this week." : (passport.error || "Checking your crew’s weekly objective.")}</AppText>
        {passport.error && !passport.data ? <FocusButton secondary label="Refresh" onPress={() => void passport.reload()} /> : <FocusButton label="Set weekly contract" disabled={!passport.available || !passport.data} onPress={contractUi.openEditor} />}
      </>}
    </View>
  )}
    <View style={{ gap: 12 }} onLayout={e => setLineupWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText role="heading" accessibilityRole="header">Crew mates</AppText>
        {input.members.length > 4 && <Pressable accessibilityRole="button" onPress={onViewMembers} style={{ minHeight: 44, justifyContent: "center" }}><AppText role="label">View all</AppText></Pressable>}
      </View>
      <ScrollView horizontal scrollEnabled={input.members.length > 4} showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 8} decelerationRate="fast" style={pageCarouselStyles.viewport} contentContainerStyle={[pageCarouselStyles.content, { gap: 8 }]}>
        {full.lineup.map(m => hiddenIds.includes(m.user_id) ? <View key={m.user_id} style={{ width: cardWidth }} /> : <Pressable key={m.user_id} accessibilityRole="button" accessibilityLabel={`Compare ${m.display_name}'s contribution`} onPress={() => onSelectMember(m.user_id)} style={{ width: cardWidth, alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.card }}>
          <View style={{ borderWidth: 2, borderColor: crewMemberRelayColor(m.user_id, input.members.map(member => member.user_id), view.relay.model), borderRadius: 30, padding: 3 }}><UserAvatar src={m.avatar_url} name={m.display_name} size={40} /></View>
          <AppText role="label" numberOfLines={1}>{m.display_name.split(" ")[0]}</AppText>
          <AppText role="caption" secondary numberOfLines={1}>{view.volume(view.relay.model.segments.find(s => s.id === m.user_id)?.value ?? 0)}</AppText>
        </Pressable>)}
      </ScrollView>
    </View>
    <CrewBadgeCard crewName={crewName} badges={passport.data?.badges} units={input.units} />

    <CrewDerbyCard crewId={crewId} sport={input.sport} units={input.units} />
  </View>{contractUi.sheet}</>;
}
