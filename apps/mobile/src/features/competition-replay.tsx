import { GeographicCourse } from "./geographic-course";
import { FieldViewSwitcher } from "../ui/field-view-switcher";
import { useFieldFlight } from "../ui/use-field-flight";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  orderedArenaLanes,
  competitionReplayFrame, competitionReplayCaption, competitionReplayDate,
  indexCompetitionReplay, localCompetitionReplay, initialsFromName, fieldDefaultSpan,
  clampCourseCenter, sportById,
  type RaceCourse, type CompetitionReplay, type CompetitionReplaySelection, type CompeteState, type ArenaLane,
} from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
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
  dimension = "2d",
  course = null,
  onCourseChange,
  label = "Replay competition",
  variant = "button",
}: {
  state: CompeteState;
  selection: CompetitionReplaySelection;
  dimension?: "2d" | "3d" | "4d";
  course?: RaceCourse | null;
  onCourseChange?(course: RaceCourse | null): void;
  label?: string;
  variant?: "button" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <>
      {variant === "inline" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label || "View replay"}
          onPress={() => setOpen(true)}
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
          <Text style={{ ...textStyle("caption"), color: "#ffffff", fontWeight: "600" }}>
            {label || "View replay"}
          </Text>
        </Pressable>
      ) : (
        <FocusButton secondary label={label} onPress={() => setOpen(true)} />
      )}
      {open && (
        <Modal
          visible
          animationType={reduced ? "none" : "slide"}
          presentationStyle="fullScreen"
          onRequestClose={() => setOpen(false)}
        >
          <SafeAreaProvider>
            <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
              <ReplayViewer
                key={`${selection.sport}:${selection.track}:${selection.periodStart}`}
                state={state}
                selection={selection}
                initialDimension={dimension}
                initialCourse={course}
                onCourseChange={onCourseChange}
                onClose={() => setOpen(false)}
              />
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
      )}
    </>
  );
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
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={[s.action, primary && s.primary, disabled && { opacity: .4 }]}><AppText role="label">{text}</AppText></Pressable>;
}
function ReplayViewer({ state, selection, initialDimension, initialCourse, onCourseChange, onClose }: { state: CompeteState; selection: CompetitionReplaySelection; initialDimension: "2d" | "3d" | "4d"; initialCourse: RaceCourse | null; onCourseChange?(course: RaceCourse | null): void; onClose: () => void }) {
  const { user, accessToken, offlineMode } = useAuth();
  const { debugActive } = useCompeteStore();
  const reduced = useReducedMotion();
  const [data, setData] = useState<CompetitionReplay | null>(null), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [dimension, setDimension] = useState(initialDimension);
  const [course, setCourse] = useState(initialCourse);
  const changeCourse = (next: RaceCourse | null) => { setCourse(next); onCourseChange?.(next); };
  const [center, setCenter] = useState<number | null>(null), [span, setSpan] = useState<number | null>(null);
  const [followEvent, setFollowEvent] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
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
  const cursorRef = useRef(cursor); cursorRef.current = cursor;
  useEffect(() => {
    if (!playing || !count) return;
    let raf = 0; const from = cursorRef.current, start = Date.now();
    let lastPaint = -Infinity;
    const tick = () => {
      const progress = from + (Date.now() - start) * speed / 1100;
      // Bound GeoJSON/bridge updates during playback; seeking always paints immediately.
      const paintTime = Date.now();
      if (dimension !== "4d" || paintTime - lastPaint >= 100 || progress >= count) {
        setCursor(Math.min(count, reduced ? Math.floor(progress) : progress));
        lastPaint = paintTime;
      }
      if (progress < count) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, count, reduced, dimension]);
  useEffect(() => { const subscription = AppState.addEventListener("change", next => { if (next !== "active") setPlaying(false); }); return () => subscription.remove(); }, []);
  const seek = (next: number) => { setPlaying(false); setCursor(Math.max(0, Math.min(count, next))); };
  const frame = index ? competitionReplayFrame(index, cursor) : null;
  const me = frame?.rows.find(a => a.you);
  const focus = followEvent ? frame?.rows.find(a => a.id === frame.event?.athleteId) ?? me : me;
  const unit = index?.unit ?? "km", viewSpan = span ?? fieldDefaultSpan(unit);
  const lanes = useMemo(() => (frame?.rows ?? []).map(row => ({ ...row, initials: initialsFromName(row.name) })), [index, cursor]);
  const nativeLanes = useMemo<ArenaLane[]>(() => lanes.map(l => ({ ...l, ghost: false, values: [l.value, l.value, l.value] })), [lanes]);
  const view = { center: clampCourseCenter(center ?? focus?.value ?? 0, viewSpan, Math.max(0, ...lanes.map(l => l.value)), unit, appearance.ground), span: viewSpan };
  const flight = useFieldFlight(view, next => { setCenter(next.center); setSpan(next.span); }, Boolean(reduced));
  const applyView = (next: typeof view) => { flight.cancel(); setCenter(next.center); setSpan(next.span); };
  const panTo = (center: number) => applyView({ ...view, center });
  const zoomTo = (span: number) => applyView({ ...view, span });
  const select = (id: string) => { const lane = lanes.find(l => l.id === id); if (lane) { const ordered = orderedArenaLanes(lanes); portraitAnchor.current = Math.max(0, ordered.findIndex(l => l.id === id)) - Math.max(0, ordered.findIndex(l => l.you)); setSelected(id); setFocusRequest(value => value + 1); if (dimension !== "4d") flight.fly({ ...view, center: clampCourseCenter(lane.value, view.span, Math.max(0, ...lanes.map(l => l.value)), unit, appearance.ground) }); } };
  const closed = data && Date.parse(data.through) >= Date.parse(data.periodEnd);
  const caption = index ? competitionReplayCaption(index, cursor) : "";
  return <View style={{ flex: 1 }}>
    <View style={s.header}>
      <IconButton icon="back" label="Close competition replay" onPress={onClose} />
      <View style={{ flex: 1 }}><AppText role="heading" accessibilityRole="header">{sportById(selection.sport).name} replay</AppText><AppText role="caption" secondary>{selection.track === "verified" ? "GPS Tracked" : "Open"} · {closed ? "Completed round" : "Competition so far"}</AppText></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload competition replay" disabled={!data && !error} onPress={() => setAttempt(a => a + 1)} style={s.action}><AppText role="caption">Refresh</AppText></Pressable>
    </View>
    {!index ? <View style={s.message}><AppText role="body" accessibilityLiveRegion="polite">{error || "Loading the competition timeline…"}</AppText>{error && <FocusButton label="Retry" onPress={() => setAttempt(a => a + 1)} />}</View> : <>
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}><FieldViewSwitcher value={dimension} geographic={unit !== "pts"} onChange={value => { flight.cancel(); setDimension(value); }} /></View>
      <View style={s.scene} onLayout={event => setHeight(Math.max(100, event.nativeEvent.layout.height))}>
        {dimension === "4d" ? <GeographicCourse course={course} onCourseChange={changeCourse} lanes={lanes} unit={unit} selectedId={selected ?? focus?.id ?? ""} focusRequest={focusRequest} onSelect={select} /> : dimension === "2d" ? <LaneTrack onGestureStart={flight.cancel} onViewChange={applyView} focusRequest={focusRequest} focusOnMount animateSelection={!reduced} lanes={nativeLanes} appearance={appearance} unit={unit} height={height} fullscreen active selectedId={selected ?? focus?.id} index={2} showGhost={false} onSelect={lane => select(lane.id)} view={view} onPan={panTo} onZoom={zoomTo} /> : <PortraitField onGestureStart={flight.cancel} onViewChange={applyView} focusRequest={focusRequest} focusOnMount animateSelection={!reduced} laneAnchor={portraitAnchor} selectedId={selected ?? focus?.id} lanes={lanes} unit={unit} height={height} fullscreen fullscreenControlsBottom={64} onSelect={select} view={view} onPan={panTo} onZoom={zoomTo} />}
        <Pressable accessibilityRole="button" onPress={() => { flight.cancel(); setCenter(null); setSelected(null); setFollowEvent(v => !v); }} style={[s.follow, dimension === "4d" && { bottom: undefined, top: 12 }]}><AppText role="label">{followEvent ? "Follow me" : "Follow event"}</AppText></Pressable>
      </View>
      <View style={s.controls}>
        <AppText role="caption" secondary>Your place {me?.place ?? "—"} / {lanes.length} · {Math.ceil(cursor)} / {count} events</AppText>
        <AppText role="row" numberOfLines={2}>{caption}</AppText>
        <AppText role="caption" secondary>{competitionReplayDate(index, cursor)}</AppText>
        <ReplayTimeline cursor={cursor} count={count} caption={caption} onSeek={seek} />
        <View style={s.actions}>
          <ReplayAction label="Jump to competition start" text="|‹" disabled={!count || cursor === 0} onPress={() => seek(0)} />
          <ReplayAction label="Previous competition event" text="‹" disabled={!count || cursor === 0} onPress={() => seek(Math.ceil(cursor) - 1)} />
          <ReplayAction primary label={playing ? "Pause replay" : "Play replay"} text={playing ? "Pause" : "Play"} disabled={!count} onPress={() => { if (!playing && cursor >= count) setCursor(0); setPlaying(p => !p); }} />
          <ReplayAction label="Next competition event" text="›" disabled={!count || cursor >= count} onPress={() => seek(Math.floor(cursor) + 1)} />
          <ReplayAction label={closed ? "Jump to finish" : "Jump to latest event"} text={closed ? "Finish" : "Latest"} disabled={!count || cursor >= count} onPress={() => seek(count)} />
          <ReplayAction label={`Playback speed ${speed} times`} text={`${speed}×`} onPress={() => setSpeed(v => v === 4 ? 1 : v * 2)} />
        </View>
        <AppText role="caption" secondary>{!count ? "No counted activity in this competition yet." : "Drag the timeline to move event by event."}</AppText>
      </View>
    </>}
  </View>;
}
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  message: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  scene: { flex: 1, minHeight: 100, overflow: "hidden" },
  follow: { position: "absolute", bottom: 12, right: 12, minHeight: 44, justifyContent: "center", backgroundColor: "white", borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 12 },
  controls: { gap: 4, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper },
  timeline: { height: 44, justifyContent: "center", marginHorizontal: 10 },
  rail: { height: 4, borderRadius: 2, backgroundColor: c.line, overflow: "hidden" },
  fill: { height: 4, backgroundColor: "#176c75" },
  thumb: { position: "absolute", top: 12, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: "#176c75", borderWidth: 2, borderColor: "white" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 4 },
  action: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: c.line },
  primary: { backgroundColor: c.tennis, minWidth: 66 },
});
