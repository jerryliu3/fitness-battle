import { playCue } from "../lib/haptics";
import { GeographicCourse } from "./geographic-course";
import { useCompetitionCourse } from "./use-competition-course";
import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  orderedArenaLanes,
  coursePositionLeaders, competitionReplayDimension, nextCompetitionReplaySpeed, competitionReplayFrame, competitionReplayCaption, competitionReplayDate,
  indexCompetitionReplay, localCompetitionReplay, initialsFromName, fieldDefaultSpan,
  clampCourseCenter, sportById,
  type CompetitionReplay, type CompetitionReplaySelection, type CompeteState, type ArenaLane,
} from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { requestApi } from "../lib/api";
import { AppText, textStyle } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { FocusButton, f } from "../ui/focus";
import { IconButton } from "../ui/icon-button";
import { LaneTrack } from "../ui/lane-track";
import { PortraitField } from "../ui/portrait-field";
import { useFieldAppearance } from "../ui/field-course";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { SHELL_COLORS as c } from "../theme";

export function CompetitionReplayButton({
  state,
  selection,
  initialFlat = false,
  dimension = "4d",
  label = "Replay competition",
  variant = "button",
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  initialFlat?: boolean;
  dimension?: "2d" | "3d" | "4d";
  label?: string;
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "inline" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label || "View replay"}
          onPress={() => { void playCue("light"); setOpen(true); }}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 34,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(20, 20, 19, 0.78)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.2)",
            },
            pressed && { opacity: 0.75 },
          ]}
        >
          <AppIcon name="replay" size={14} color="#ffffff" />
          <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
            {label || "View replay"}
          </Text>
        </Pressable>
      ) : (
        <FocusButton secondary label={label} onPress={() => { void playCue("light"); setOpen(true); }} />
      )}
      <CompetitionReplayModal open={open} state={state} selection={selection} initialFlat={initialFlat} dimension={dimension} onClose={() => setOpen(false)} />
    </>
  );
}

export function CompetitionReplayModal({ open, state, selection, dimension, onClose, initialFlat = false }: {
  open: boolean;
  state: CompeteState;
  selection: CompetitionReplaySelection;
  initialFlat?: boolean;
  dimension: "2d" | "3d" | "4d";
  onClose(): void;
}) {
  const reduced = useReducedMotion();
  return open ? <Modal visible animationType={reduced ? "none" : "slide"} presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaProvider>
      <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
        <ReplayViewer key={`${selection.sport}:${selection.track}:${selection.periodStart}`} state={state} selection={selection} initialFlat={initialFlat} initialDimension={dimension} onClose={onClose} />
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal> : null;
}

