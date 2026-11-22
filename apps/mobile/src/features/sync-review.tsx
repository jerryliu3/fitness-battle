import { useThemeColors } from "../theme";
import { playCue } from "../lib/haptics";
import { textStyle } from "../ui/section";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { accountTimeZone, competeNow, syncChargeBenchmark, formatAccountDateTime, sportById, activityRoute, SYNC_REVIEW_SAVE_DELAY_MS, type CompeteState, type CompetitionMoment as Moment, type SyncReviewReceipt } from "@fitness-battle/shared";
import { AppIcon } from "../ui/app-icon";
import { MaterialClose } from "../ui/material-back";
import { ActivityReplay, ActivitySummaryMetrics } from "../ui/activity-route";
import { RouteStaticPreview } from "../ui/route-static-preview";

import { SyncEnergyCore } from "../ui/sync-energy-core";
import { ScreenFade } from "../ui/screen-fade";
import { CompetitionMoment } from "./competition-moment";
import { useReducedMotion } from "../ui/use-reduced-motion";

export function SyncReview({ receipt, state, moment, debug = false, remaining = 0, onComplete, onAcknowledge = () => {} }: {
  receipt: SyncReviewReceipt | null; state: CompeteState; debug?: boolean; moment?: Moment | null; remaining?: number;
  onComplete: (selected?: readonly string[], quiet?: boolean) => unknown; onAcknowledge?: () => void;
}) {
  const reduced = useReducedMotion();
  const close = () => { if (receipt) onComplete(undefined, true); };
  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"} onRequestClose={close}>
    <SafeAreaProvider><ScreenFade identity={receipt ? `receipt:${receipt.account}:${receipt.day}` : `moment:${moment?.id}`}>{!receipt && moment ? <CompetitionMoment key={moment.id} moment={moment} debug={debug} remaining={remaining} onConfirm={onAcknowledge}/> : receipt ? <Review key={`${receipt.account}:${receipt.day}`} receipt={receipt} state={state} onComplete={onComplete}/> : null}</ScreenFade></SafeAreaProvider>
  </Modal>;
}
function Review({ receipt, state, onComplete }: { receipt: SyncReviewReceipt; state: CompeteState; onComplete: (selected?: readonly string[], quiet?: boolean) => unknown }) {
const c=useThemeColors();

  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = windowDimensions.height - insets.top - insets.bottom;
  const mapHeight = Math.round(Math.max(72, Math.min(160, availableHeight * .18)));
  const coreSize = Math.round(Math.max(132, Math.min(216, availableHeight * .26, windowDimensions.width * .56)));
  const cardWidth = Math.max(260, Math.min(360, Math.round((windowDimensions.width || 375) - 48)));
  const cardGap = 12;
  const cardScroll = useRef<ScrollViewInstance | null>(null);
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [excluded, setExcluded] = useState<string[]>([]), [detail, setDetail] = useState<string | null>(null), [progress, setProgress] = useState(0), [width, setWidth] = useState(280), [saving, setSaving] = useState(false);
  const [warmIds, setWarmIds] = useState<string[]>(() => {
    const first = receipt.activities[0];
    return first && activityRoute(first) ? [first.id] : [];
  });
  const complete = useRef(false), dragStart = useRef(0), dragDistance = useRef(0), dragging = useRef(false), saveTimer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const excludedRef = useRef(excluded);
  excludedRef.current = excluded;
  useEffect(() => () => {
    if (saveTimer.current) globalThis.clearTimeout(saveTimer.current);
  }, []);
  const activities = receipt.activities, selected = activities.filter(a => !excluded.includes(a.id));
  useEffect(() => {
    const targetId = detail ?? (activities[activeIndex] && activityRoute(activities[activeIndex]) ? activities[activeIndex].id : null);
    if (!targetId) return;
    setWarmIds((prev) => (prev[0] === targetId ? prev : [targetId, ...prev.filter((id) => id !== targetId)].slice(0, 3)));
  }, [activeIndex, detail, activities]);
  const metricHistory = useMemo(() => [...receipt.activities, ...state.activities], [receipt.activities, state.activities]);
  const benchmarkSeconds = useMemo(() => syncChargeBenchmark(state.activities, activities, competeNow(state)), [state, activities]);
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
  const closeReview = () => { if (!saving) onComplete(undefined, true); };
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
    if (!saving) setDetail(id);
  };
  const travel = Math.max(1, width - 60);
  const cachedIds = detail && !warmIds.includes(detail) ? [detail, ...warmIds] : warmIds;
  const cachedActivities = cachedIds
    .map((id) => activities.find((item) => item.id === id))
    .filter((item): item is SyncReviewReceipt["activities"][number] => Boolean(item));
  return <View style={{ flex: 1, backgroundColor: c.paper }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, zIndex: 1 }} edges={["top", "bottom"]}>
    <ScrollView scrollEnabled={windowDimensions.fontScale > 1.2 || availableHeight < 650} contentContainerStyle={{ flexGrow: 1, padding: 16, gap: availableHeight < 650 ? 8 : 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.tennis, alignItems: "center", justifyContent: "center" }}><Text style={[textStyle("heading"), { color: c.textOnAction }]}>✓</Text></View>
        <Text accessibilityRole="header" style={[textStyle("heading"), { color: c.ink }]}>{receipt.confirmBeforeSave ? "Review activities" : "Activities synced"}</Text>
      </View>
      <MaterialClose disabled={saving} label={receipt.confirmBeforeSave ? "Cancel import" : "Dismiss review"} onPress={closeReview} />
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
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
          <Text style={{ ...textStyle("label"), color: c.ink }}>Select all</Text>
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
          <Text style={{ ...textStyle("label"), color: c.ink }}>Deselect all</Text>
        </Pressable>
      </View>
      <Text style={[textStyle("caption"), { color: c.muted }]}>{selected.length} of {activities.length} selected</Text>
    </View>
    <View style={{ gap: 12 }}>
      <ScrollView
        ref={cardScroll}
        style={{ marginHorizontal: -16 }}
        horizontal
        scrollEnabled={activities.length > 1}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + cardGap}
        contentContainerStyle={{
          ...(activities.length === 1 ? { flexGrow: 1, justifyContent: "center" } : {}),
          paddingHorizontal: 16,
          gap: cardGap,
        }}
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
                backgroundColor: c.surfaceCard,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              {coords ? (
                <RouteStaticPreview
                  coordinates={coords}
                  width={cardWidth}
                  height={mapHeight}
                  strokeColor="176c75"
                  showPlayBadge={false}
                  style={{ height: mapHeight, borderRadius: 0, borderWidth: 0 }}
                  onPress={() => openDetail(a.id)}
                />
              ) : (
                <View
                  style={{
                    height: mapHeight,
                    backgroundColor: "#102e38",
                    padding: 16,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <AppIcon name={a.sport} size={44} color={c.tennis}/>
                </View>
              )}

              <View style={{ padding: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Count ${sportById(a.sport).name} activity ${a.id}`}
                      accessibilityState={{ checked: isCounted, disabled: saving }}
                      accessibilityHint={receipt.confirmBeforeSave ? "Only selected activities will be imported." : "Deselected activities stay saved, excluded from competition."}
                      disabled={saving}
                      hitSlop={4}
                      onPress={() => {
                        if (saving) return;
                        void playCue("selection");
                        setExcluded(ids => ids.includes(a.id) ? ids.filter(id => id !== a.id) : [...ids, a.id]);
                        setProgress(0);
                      }}
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: saving ? 0.5 : pressed ? 0.7 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          backgroundColor: isCounted ? c.surfaceInverse : c.card,
                          borderWidth: 1.5,
                          borderColor: isCounted ? c.surfaceInverse : c.line,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ ...textStyle("caption"), color: c.textOnInverse }}>
                          {isCounted ? "✓" : ""}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...textStyle("label"), color: c.ink }}>
                        {sportById(a.sport).name}
                      </Text>
                      <Text style={{ ...textStyle("caption"), color: c.muted }}>
                        {new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: accountTimeZone(state) })} · {new Date(a.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: accountTimeZone(state) })}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${sportById(a.sport).name} activity details`}
                    disabled={saving}
                    onPress={() => openDetail(a.id)}
                    style={{ minHeight: 36, minWidth: 44, justifyContent: "center", alignItems: "flex-end" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Text style={{ ...textStyle("caption"), color: c.ink }}>View details</Text><AppIcon name="chevron" size={16}/></View>
                  </Pressable>
                </View>

                <ActivitySummaryMetrics activity={a} history={metricHistory} units={state.units}/>
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
    <View style={{ flex: 1, justifyContent: "center", paddingVertical: 8 }}>
      <SyncEnergyCore activities={selected} history={[...state.activities.filter(a => !excluded.includes(a.id)), ...selected]} benchmarkSeconds={benchmarkSeconds} units={state.units} draining={saving} size={coreSize} active={!detail}/>
    </View>
    <View style={{ paddingTop: 4, gap: 8 }}>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: 66, borderRadius: 36, backgroundColor: c.surfaceInverse, justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <View pointerEvents="none" style={{ position: "absolute", left: progress * width, right: 0, top: 0, bottom: 0, overflow: "hidden", justifyContent: "center" }}>
          <Text style={[textStyle("label"), { color: c.textOnInverse, textAlign: "center", width, marginLeft: -progress * width }]}>Swipe to save</Text>
        </View>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="Swipe to confirm synced activities" accessibilityState={{ busy: saving }} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} accessibilityActions={[{ name: "increment", label: "Confirm activities" }]} onAccessibilityAction={finish} style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={e => !saving && e.nativeEvent.locationX <= 64}
          onMoveShouldSetResponder={() => !saving && dragging.current}
          onResponderTerminationRequest={() => false}
          onResponderGrant={e => { if (saving) return; void playCue("soft"); detent.current = 0; dragging.current = true; dragStart.current = e.nativeEvent.pageX; dragDistance.current = 0; }}
          onResponderMove={e => { if (saving) return; dragDistance.current = Math.max(0, e.nativeEvent.pageX - dragStart.current); updateSwipe(dragDistance.current); }}
          onResponderRelease={e => { if (saving) return; const distance = Math.max(0, e.nativeEvent.pageX - dragStart.current); dragging.current = false; if (distance / travel >= .85) finish(); else setProgress(0); }}
          onResponderTerminate={() => { dragging.current = false; if (!saving) setProgress(0); }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 5, left: 4, width: 56, height: 56, borderRadius: 28, backgroundColor: c.tennis, justifyContent: "center", alignItems: "center", transform: [{ translateX: progress * travel }] }}>{saving ? <ActivityIndicator color={c.textOnAction} /> : <Text style={{ ...textStyle("heading"), color: c.textOnAction }}>→</Text>}</View>
        </View>
      </View>
    </View>
    </ScrollView>
  </SafeAreaView>
    {cachedActivities.map((cachedActivity) => (
      <ActivityReplay
        key={cachedActivity.id}
        activity={cachedActivity}
        open={detail === cachedActivity.id}
        backLabel="Back to activities"
        dateLabel={formatAccountDateTime(state, cachedActivity.startedAt, { year: true })}
        history={metricHistory}
        units={state.units}
        onClose={() => setDetail(null)}
      />
    ))}
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
const c=useThemeColors();

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
