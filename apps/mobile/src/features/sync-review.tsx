import { textStyle } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { APP_TIMEZONE, clubDuration, formatVolume, sportById, SYNC_REVIEW_SAVE_DELAY_MS, type CompeteState, type CompetitionMoment as Moment, type SyncReviewReceipt } from "@fitness-battle/shared";
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
    <SafeAreaProvider>{!receipt && moment ? <CompetitionMoment key={moment.id} moment={moment} debug={debug} remaining={remaining} onConfirm={onAcknowledge}/> : <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, minHeight: 56 }}>
        <Text style={textStyle("label")}>{receipt ? "Review your activities" : moment?.plan.hasOvertake ? "Your overtakes" : "Your field changed"}</Text>
        {receipt && <Pressable accessibilityRole="button" accessibilityLabel="Apply activities and skip recap" onPress={close} style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}><Text style={textStyle("label")}>Skip</Text></Pressable>}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 22, gap: 20, paddingBottom: 32, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {debug && <Text style={f.kicker}>DEBUG PREVIEW · LOCAL DATA ONLY</Text>}
        {receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete} resetScroll={resetScroll}/> : null}
      </ScrollView>
    </SafeAreaView>}</SafeAreaProvider>
  </Modal>;
}
function Review({ receipt, state, onComplete, resetScroll }: { resetScroll: () => void; receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [width, setWidth] = useState(280), [saving, setSaving] = useState(false);
  const complete = useRef(false), dragStart = useRef(0), dragDistance = useRef(0), dragging = useRef(false), saveTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const excludedRef = useRef(excluded);
  excludedRef.current = excluded;
  useEffect(resetScroll, [detail]);
  useEffect(() => () => {
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
  }, []);
  const activities = receipt.activities, selected = activities.filter(a => !excluded.includes(a.id));
  const finish = () => {
    if (complete.current || saving) return;
    const ids = activities
      .filter((a) => !excludedRef.current.includes(a.id))
      .map((a) => a.id);
    setProgress(1);
    setSaving(true);
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
    saveTimer.current = globalThis.setTimeout(() => {
      saveTimer.current = null;
      if (complete.current) return;
      complete.current = true;
      onComplete(ids);
    }, SYNC_REVIEW_SAVE_DELAY_MS);
  };
  const openDetail = (id: string) => {
    if (saving) return;
    setDetail(id);
  };
  const travel = Math.max(1, width - 60);
  const activity = activities.find(a => a.id === detail);
  if (activity) return <View style={{ gap: 20 }}>
    <FocusButton secondary label="← All activities" disabled={saving} onPress={() => setDetail(null)}/>
    <Text style={f.kicker}>ACTIVITY DETAILS</Text><Text accessibilityRole="header" style={textStyle("display")}>{sportById(activity.sport).name}</Text>
    <ActivityRoute activity={activity} units={state.units}/>
    <Text style={textStyle("heading")}>{formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units)} · {clubDuration(activity.movingSec)}</Text>
    <Text style={textStyle("body")}>{new Date(activity.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE })}</Text>
    <Text style={textStyle("caption")}>{activity.verified ? "GPS Tracked" : "Open activity"}{activity.avgHr ? ` · ${activity.avgHr} bpm average` : ""}{activity.elevationGainM != null ? ` · ${activity.elevationGainM} m elevation gain` : ""}</Text>
  </View>;
  return <View style={{ gap: 20, flex: 1 }}>
    <Text style={f.kicker}>{receipt.preview ? "SAMPLE PREVIEW · NO COMPETITION CREDIT" : "SYNC COMPLETE · YOUR NEXT MOVE"}</Text>
    <Text accessibilityRole="header" style={textStyle("display")}>Make it count.</Text>
    <Text style={f.massive}>{clubDuration(selected.reduce((n, a) => n + a.movingSec, 0))}</Text>
    <Text style={textStyle("body")}>{selected.length} of {activities.length} activities selected. Review your effort, then slide to see what changed.</Text>
    {activities.length > 0 && <ActivityRoute activity={selected[0] ?? activities[0]} units={state.units}/>}
    <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "white", borderWidth: 1, borderColor: c.line }}>
      {activities.map(a => <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderColor: c.line }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Count ${sportById(a.sport).name} activity ${a.id}`} accessibilityState={{ checked: !excluded.includes(a.id), disabled: saving }} disabled={saving} onPress={() => { if (saving) return; setExcluded(ids => ids.includes(a.id) ? ids.filter(id => id !== a.id) : [...ids, a.id]); setProgress(0); }} style={{ minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: excluded.includes(a.id) ? "white" : c.ink, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}><Text style={{ ...textStyle("body"), color: "white" }}>{excluded.includes(a.id) ? "" : "✓"}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${sportById(a.sport).name} activity details`} disabled={saving} onPress={() => openDetail(a.id)} style={{ flex: 1, minHeight: 76, gap: 5, justifyContent: "center" }}><Text style={textStyle("label")}>{sportById(a.sport).name} ↗</Text><Text style={textStyle("caption")}>{formatVolume(a.sport, a.distanceM, a.movingSec, state.units)} · {clubDuration(a.movingSec)}</Text><Text style={textStyle("caption")}>{new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} · {a.verified ? "GPS Tracked" : "Open"}</Text></Pressable>
      </View>)}
    </View>
    {!receipt.preview && excluded.length > 0 && <Text style={textStyle("caption")}>Deselected activities stay saved, excluded from competition.</Text>}
    <View style={{ marginTop: "auto", paddingTop: 16, gap: 12 }}>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: 66, borderRadius: 36, backgroundColor: c.ink, justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <View pointerEvents="none" style={{ position: "absolute", left: progress * width, right: 0, top: 0, bottom: 0, overflow: "hidden", justifyContent: "center" }}>
          <Text style={[textStyle("label"), { color: "white", textAlign: "center", width, marginLeft: -progress * width }]}>{receipt.preview ? "Swipe to preview" : selected.length ? "Swipe to lock it in" : "Swipe to save as excluded"}</Text>
        </View>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Swipe to confirm synced activities" accessibilityState={{ busy: saving }} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} accessibilityActions={[{ name: "increment", label: "Confirm activities" }]} onAccessibilityAction={finish} style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={e => !saving && e.nativeEvent.locationX <= 64}
          onMoveShouldSetResponder={() => !saving && dragging.current}
          onResponderTerminationRequest={() => false}
          onResponderGrant={e => { if (saving) return; dragging.current = true; dragStart.current = e.nativeEvent.pageX; dragDistance.current = 0; }}
          onResponderMove={e => { if (saving) return; dragDistance.current = Math.max(0, e.nativeEvent.pageX - dragStart.current); setProgress(Math.min(1, dragDistance.current / travel)); }}
          onResponderRelease={e => { if (saving) return; const distance = Math.max(0, e.nativeEvent.pageX - dragStart.current); dragging.current = false; if (distance / travel >= .85) finish(); else setProgress(0); }}
          onResponderTerminate={() => { dragging.current = false; if (!saving) setProgress(0); }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 5, left: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: c.tennis, justifyContent: "center", alignItems: "center", transform: [{ translateX: progress * travel }] }}>{saving ? <ActivityIndicator color={c.ink} /> : <Text style={textStyle("heading")}>→</Text>}</View>
        </View>
      </View>
      <Text style={[textStyle("caption"), { textAlign: "center" }]}>{receipt.preview ? "Preview only. No activities or points will be added." : "Your synced activities are saved safely."}</Text>
    </View>
  </View>;
}
