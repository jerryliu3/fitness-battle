import { startActivePlayback } from "../ui/active-playback";
import { useCompetitionCourse } from "./use-competition-course";
import { GeographicCourse } from "./geographic-course";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEMO_RACE_COURSE, competitionMomentScene, competePeriodWindow, sportById, type ArenaLane, type RaceCourse, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompeteStore } from "../lib/compete-store";
import { useFieldAppearance } from "../ui/field-course";
import { LaneTrack } from "../ui/lane-track";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { textStyle } from "../ui/section";
import { FocusButton } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { playCue, playPattern } from "../lib/haptics";
const ignore = () => {};

export function CompetitionMoment({ moment, remaining, onConfirm, debug = false, embedded = false, dimension = moment.unit === "pts" ? "2d" : "4d", course = null, autoStart = false }: { moment: Moment; remaining: number; onConfirm: () => void; debug?: boolean; embedded?: boolean; dimension?: "2d" | "4d"; course?: RaceCourse | null; autoStart?: boolean }) {
  const { accountKey, state } = useCompeteStore();
  const period = state ? competePeriodWindow(state, undefined, moment.sport) : null;
  const { blocks } = useAthleteBlocks();
  const hiddenIds = blocks.map(block => block.id);
  const [appearance] = useFieldAppearance(accountKey, moment.sport);
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const reduced = useReducedMotion();
  const [viewDimension,setViewDimension]=useState(dimension);
  useEffect(()=>setViewDimension(dimension),[dimension]);
  const assigned = useCompetitionCourse(moment.sport, period?.startsAt.toISOString() ?? "", period?.endsAt.toISOString() ?? "", debug, !course && viewDimension !== "2d");
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => setSceneReady(false), [viewDimension]);
  const [started, setStarted] = useState(autoStart);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const stopPlayback = useRef<() => void>(() => {});
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    if (skipped.current) return;
    if (!started || (viewDimension === "4d" && !sceneReady)) return;
    setProgress(0);
    const duration = (4200 + count * 1150) * (embedded ? 1.5 : 1);
    const stop = startActivePlayback(duration, p => { if (!skipped.current) setProgress(p); });
    stopPlayback.current = stop;
    return stop;
  }, [moment.id, reduced, count, started, embedded, viewDimension, sceneReady]);
  const stopHaptics = useRef<() => void>(() => {});
  useEffect(() => () => stopHaptics.current(), [moment.id]);
  const frame = competitionMomentScene(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !skipped.current) {
      const soleLead = frame.rank === 1 && frame.lanes.every(lane => lane.you || lane.value < frame.youValue);
      if (reduced) stopHaptics.current = playPattern("confirm");
      else if (soleLead) stopHaptics.current = playPattern("lead");
      else if (count > 1 && frame.count === count) stopHaptics.current = playPattern("combo");
      else void playCue("light");
    }
    previousCount.current = frame.count;
  }, [frame.count, frame.rank, count, passedBy, reduced]);
  const lanes: ArenaLane[] = frame.lanes.map(lane => ({ ...lane, you: Boolean(lane.you), ghost: false, values: [lane.value, lane.value, lane.value] }));
  return <View style={embedded ? {height:600} : { flex: 1 }}>
    <View onLayout={e => setHeight(e.nativeEvent.layout.height)} style={[StyleSheet.absoluteFill,{top:0,bottom:embedded?80:insets.bottom+80}]} pointerEvents="box-none">
      {viewDimension === "4d" ? <GeographicCourse course={course ?? assigned.course ?? (debug?DEMO_RACE_COURSE:null)} error={assigned.error} onRetry={assigned.retry} hiddenIds={hiddenIds} onReady={() => setSceneReady(true)} replay={frame} optionsTop={null} overlaysHidden lanes={frame.lanes} unit={moment.unit} selectedId={moment.plan.youId} focusRequest={0} onSelect={ignore}/> : height > 0 && <LaneTrack replayFocusIds={frame.replayFocusIds} hiddenIds={hiddenIds} fullscreen focusOnMount followSelected animateSelection={false} appearance={appearance} height={height} lanes={lanes} unit={moment.unit} showGhost={false} selectedId={moment.plan.youId} index={2} onSelect={ignore} view={frame.view}/>}
    </View>
    <View pointerEvents="box-none" style={{ position: "absolute", top: (embedded ? 0 : insets.top) + 12, left: 16, right: 16, gap: 10 }}>
      {!embedded && <View style={styles.panel}><Text style={textStyle("label")}>{sportById(moment.sport).name} · {embedded ? "OVERTAKE TUTORIAL · SAMPLE KM" : "REPLAY"}</Text>{debug && <Text style={textStyle("caption")}>DEBUG PREVIEW · LOCAL DATA ONLY</Text>}</View>}
      <View pointerEvents="box-none" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 10 }}>
      <View pointerEvents="box-none" style={{ gap: 10 }}>
      {debug&&!embedded&&<View style={{flexDirection:"row",alignItems:"center",gap:8}}><Text style={textStyle("label")}>3D course</Text><Switch accessibilityLabel="3D course" value={viewDimension==="4d"} onValueChange={value=>setViewDimension(value?"4d":"2d")}/></View>}
      {!passedBy && <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.panel, { alignSelf: "flex-start" }]}><Text style={textStyle("label")}>{frame.count} overtake{frame.count === 1 ? "" : "s"}</Text></View>}
      </View>
      {!embedded && <View style={[styles.panel, { flex: 1, minWidth: 160 }]} accessibilityLabel="Live replay standings">{frame.standings.filter(lane => !hiddenIds.includes(lane.id)).map(lane => <View key={lane.id} style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 5 }}><Text style={textStyle("label")}>#{lane.place}</Text><Text numberOfLines={1} style={[textStyle(lane.you ? "label" : "caption"), { flex: 1, maxWidth: 140 }]}>{lane.you ? "You" : lane.name}</Text><Text style={textStyle("caption")}>{lane.value.toFixed(1)} {moment.unit}</Text></View>)}</View>}
      </View>
    </View>
    {!reduced && !skipped.current && frame.passEffects.length > 0 && <View pointerEvents="none" style={{ position:"absolute", top:"45%", alignSelf:"center", opacity:Math.max(...frame.passEffects.map(pass => pass.strength)) }}><Text style={{...textStyle("hero"),color:c.tennis}}>+1</Text></View>}
    <View pointerEvents="box-none" style={{ position: "absolute", bottom: (embedded ? 0 : insets.bottom) + 16, left: 16, right: 16, alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 420, gap: 12 }}>
      <FocusButton label={!started && !reduced ? embedded ? "Watch an Overtake →" : "See my move →" : frame.done ? remaining > 1 ? "Continue →" : embedded ? "Replay Overtake →" : "Back to the app →" : "Skip animation"} onPress={() => !started && !reduced ? setStarted(true) : frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; stopPlayback.current(); stopHaptics.current(); setProgress(1); })()}/>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({ panel: { backgroundColor: "rgba(248,249,246,0.94)", borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, borderColor: c.line } });
