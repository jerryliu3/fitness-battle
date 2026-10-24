import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { APP_TIMEZONE, clubDuration, formatVolume, sportById, type CompeteState, type CompetitionMoment as Moment, type SyncReviewReceipt } from "@fitness-battle/shared";
import { FocusButton, f } from "../ui/focus";
import { ActivityRoute } from "../ui/activity-route";
import { SHELL_COLORS as c } from "../theme";
import { CompetitionMoment } from "./competition-moment";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function SyncReview({ receipt, state, moment, debug = false, remaining = 0, onComplete, onAcknowledge = () => {} }: {
  receipt: SyncReviewReceipt | null; state: CompeteState; debug?: boolean; moment?: Moment | null; remaining?: number;
  onComplete: (selected?: readonly string[], quiet?: boolean) => unknown; onAcknowledge?: () => void;
}) {
  const reduced = useReducedMotion();
  const close = () => { if (receipt) onComplete(undefined, true); };
  const scroll = useRef<ScrollViewInstance | null>(null);
  const resetScroll = () => scroll.current?.scrollTo({ y: 0, animated: false });
  useEffect(resetScroll, [receipt ? "review" : moment?.id]);
  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "slide"} onRequestClose={close}>
    <SafeAreaProvider><SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, minHeight: 56 }}>
        <Text style={f.rowTitle}>{receipt ? "Review your activities" : moment?.plan.hasOvertake ? "Your overtakes" : "Your field changed"}</Text>
        {receipt && <Pressable accessibilityRole="button" accessibilityLabel="Apply activities and skip recap" onPress={close} style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}><Text style={f.small}>Skip</Text></Pressable>}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 22, gap: 20, paddingBottom: 32, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {debug && <Text style={f.kicker}>DEBUG PREVIEW · LOCAL DATA ONLY</Text>}
        {receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete} resetScroll={resetScroll}/> : moment ? <CompetitionMoment key={moment.id} moment={moment} remaining={remaining} onConfirm={onAcknowledge}/> : null}
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
function Review({ receipt, state, onComplete, resetScroll }: { resetScroll: () => void; receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [width, setWidth] = useState(280);
  const complete = useRef(false), dragStart = useRef(0), dragDistance = useRef(0), dragging = useRef(false);
  useEffect(resetScroll, [detail]);
  const activities = receipt.activities, selected = activities.filter(a => !excluded.includes(a.id));
  const latest = useRef({ onComplete, selected }); latest.current = { onComplete, selected };
  const finish = () => { if (complete.current) return; complete.current = true; latest.current.onComplete(latest.current.selected.map(a => a.id)); };
  const travel = Math.max(1, width - 60);
  const activity = activities.find(a => a.id === detail);
  if (activity) return <View style={{ gap: 20 }}>
    <FocusButton secondary label="← All activities" onPress={() => setDetail(null)}/>
    <Text style={f.kicker}>ACTIVITY DETAILS</Text><Text accessibilityRole="header" style={f.title}>{sportById(activity.sport).name}</Text>
    <ActivityRoute activity={activity} units={state.units}/>
    <Text style={f.h2}>{formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units)} · {clubDuration(activity.movingSec)}</Text>
    <Text style={f.copy}>{new Date(activity.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE })}</Text>
    <Text style={f.small}>{activity.verified ? "GPS Tracked" : "Open activity"}{activity.avgHr ? ` · ${activity.avgHr} bpm average` : ""}{activity.elevationGainM != null ? ` · ${activity.elevationGainM} m elevation gain` : ""}</Text>
  </View>;
  return <View style={{ gap: 20, flex: 1 }}>
    <Text style={f.kicker}>{receipt.preview ? "SAMPLE PREVIEW · NO COMPETITION CREDIT" : "SYNC COMPLETE · YOUR NEXT MOVE"}</Text>
    <Text accessibilityRole="header" style={f.title}>Make it count.</Text>
    <Text style={[f.massive, { fontSize: 60 }]}>{clubDuration(selected.reduce((n, a) => n + a.movingSec, 0))}</Text>
    <Text style={f.copy}>{selected.length} of {activities.length} activities selected. Review your effort, then slide to see what changed.</Text>
    {activities.length > 0 && <ActivityRoute activity={selected[0] ?? activities[0]} units={state.units}/>}
    <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "white", borderWidth: 1, borderColor: c.line }}>
      {activities.map(a => <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderColor: c.line }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Count ${sportById(a.sport).name} activity ${a.id}`} accessibilityState={{ checked: !excluded.includes(a.id) }} onPress={() => { setExcluded(ids => ids.includes(a.id) ? ids.filter(id => id !== a.id) : [...ids, a.id]); setProgress(0); }} style={{ minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: excluded.includes(a.id) ? "white" : c.ink, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "white", fontSize: 17 }}>{excluded.includes(a.id) ? "" : "✓"}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${sportById(a.sport).name} activity details`} onPress={() => setDetail(a.id)} style={{ flex: 1, minHeight: 76, gap: 5, justifyContent: "center" }}><Text style={f.rowTitle}>{sportById(a.sport).name} ↗</Text><Text style={f.small}>{formatVolume(a.sport, a.distanceM, a.movingSec, state.units)} · {clubDuration(a.movingSec)}</Text><Text style={f.small}>{new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} · {a.verified ? "GPS Tracked" : "Open"}</Text></Pressable>
      </View>)}
    </View>
    {!receipt.preview && excluded.length > 0 && <Text style={f.small}>Deselected activities stay saved, excluded from competition.</Text>}
    <View style={{ marginTop: "auto", paddingTop: 16, gap: 12 }}>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: 66, borderRadius: 36, backgroundColor: c.ink, justifyContent: "center", position: "relative" }}>
        <Text style={[f.rowTitle, { color: "white", textAlign: "center", paddingLeft: 46, fontSize: 14 }]}>{receipt.preview ? "Swipe to preview" : selected.length ? "Swipe to lock it in" : "Swipe to save as excluded"}</Text>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Swipe to confirm synced activities" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} accessibilityActions={[{ name: "increment", label: "Confirm activities" }]} onAccessibilityAction={finish} style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={e => e.nativeEvent.locationX <= 64}
          onMoveShouldSetResponder={() => dragging.current}
          onResponderTerminationRequest={() => false}
          onResponderGrant={e => { dragging.current = true; dragStart.current = e.nativeEvent.pageX; dragDistance.current = 0; }}
          onResponderMove={e => { dragDistance.current = Math.max(0, e.nativeEvent.pageX - dragStart.current); setProgress(Math.min(1, dragDistance.current / travel)); }}
          onResponderRelease={e => { const distance = Math.max(0, e.nativeEvent.pageX - dragStart.current); dragging.current = false; if (distance / travel >= .85) finish(); else setProgress(0); }}
          onResponderTerminate={() => { dragging.current = false; setProgress(0); }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 5, left: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: c.tennis, justifyContent: "center", alignItems: "center", transform: [{ translateX: progress * travel }] }}><Text style={f.h2}>→</Text></View>
        </View>
      </View>
      <Text style={[f.small, { textAlign: "center" }]}>{receipt.preview ? "Preview only. No activities or points will be added." : "Your synced activities are saved safely."}</Text>
    </View>
  </View>;
}
