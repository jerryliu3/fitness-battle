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
import { accountTimeZone, competeNow, syncChargeBenchmark, syncReviewMetrics, formatAccountDateTime, sportById, activityRoute, SYNC_REVIEW_SAVE_DELAY_MS, type CompeteState, type CompetitionMoment as Moment, type SyncReviewMetric, type SyncReviewReceipt } from "@fitness-battle/shared";
import { AppIcon, type AppIconName } from "../ui/app-icon";
import { MaterialBack, MaterialClose } from "../ui/material-back";
import { CompeteSheet } from "../ui/compete-sheet";
import { ActivityRoute } from "../ui/activity-route";
import { RouteStaticPreview } from "../ui/route-static-preview";
import type { RoutePlaybackController, RoutePlaybackState } from "../ui/route-timelapse";

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
        <Text accessibilityRole="header" style={[textStyle("heading"), { color: c.ink }]}>Activities synced</Text>
      </View>
      <MaterialClose disabled={saving} label="Cancel sync" onPress={() => { if (!saving) onComplete([], true); }} />
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
        horizontal
        scrollEnabled={activities.length > 1}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + cardGap}
        contentContainerStyle={{
          ...(activities.length === 1 ? { flexGrow: 1, justifyContent: "center" } : {}),
          paddingHorizontal: 2,
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
                <View style={{ height: mapHeight, overflow: "hidden", backgroundColor: "#0b242c" }}>
                  <RouteStaticPreview
                    coordinates={coords}
                    width={cardWidth}
                    height={mapHeight}
                    strokeColor="176c75"
                    showPlayBadge={false}
                    onPress={() => openDetail(a.id)}
                  />
                </View>
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
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Count ${sportById(a.sport).name} activity ${a.id}`}
                    accessibilityState={{ checked: isCounted, disabled: saving }}
                    accessibilityHint="Deselected activities stay saved, excluded from competition."
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...textStyle("label"), color: c.ink }}>
                        {sportById(a.sport).name}
                      </Text>
                      <Text style={{ ...textStyle("caption"), color: c.muted }}>
                        {new Date(a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: accountTimeZone(state) })} · {new Date(a.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: accountTimeZone(state) })}
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
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Text style={{ ...textStyle("caption"), color: c.ink }}>View details</Text><AppIcon name="chevron" size={16}/></View>
                  </Pressable>
                </View>

                <ActivityMetrics activity={a} history={metricHistory} units={state.units}/>
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
      <SyncEnergyCore activities={selected} benchmarkSeconds={benchmarkSeconds} units={state.units} draining={saving} size={coreSize} active={!detail}/>
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
      <CachedActivityDetail
        key={cachedActivity.id}
        activity={cachedActivity}
        open={detail === cachedActivity.id}
        history={metricHistory}
        units={state.units}
        topInset={insets.top}
        onClose={() => setDetail(null)}
      />
    ))}
  </View>;
}

function CachedActivityDetail({
  activity,
  open,
  history,
  units,
  topInset,
  onClose,
}: {
  activity: SyncReviewReceipt["activities"][number];
  open: boolean;
  history: CompeteState["activities"];
  units: CompeteState["units"];
  topInset: number;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const replayController = useRef<RoutePlaybackController | null>(null);
  const [replayState, setReplayState] = useState<RoutePlaybackState>({
    isPlaying: false,
    isFinished: false,
    progress: 0,
    currentDistanceKm: 0,
    totalDistanceKm: 0,
    isRecordingVideo: false,
  });

  useEffect(() => {
    if (!open) replayController.current?.pause();
  }, [open]);

  const hasRoute = !!activityRoute(activity);
  const headerBlock = (
    <View style={{ gap: 4, ...(hasRoute ? { marginBottom: 14 } : {}) }}>
      <Text accessibilityRole="header" style={[textStyle("heading"), { color: c.ink }]}>
        {sportById(activity.sport).name}
      </Text>
      <Text style={[textStyle("caption"), { color: c.muted }]}>
        {formatAccountDateTime(state, activity.startedAt, { year: true })}
      </Text>
    </View>
  );

  return (
    <View
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: c.paper, opacity: open ? 1 : 0, zIndex: open ? 50 : 0 },
      ]}
    >
      <ActivityRoute
        activity={activity}
        units={units}
        immersive
        hideControls
        controllerRef={replayController}
        onPlaybackState={setReplayState}
      />
      <View style={{ position: "absolute", top: topInset + 8, left: 16, zIndex: 40 }}>
        <MaterialBack onPress={onClose} label="Back to activities" />
      </View>
      <CompeteSheet
        active={open}
        expandRequest={0}
        defaultIndex={0}
        overview={
          hasRoute ? (
            <SheetReplayBar state={replayState} units={units} controller={replayController} />
          ) : (
            headerBlock
          )
        }
      >
        {hasRoute ? headerBlock : null}
        <ActivityMetrics activity={activity} history={history} units={units} />
        {!hasRoute && (
          <Text style={[textStyle("body"), { color: c.muted, marginTop: 16 }]}>
            No GPS route recorded
          </Text>
        )}
      </CompeteSheet>
    </View>
  );
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

const METRIC_ICONS: Record<SyncReviewMetric["id"], AppIconName> = {
  distance: "distance",
  duration: "time",
  "heart-rate": "heart",
  elevation: "progress",
};

function ActivityMetrics({ activity, history, units }: { activity: SyncReviewReceipt["activities"][number]; history: CompeteState["activities"]; units: CompeteState["units"] }) {
  const c = useThemeColors();
  const metrics = syncReviewMetrics(activity, history, units);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 10, paddingTop: 2 }}>
      {metrics.map((metric) => (
        <View
          key={metric.id}
          accessible
          accessibilityLabel={`${metric.label}: ${metric.valueLabel}. ${metric.comparisonLabel}`}
          style={{ width: "47%", gap: 4 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <AppIcon name={METRIC_ICONS[metric.id]} size={13} color={c.fieldTeal} />
            <Text numberOfLines={1} style={{ ...textStyle("caption"), color: c.muted, flexShrink: 1 }}>
              {metric.label}
            </Text>
          </View>
          <Text style={{ ...textStyle("label"), color: c.ink, fontVariant: ["tabular-nums"] }}>
            {metric.valueLabel}
          </Text>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: c.line, overflow: "hidden" }}>
            <View
              style={{
                height: 5,
                borderRadius: 999,
                width: `${Math.round((metric.fraction ?? 1) * 100)}%`,
                backgroundColor: c.fieldTeal,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function SheetReplayBar({ state, units, controller }: {
  state: RoutePlaybackState;
  units: CompeteState["units"];
  controller: { current: RoutePlaybackController | null };
}) {
  const c = useThemeColors();
  const [trackWidth, setTrackWidth] = useState(120);
  const factor = units === "us" ? 1 / 1.609344 : 1;
  const distanceUnit = units === "us" ? "mi" : "km";
  const seekAt = (x: number) => {
    const p = Math.max(0, Math.min(1, x / Math.max(1, trackWidth)));
    controller.current?.seek(p);
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.isFinished ? "Replay timelapse" : state.isPlaying ? "Pause timelapse" : "Play timelapse"}
        disabled={state.isRecordingVideo}
        onPress={() => {
          if (state.isFinished) controller.current?.replay();
          else if (state.isPlaying) controller.current?.pause();
          else controller.current?.play();
        }}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: c.tennis,
          alignItems: "center",
          justifyContent: "center",
          opacity: state.isRecordingVideo ? 0.5 : pressed ? 0.75 : 1,
        })}
      >
        <AppIcon name={state.isFinished ? "replay" : state.isPlaying ? "pause" : "play"} size={18} color={c.textOnAction} />
      </Pressable>
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !state.isRecordingVideo}
        onMoveShouldSetResponder={() => !state.isRecordingVideo}
        onResponderGrant={(e) => seekAt(e.nativeEvent.locationX)}
        onResponderMove={(e) => seekAt(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        accessibilityLabel="Route timelapse scrubber"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(state.progress * 100) }}
        style={{ flex: 1, height: 36, justifyContent: "center" }}
      >
        <View style={{ height: 6, borderRadius: 999, backgroundColor: c.line, overflow: "hidden" }}>
          <View style={{ height: 6, borderRadius: 999, width: `${Math.round(state.progress * 100)}%`, backgroundColor: c.tennis }} />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: Math.max(0, Math.min(trackWidth - 16, state.progress * trackWidth - 8)), width: 16, height: 16, borderRadius: 8, backgroundColor: c.tennis, borderWidth: 2, borderColor: c.surfaceCard }} />
      </View>
      <Text style={{ ...textStyle("caption"), color: c.muted, fontVariant: ["tabular-nums"] }}>
        <Text style={{ ...textStyle("field"), color: c.ink }}>{(state.currentDistanceKm * factor).toFixed(1)}</Text>
        {` / ${(state.totalDistanceKm * factor).toFixed(1)} ${distanceUnit}`}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export Video"
        disabled={state.isRecordingVideo}
        onPress={() => controller.current?.exportVideo()}
        style={({ pressed }) => ({
          minHeight: 36,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: c.soft,
          alignItems: "center",
          justifyContent: "center",
          opacity: state.isRecordingVideo ? 0.6 : pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ ...textStyle("field"), color: c.ink }}>
          {state.isRecordingVideo ? `${Math.round((state.recordingProgress ?? 0) * 100)}%` : "Export"}
        </Text>
      </Pressable>
    </View>
  );
}
