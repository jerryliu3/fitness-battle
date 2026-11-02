import { playCue } from "../lib/haptics";
import { textStyle } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { APP_TIMEZONE, syncReviewMetrics, clubDuration, formatVolume, sportById, activityRoute, SYNC_REVIEW_SAVE_DELAY_MS, type CompeteState, type CompetitionMoment as Moment, type SyncReviewReceipt } from "@fitness-battle/shared";
import { FocusButton, f } from "../ui/focus";
import { ActivityRoute } from "../ui/activity-route";
import { RouteStaticPreview } from "../ui/route-static-preview";
import { SHELL_COLORS as c } from "../theme";
import { ScreenFade } from "../ui/screen-fade";
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
  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"} onRequestClose={close}>
    <SafeAreaProvider><ScreenFade identity={receipt ? `receipt:${receipt.account}:${receipt.day}` : `moment:${moment?.id}`}>{!receipt && moment ? <CompetitionMoment key={moment.id} moment={moment} debug={debug} remaining={remaining} onConfirm={onAcknowledge}/> : <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 22, gap: 20, paddingBottom: 32, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {debug && <Text style={f.kicker}>DEBUG PREVIEW · LOCAL DATA ONLY</Text>}
        {receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete} resetScroll={resetScroll}/> : null}
      </ScrollView>
    </SafeAreaView>}</ScreenFade></SafeAreaProvider>
  </Modal>;
}
function Review({ receipt, state, onComplete, resetScroll }: { resetScroll: () => void; receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
  const windowDimensions = useWindowDimensions();
  const cardWidth = Math.max(260, Math.min(360, Math.round((windowDimensions.width || 375) * 0.82)));
  const cardGap = 12;
  const cardScroll = useRef<ScrollViewInstance | null>(null);
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [width, setWidth] = useState(280), [saving, setSaving] = useState(false);
  const complete = useRef(false), dragStart = useRef(0), dragDistance = useRef(0), dragging = useRef(false), saveTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const excludedRef = useRef(excluded);
  excludedRef.current = excluded;
  useEffect(resetScroll, [detail]);
  useEffect(() => () => {
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
  }, []);
  const activities = receipt.activities, selected = activities.filter(a => !excluded.includes(a.id));
  const detent = useRef(0);
  // Each detent plays at most once per gesture, including threshold oscillation.
  const updateSwipe = (distance: number) => {
    const next = Math.min(1, Math.max(0, distance) / Math.max(1, width - 60));
    const step = next >= .85 ? 3 : next >= .65 ? 2 : next >= .35 ? 1 : 0;
    if (step > detent.current) void playCue(step === 3 ? "light" : "selection");
    detent.current = Math.max(detent.current, step);
    setProgress(next);
  };
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
  const selectCard = (idx: number) => {
    if (idx === activeIndex) return;
    if (Platform.OS !== "web" && typeof LayoutAnimation?.configureNext === "function" && !reduced) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveIndex(idx);
  };
  const selectAll = () => {
    if (saving) return;
    void playCue("selection");
    setExcluded([]);
    setProgress(0);
  };
  const deselectAll = () => {
    if (saving) return;
    void playCue("selection");
    setExcluded(activities.map((a) => a.id));
    setProgress(0);
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
    <ActivityMetricBars activity={activity} history={[...receipt.activities, ...state.activities]} units={state.units}/>
  </View>;
  return <View style={{ gap: 20, flex: 1 }}>
    {receipt.preview && <Text style={f.kicker}>SAMPLE PREVIEW · NO COMPETITION CREDIT</Text>}
    <Text accessibilityRole="header" style={textStyle("display")}>Sync completed</Text>
    <Text style={f.massive}>{clubDuration(selected.reduce((n, a) => n + a.movingSec, 0))}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <Text style={textStyle("body")}>{selected.length} of {activities.length} activities selected.</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select all activities"
          disabled={saving || selected.length === activities.length}
          accessibilityState={{ disabled: saving || selected.length === activities.length }}
          onPress={selectAll}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: saving || selected.length === activities.length ? 0.35 : pressed ? 0.6 : 1 }]}
        >
          <Text style={{ ...textStyle("label"), color: c.ink, textDecorationLine: "underline" }}>Select all</Text>
        </Pressable>
        <Text style={{ ...textStyle("caption"), color: c.muted }}>·</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deselect all activities"
          disabled={saving || selected.length === 0}
          accessibilityState={{ disabled: saving || selected.length === 0 }}
          onPress={deselectAll}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: saving || selected.length === 0 ? 0.35 : pressed ? 0.6 : 1 }]}
        >
          <Text style={{ ...textStyle("label"), color: c.ink, textDecorationLine: "underline" }}>Deselect all</Text>
        </Pressable>
      </View>
    </View>
    <View style={{ gap: 12 }}>
      <ScrollView
        ref={cardScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + cardGap}
        contentContainerStyle={{ paddingHorizontal: 2, gap: cardGap }}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const idx = Math.max(0, Math.min(activities.length - 1, Math.round(x / (cardWidth + cardGap))));
          if (idx !== activeIndex) selectCard(idx);
        }}
        scrollEventThrottle={16}
      >
        {activities.map((a) => {
          const isCounted = !excluded.includes(a.id);
          const coords = activityRoute(a);
          return (
            <View
              key={a.id}
              style={{
                width: cardWidth,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              {coords ? (
                <View style={{ height: 180, overflow: "hidden", backgroundColor: "#0b242c" }}>
                  <RouteStaticPreview
                    coordinates={coords}
                    width={cardWidth}
                    height={180}
                    strokeColor="176c75"
                    showPlayBadge={false}
                    onPress={() => openDetail(a.id)}
                  />
                </View>
              ) : (
                <View
                  style={{
                    height: 180,
                    backgroundColor: "#102e38",
                    padding: 16,
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ ...textStyle("caption"), color: c.tennis }}>
                      {sportById(a.sport).name.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text style={{ ...textStyle("display"), color: "#ffffff" }}>
                      {formatVolume(a.sport, a.distanceM, a.movingSec, state.units)}
                    </Text>
                    <Text style={{ ...textStyle("body"), color: "rgba(255,255,255,0.75)" }}>
                      {clubDuration(a.movingSec)}
                    </Text>
                  </View>
                  <Text style={{ ...textStyle("caption"), color: "rgba(255,255,255,0.5)" }}>
                    {new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}
                  </Text>
                </View>
              )}

              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Count ${sportById(a.sport).name} activity ${a.id}`}
                    accessibilityState={{ checked: isCounted, disabled: saving }}
                    disabled={saving}
                    onPress={() => {
                      if (saving) return;
                      void playCue("selection");
                      setExcluded(ids => ids.includes(a.id) ? ids.filter(id => id !== a.id) : [...ids, a.id]);
                      setProgress(0);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        backgroundColor: isCounted ? c.ink : "white",
                        borderWidth: 1.5,
                        borderColor: isCounted ? c.ink : c.line,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ ...textStyle("caption"), color: "white" }}>
                        {isCounted ? "✓" : ""}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...textStyle("label"), color: c.ink }}>
                        {sportById(a.sport).name}
                      </Text>
                      <Text style={{ ...textStyle("caption"), color: c.muted }}>
                        {new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} · {new Date(a.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${sportById(a.sport).name} activity details`}
                    disabled={saving}
                    onPress={() => openDetail(a.id)}
                    style={{ minHeight: 36, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
                  >
                    <Text style={{ ...textStyle("label"), color: c.ink }}>Details ↗</Text>
                  </Pressable>
                </View>

                <ActivityMetricBars activity={a} history={[...receipt.activities, ...state.activities]} units={state.units}/>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <SyncReviewCarouselDots
        total={activities.length}
        activeIndex={activeIndex}
        onSelectIndex={(idx) => {
          cardScroll.current?.scrollTo({ x: idx * (cardWidth + cardGap), animated: !reduced });
          selectCard(idx);
        }}
      />
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
          onResponderGrant={e => { if (saving) return; void playCue("soft"); detent.current = 0; dragging.current = true; dragStart.current = e.nativeEvent.pageX; dragDistance.current = 0; }}
          onResponderMove={e => { if (saving) return; dragDistance.current = Math.max(0, e.nativeEvent.pageX - dragStart.current); updateSwipe(dragDistance.current); }}
          onResponderRelease={e => { if (saving) return; const distance = Math.max(0, e.nativeEvent.pageX - dragStart.current); dragging.current = false; if (distance / travel >= .85) finish(); else setProgress(0); }}
          onResponderTerminate={() => { dragging.current = false; if (!saving) setProgress(0); }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 5, left: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: c.tennis, justifyContent: "center", alignItems: "center", transform: [{ translateX: progress * travel }] }}>{saving ? <ActivityIndicator color={c.ink} /> : <Text style={textStyle("heading")}>→</Text>}</View>
        </View>
      </View>
      {receipt.preview ? <Text style={[textStyle("caption"), { textAlign: "center" }]}>Preview only. No activities or points will be added.</Text> : null}
    </View>
  </View>;
}

export function computeWindowStart(
  prevStart: number,
  activeIndex: number,
  total: number,
  maxVisible: number = 5,
): number {
  if (total <= maxVisible) return 0;
  const clampedIndex = Math.max(0, Math.min(total - 1, activeIndex));
  const maxStart = total - maxVisible;
  const forwardThreshold = prevStart + maxVisible - 2;
  if (clampedIndex > forwardThreshold) {
    return Math.min(maxStart, Math.max(0, clampedIndex - (maxVisible - 2)));
  }
  const backwardThreshold = prevStart + 1;
  if (clampedIndex < backwardThreshold) {
    return Math.max(0, Math.min(maxStart, clampedIndex - 1));
  }
  return Math.min(maxStart, Math.max(0, prevStart));
}

const MAX_VISIBLE_DOTS = 5;
const DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 18;
const DOT_GAP = 6;
const DOT_STEP = DOT_SIZE + DOT_GAP;
const WINDOW_WIDTH = ACTIVE_DOT_WIDTH + (MAX_VISIBLE_DOTS - 1) * DOT_STEP;

export function SyncReviewCarouselDots({
  total,
  activeIndex,
  onSelectIndex,
}: {
  total: number;
  activeIndex: number;
  onSelectIndex?: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const [windowStart, setWindowStart] = useState(() =>
    computeWindowStart(0, activeIndex, total, MAX_VISIBLE_DOTS),
  );

  useEffect(() => {
    setWindowStart((prev) => computeWindowStart(prev, activeIndex, total, MAX_VISIBLE_DOTS));
  }, [activeIndex, total]);

  const translateX = useRef(new Animated.Value(-windowStart * DOT_STEP)).current;

  const isWindowed = total > MAX_VISIBLE_DOTS;

  useEffect(() => {
    if (!isWindowed) return;
    const targetX = -windowStart * DOT_STEP;
    if (reduced) {
      translateX.setValue(targetX);
      return;
    }
    const animation = Animated.timing(translateX, {
      toValue: targetX,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [windowStart, isWindowed, reduced, translateX]);

  if (total <= 1) return null;

  const dots = Array.from({ length: total }, (_, i) => {
    const isActive = i === activeIndex;
    const isLeftEdge = isWindowed && windowStart > 0 && i === windowStart;
    const isRightEdge =
      isWindowed &&
      windowStart + MAX_VISIBLE_DOTS - 1 < total - 1 &&
      i === windowStart + MAX_VISIBLE_DOTS - 1;
    const isOutside = isWindowed && (i < windowStart || i >= windowStart + MAX_VISIBLE_DOTS);
    const scale = isActive
      ? 1
      : isOutside
        ? 0.4
        : isLeftEdge || isRightEdge
          ? 0.67
          : 1;

    return (
      <Pressable
        key={i}
        accessibilityRole="tab"
        accessibilityLabel={`Activity ${i + 1}`}
        accessibilityState={{ selected: isActive }}
        disabled={!onSelectIndex}
        onPress={() => onSelectIndex?.(i)}
        hitSlop={6}
        style={{
          width: isActive ? ACTIVE_DOT_WIDTH : DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: isActive ? c.ink : c.line,
          ...(isWindowed ? { transform: [{ scale }], opacity: isOutside ? 0.2 : 1 } : {}),
        }}
      />
    );
  });

  return (
    <View
      accessible
      accessibilityRole="tablist"
      accessibilityLabel={`Activity ${activeIndex + 1} of ${total}`}
      style={
        isWindowed
          ? {
              width: WINDOW_WIDTH,
              height: 14,
              overflow: "hidden",
              alignSelf: "center",
              justifyContent: "center",
              paddingTop: 4,
            }
          : {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: DOT_GAP,
              paddingTop: 4,
            }
      }
    >
      {isWindowed ? (
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: DOT_GAP,
            transform: [{ translateX }],
          }}
        >
          {dots}
        </Animated.View>
      ) : (
        dots
      )}
    </View>
  );
}

function ActivityMetricBars({ activity, history, units }: { activity: SyncReviewReceipt["activities"][number]; history: CompeteState["activities"]; units: CompeteState["units"] }) {
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 16, paddingVertical: 6 }}>
    {syncReviewMetrics(activity, history, units).map(metric => <View key={metric.id} accessible accessibilityLabel={`${metric.label}: ${metric.valueLabel}. ${metric.comparisonLabel}`} style={{ width: "47%", gap: 6 }}>
      <Text style={{ ...textStyle("label"), color: c.ink }}>{metric.label}: {metric.valueLabel}</Text>
      <View style={{ height: 4, backgroundColor: c.line, overflow: "hidden" }}>
        <View style={{ height: 4, width: `${(metric.fraction ?? 0) * 100}%`, backgroundColor: c.fieldTeal }}/>
      </View>
    </View>)}
    </View>
  </View>;
}
