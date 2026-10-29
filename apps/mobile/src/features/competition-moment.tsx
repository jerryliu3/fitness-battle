import { createThemedStyles, useThemedStyles } from "../theme";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { competitionMomentScene, sportById, type ArenaLane, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useCompeteStore } from "../lib/compete-store";
import { useFieldAppearance } from "../ui/field-course";
import { LaneTrack } from "../ui/lane-track";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { textStyle } from "../ui/section";
import { FocusButton } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { playCue } from "../lib/haptics";
const ignore = () => {};

export function CompetitionMoment({ moment, remaining, onConfirm, debug = false }: { moment: Moment; remaining: number; onConfirm: () => void; debug?: boolean }) {
  const styles = useThemedStyles(stylesThemes);

  const { accountKey } = useCompeteStore();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = blocks.map(block => block.id);
  const [appearance] = useFieldAppearance(accountKey, moment.sport);
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    let raf = 0;
    setProgress(0);
    const start = Date.now(), duration = 4200 + count * 1150;
    const tick = () => { if (skipped.current) return; const p = Math.min(1, (Date.now() - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count]);
  const frame = competitionMomentScene(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  const lanes: ArenaLane[] = frame.lanes.map(lane => ({ ...lane, you: Boolean(lane.you), ghost: false, values: [lane.value, lane.value, lane.value] }));
  return <View style={{ flex: 1 }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {height > 0 && <LaneTrack hiddenIds={hiddenIds} fullscreen focusOnMount followSelected animateSelection={false} appearance={appearance} height={height} lanes={lanes} unit={moment.unit} showGhost={false} selectedId={moment.plan.youId} index={2} onSelect={ignore} view={frame.view}/>}
    </View>
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, gap: 10 }}>
      <View style={styles.panel}><Text style={textStyle("label")}>{sportById(moment.sport).name} · REPLAY</Text>{debug && <Text style={textStyle("caption")}>DEBUG PREVIEW · LOCAL DATA ONLY</Text>}</View>
      <View style={[styles.panel, { alignSelf: "flex-end", minWidth: 200 }]} accessibilityLabel="Live replay standings">{frame.standings.filter(lane => !hiddenIds.includes(lane.id)).map(lane => <View key={lane.id} style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 5 }}><Text style={textStyle("label")}>#{lane.place}</Text><Text numberOfLines={1} style={[textStyle(lane.you ? "label" : "caption"), { flex: 1, maxWidth: 140 }]}>{lane.you ? "You" : lane.name}</Text><Text style={textStyle("caption")}>{lane.value.toFixed(1)} {moment.unit}</Text></View>)}</View>
    </View>
    <View pointerEvents="box-none" style={{ position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16, alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 420, gap: 12 }}>
      <View style={styles.panel} accessibilityLiveRegion="polite">
        <Text style={textStyle("heading")}>{frame.count} {passedBy ? "passed you" : `overtake${frame.count === 1 ? "" : "s"}`}{!passedBy && frame.count > 1 ? ` · ×${frame.count} COMBO` : ""}</Text>
        <Text style={textStyle("caption")}>Your place #{frame.rank}{frame.done ? " · Up to date" : " · Replaying your field"}</Text>
      </View>
      <FocusButton label={frame.done ? remaining > 1 ? "Continue →" : "Back to the app →" : "Skip animation"} onPress={() => frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}/>
      </View>
    </View>
  </View>;
}
const stylesThemes = createThemedStyles((themeColors) => ({ panel: { backgroundColor: "rgba(248,249,246,0.94)", borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, borderColor: themeColors.line } }));