function ReplayTimeline({ cursor, count, caption, onSeek }: { cursor: number; count: number; caption: string; onSeek: (cursor: number) => void }) {
  const width = useRef(1), left = useRef(0);
  const latest = useRef({ count, onSeek }); latest.current = { count, onSeek };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.count > 0,
    onMoveShouldSetPanResponder: () => latest.current.count > 0,
    onPanResponderGrant: event => { left.current = event.nativeEvent.pageX - event.nativeEvent.locationX; latest.current.onSeek(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current)) * latest.current.count); },
    onPanResponderMove: event => latest.current.onSeek(Math.max(0, Math.min(1, (event.nativeEvent.pageX - left.current) / width.current)) * latest.current.count),
    onPanResponderTerminationRequest: () => false,
  }), []);
  return <View style={s.timeline} {...pan.panHandlers} onLayout={event => { width.current = Math.max(1, event.nativeEvent.layout.width); }}
    accessible accessibilityRole="adjustable" accessibilityLabel="Competition replay timeline"
    accessibilityValue={{ min: 0, max: count, now: Math.ceil(cursor), text: `${Math.ceil(cursor)} of ${count} events. ${caption}` }}
    accessibilityActions={[{ name: "increment", label: "Next event" }, { name: "decrement", label: "Previous event" }]}
    onAccessibilityAction={event => onSeek(event.nativeEvent.actionName === "increment" ? Math.floor(cursor) + 1 : Math.ceil(cursor) - 1)}>
    <View pointerEvents="none" style={s.rail}><View style={[s.fill, { width: `${count ? cursor / count * 100 : 0}%` }]} /></View>
    <View pointerEvents="none" style={[s.thumb, { left: `${count ? cursor / count * 100 : 0}%` }]} />
  </View>;
}
function ReplayAction({ label, text, disabled, onPress, primary = false }: { label: string; text: string; disabled?: boolean; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={() => { if (!disabled) { void playCue("selection"); onPress(); } }} style={[s.action, primary && s.primary, disabled && { opacity: .4 }]}><AppText role="label">{text}</AppText></Pressable>;
}
export function ReplayViewer({ state, selection, initialDimension, onClose, embedded=false, initialFlat = false }: { state: CompeteState; selection: CompetitionReplaySelection; initialDimension: "2d" | "3d" | "4d"; initialFlat?: boolean; onClose: () => void; embedded?: boolean }) {
  const { user, accessToken, offlineMode } = useAuth();
  const { debugActive } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = useMemo(() => blocks.map(block => block.id), [blocks]);
  const reduced = useReducedMotion();
  const [data, setData] = useState<CompetitionReplay | null>(null), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [dimension, setDimension] = useState(() => competitionReplayDimension(selection.sport, initialDimension));
  const { course, error: courseError, retry: retryCourse } = useCompetitionCourse(selection.sport, selection.periodStart, selection.periodEnd, debugActive, dimension === "4d");
  const [center, setCenter] = useState<number | null>(null), [span, setSpan] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const [courseFlat, setCourseFlat] = useState(initialFlat);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => { if (selected && hiddenIds.includes(selected)) setSelected(null); }, [selected, hiddenIds]);
  const [height, setHeight] = useState(250);
  const [appearance] = useFieldAppearance(user?.id ?? "guest", selection.sport);
  const localState = useRef(state);
  localState.current = state;
  const portraitAnchor = useRef(0);
  useEffect(() => {
    let cancelled = false;
    setData(null); setError(""); setCursor(0); setPlaying(false); setCenter(null);
    if (!user || offlineMode || debugActive) { setData(localCompetitionReplay(localState.current, selection)); return () => { cancelled = true; }; }
    const query = `sport=${selection.sport}&track=${selection.track}&start=${encodeURIComponent(selection.periodStart)}&end=${encodeURIComponent(selection.periodEnd)}`;
    void requestApi<CompetitionReplay>(mobileEnv.apiUrl, accessToken, `/api/compete/replay?${query}`).then(next => { if (!cancelled) setData(next); }).catch(() => { if (!cancelled) setError("Could not load this competition’s replay. Try again."); });
    return () => { cancelled = true; };
  }, [user?.id, offlineMode, debugActive, accessToken, selection.sport, selection.track, selection.periodStart, selection.periodEnd, attempt]);
  const index = useMemo(() => data ? indexCompetitionReplay(data, state.units) : null, [data, state.units]);
  const count = index?.replay.events.length ?? 0;
  useEffect(() => { if (embedded && index) setCursor(count); }, [index, count, embedded]);
  const cursorRef = useRef(cursor); cursorRef.current = cursor;
  useEffect(() => {
    if (!playing || !count) return;
    let raf = 0; const from = cursorRef.current, start = Date.now();
    const tick = () => {
      const progress = from + (Date.now() - start) * speed / 1100;
      setCursor(Math.min(count, reduced ? Math.floor(progress) : progress));
      if (progress < count) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, count, reduced, dimension]);
  useEffect(() => { const subscription = AppState.addEventListener("change", next => { if (next !== "active") setPlaying(false); }); return () => subscription.remove(); }, []);
  const seek = (next: number) => { const bounded = Math.max(0, Math.min(count, next)); if (Math.ceil(bounded) !== Math.ceil(cursor)) void playCue("selection"); setPlaying(false); setCursor(bounded); };
  const frame = index ? competitionReplayFrame(index, cursor) : null;
  const me = frame?.rows.find(a => a.you);
  const focus = frame?.rows.find(a => a.id === selected && !hiddenIds.includes(a.id)) ?? me;
  const unit = index?.unit ?? "km", viewSpan = span ?? fieldDefaultSpan(unit);
  const lanes = useMemo(() => (frame?.rows ?? []).map(row => ({ ...row, initials: initialsFromName(row.name) })), [index, cursor]);
  const nativeLanes = useMemo<ArenaLane[]>(() => lanes.map(l => ({ ...l, ghost: false, values: [l.value, l.value, l.value] })), [lanes]);
  const view = { center: !following && center !== null ? center : clampCourseCenter(focus?.value ?? 0, viewSpan, Math.max(0, ...lanes.map(l => l.value)), unit, appearance.ground), span: viewSpan };
  const applyView = (next: typeof view) => { setFollowing(false); setCenter(next.center); setSpan(next.span); };
  const panTo = (center: number) => applyView({ ...view, center });
  const zoomTo = (span: number) => applyView({ ...view, span });
  const select = (id: string) => { if (hiddenIds.includes(id)) return; const lane = lanes.find(l => l.id === id); if (lane) { const ordered = orderedArenaLanes(lanes); if (following) portraitAnchor.current = Math.max(0, ordered.findIndex(l => l.id === id)) - Math.max(0, ordered.findIndex(l => l.you)); setSelected(id); setFocusRequest(value => value + 1); if (following) setCenter(null); } };
  const closed = data && Date.parse(data.through) >= Date.parse(data.periodEnd);
  const caption = index ? (frame?.event && hiddenIds.includes(frame.event.athleteId) ? "An athlete recorded activity" : competitionReplayCaption(index, cursor)) : "";
  return <View style={{ flex: 1 }}>
    <View style={s.header}>
      {!embedded&&<IconButton icon="back" label="Close competition replay" onPress={onClose} />}
      <View style={{ flex: 1 }}><AppText role="heading" accessibilityRole="header">{sportById(selection.sport).name} replay</AppText><AppText role="caption" secondary>{selection.track === "verified" ? "GPS Tracked" : "Open"} · {closed ? "Completed round" : "Competition so far"}</AppText></View>
    </View>

    {!index ? <View style={s.message}><AppText role="body" accessibilityLiveRegion="polite">{error || "Loading the competition timeline…"}</AppText>{error && <FocusButton label="Retry" onPress={() => setAttempt(a => a + 1)} />}</View> : <>
      <View style={s.scene} onLayout={event => setHeight(Math.max(100, event.nativeEvent.layout.height))}>
        <View style={{ position: "absolute", top: 12, right: 12, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: following }} accessibilityLabel={`Camera: ${following ? "Follow athlete" : "Fixed"}`} onPress={() => { setCenter(following ? view.center : null); setFollowing(value => !value); if (!following) setFocusRequest(value => value + 1); }} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 999, backgroundColor: "rgba(20, 20, 19, 0.78)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)" }}><Text style={{ ...textStyle("caption"), color: "#ffffff" }}>{following ? "Follow athlete" : "Fixed"}</Text></Pressable>
          <FieldViewSwitcher value={dimension} geographic={unit !== "pts"} onChange={setDimension} />
        </View>
        {dimension === "4d" ? <GeographicCourse initialFlat={courseFlat} onFlatChange={setCourseFlat} followAthlete={following} onFollowChange={next => { setCenter(next ? null : view.center); setFollowing(next); }} optionsTop={64} hiddenIds={hiddenIds} course={course} error={courseError} onRetry={retryCourse} lanes={lanes} unit={unit} selectedId={selected ?? focus?.id ?? ""} focusRequest={focusRequest} onSelect={select} /> : dimension === "2d" ? <LaneTrack clampView={following} hiddenIds={hiddenIds} onGestureStart={() => { setCenter(view.center); setFollowing(false); }} onViewChange={applyView} focusRequest={focusRequest} focusSelection={following} focusOnMount animateSelection={!reduced} lanes={nativeLanes} appearance={appearance} unit={unit} height={height} fullscreen active selectedId={selected ?? focus?.id} index={2} showGhost={false} onSelect={lane => select(lane.id)} view={view} onPan={panTo} onZoom={zoomTo} /> : <PortraitField hiddenIds={hiddenIds} onGestureStart={() => { setCenter(view.center); setFollowing(false); }} onViewChange={applyView} focusRequest={focusRequest} focusSelection={following} focusOnMount animateSelection={!reduced} laneAnchor={portraitAnchor} selectedId={selected ?? focus?.id} lanes={lanes} unit={unit} height={height} fullscreen fullscreenControlsBottom={64} onSelect={select} view={view} onPan={panTo} onZoom={zoomTo} />}

      </View>
      <View style={s.controls}>
        <AppText role="row" numberOfLines={2}>{caption}</AppText>
        <AppText role="caption" secondary>{competitionReplayDate(index, cursor)}</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessibilityLabel="Current positions">{coursePositionLeaders(frame?.rows ?? []).filter(row => !hiddenIds.includes(row.id)).map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Focus ${row.name}`} accessibilityState={{ selected: row.id === focus?.id }} onPress={() => select(row.id)} style={[s.action, { flexDirection: "row", gap: 4 }]}><AppText role="caption">#{row.place} {row.you ? "You" : row.name.split(" ")[0]} · {row.value.toFixed(1)} {unit}</AppText></Pressable>)}</View>
        <ReplayTimeline cursor={cursor} count={count} caption={caption} onSeek={seek} />
        {embedded && <ReplayAction disabled={!count} label="Replay this round" text="Replay this round" onPress={() => { seek(0); setPlaying(true); }} />}
        <View style={s.actions}>
          <ReplayAction label="Jump to competition start" text="|‹" disabled={!count || cursor === 0} onPress={() => seek(0)} />
          <ReplayAction label="Previous competition event" text="‹" disabled={!count || cursor === 0} onPress={() => seek(Math.ceil(cursor) - 1)} />
          <ReplayAction primary label={playing ? "Pause replay" : "Play replay"} text={playing ? "Pause" : "Play"} disabled={!count} onPress={() => { if (!playing && cursor >= count) setCursor(0); setPlaying(p => !p); }} />
          <ReplayAction label="Next competition event" text="›" disabled={!count || cursor >= count} onPress={() => seek(Math.floor(cursor) + 1)} />
          <ReplayAction label={`Playback speed ${speed} times`} text={`${speed}×`} onPress={() => setSpeed(nextCompetitionReplaySpeed)} />
        </View>
      </View>
    </>}

  </View>;
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  message: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  scene: { flex: 1, minHeight: 100, overflow: "hidden" },
  controls: { gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper },
  timeline: { height: 44, justifyContent: "center", marginHorizontal: 10 },
  rail: { height: 4, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" },
  fill: { height: 4, backgroundColor: "#176c75" },
  thumb: { position: "absolute", top: 12, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: "#176c75", borderWidth: 2, borderColor: "white" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 4 },
  action: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: c.line },
  primary: { backgroundColor: c.tennis, minWidth: 66 },
});
