import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";
import { AppText, textStyle } from "./section";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { activityRoute, normalizeRouteReplay, sportById, syncReviewMetrics, type SyncReviewMetric, type RouteReplaySample, type Activity } from "@fitness-battle/shared";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { AppIcon, type AppIconName } from "./app-icon";
import { MapHudBackdrop, useMapHud } from "./map-hud";
import { MaterialBack } from "./material-back";
import { CompeteSheet } from "./compete-sheet";
import { RouteStaticPreview } from "./route-static-preview";
import { RouteTimelapse, type RoutePlaybackController, type RoutePlaybackState } from "./route-timelapse";
import { SettingsToggleRow } from "./settings-toggle-row";

import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";


/** Saved activities open the same player that Sync Review embeds. */
export function ActivityRoute({ activity, milestone = false, units = "metric", dateLabel, history }: {
  activity?: Activity;
  milestone?: boolean;
  dateLabel?: string;
  history?: readonly Activity[];
  units?: ActivityReplayUnits;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const coordinates = activityRoute(activity);
  if (!activity || !coordinates) return null;
  return (
    <View style={{ gap: 12 }}>
      {activity.id.startsWith("local-route-") && <AppText role="caption">Local file preview · original activity date · Open only</AppText>}
      {milestone && <AppText role="caption">Full activity route · the record segment is not identified.</AppText>}
      <RouteStaticPreview coordinates={coordinates} height={220} strokeColor="176c75" playLabel="Explore"
        onPress={() => setOpen(true)} />
      {open && <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"} onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider style={{ flex: 1 }}>
          <ActivityReplay key={activity.id} activity={activity} units={units} history={history} dateLabel={dateLabel} onClose={() => setOpen(false)} />
        </SafeAreaProvider>
      </Modal>}
    </View>
  );
}

type ActivityReplayUnits = "us" | "metric";
const PLAYBACK_DOCK_HEIGHT = 104;

export function ActivityReplay({ activity, units, open = true, onClose, backLabel = "Back to activity", dateLabel, history = [] }: {
  activity: Activity;
  units: ActivityReplayUnits;
  open?: boolean;
  onClose: () => void;
  backLabel?: string;
  dateLabel?: string;
  history?: readonly Activity[];
}) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const controller = useRef<RoutePlaybackController | null>(null);
  const [state, setState] = useState<RoutePlaybackState>({
    isPlaying: false, isFinished: false, progress: 0, currentDistanceKm: 0, totalDistanceKm: 0, isRecordingVideo: false,
  });
  const [unavailable, setUnavailable] = useState(false);
  const [expandRequest, setExpandRequest] = useState(0);
  const hasRoute = Boolean(activityRoute(activity));
  const canPlay = hasRoute && !unavailable;
  const dockHeight = canPlay ? PLAYBACK_DOCK_HEIGHT + insets.bottom : 0;

  useEffect(() => {
    if (!open) controller.current?.pause();
  }, [open]);

  const header = <View style={{ gap: 4 }}>
    <AppText accessibilityRole="header" role="heading">{sportById(activity.sport).name}</AppText>
    {dateLabel && <AppText role="caption" secondary>{dateLabel}</AppText>}
  </View>;

  return (
    <View pointerEvents={open ? "auto" : "none"} accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.paper, opacity: open ? 1 : 0, zIndex: open ? 50 : 0 }]}>
      {hasRoute && <ActivityReplayMap activity={activity} units={units} controllerRef={controller}
        onPlaybackState={setState} unavailable={unavailable} onUnavailable={() => setUnavailable(true)} />}
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 40 }}>
        <MaterialBack onPress={onClose} label={backLabel} />
      </View>
      <CompeteSheet active={open} expandRequest={expandRequest} defaultIndex={0} bottomInset={dockHeight} overview={canPlay ? undefined : header}>
        {canPlay && header}
        <ActivitySummaryMetrics activity={activity} history={history} units={units} />
        {hasRoute && <AppText role="caption" secondary>
          Replay follows recorded GPS points. Playback speed is illustrative. Speed may be calculated from the recorded GPS interval.
        </AppText>}
        {!hasRoute && <AppText role="caption" secondary>No GPS route recorded</AppText>}
      </CompeteSheet>
      {canPlay && <View style={[styles.playbackDock, { height: dockHeight, paddingBottom: insets.bottom, backgroundColor: c.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show activity details"
          onPress={() => setExpandRequest(request => request + 1)} style={styles.dockHandle}>
          <View style={[styles.grip, { backgroundColor: c.muted }]} />
        </Pressable>
        <SheetReplayBar state={state} units={units} controller={controller} />
      </View>}
    </View>
  );
}

function ActivityReplayMap({ activity, units, onPlaybackState, controllerRef, unavailable, onUnavailable }: {
  activity: Activity;
  units: ActivityReplayUnits;
  onPlaybackState: (state: RoutePlaybackState) => void;
  controllerRef: MutableRefObject<RoutePlaybackController | null>;
  unavailable: boolean;
  onUnavailable: () => void;
}) {
  const s = useThemedStyles(sThemes);
  const hud = useMapHud();
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [fetched, setFetched] = useState<{ id: string; owner?: string; detailedPolyline?: string; samples: RouteReplaySample[] } | null>(null);
  const fetchedLine = fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.detailedPolyline : undefined;
  const coordinates = useMemo(
    () => activityRoute(activity ? { ...activity, detailedPolyline: fetchedLine ?? activity.detailedPolyline } : undefined),
    [activity?.summaryPolyline, activity?.detailedPolyline, fetchedLine],
  );
  const [mode, setMode] = useState<"2d-overview" | "3d-flyover">("2d-overview");
  const { open: layerMenuOpen, close: closeLayerMenu, toggle: toggleLayerMenu, anchorRef: layerAnchorRef, menuLayout: layerMenuLayout } = useAnchoredMenu({ minWidth: 200, estimatedHeight: 60 });
  const pendingMode = useRef<(() => void) | null>(null);
  const finishPendingMode = () => {
    const fn = pendingMode.current;
    pendingMode.current = null;
    fn?.();
  };

  // Prefetch detailed route samples immediately in background so replay is ready
  useEffect(() => {
    if (!activity || activity.routeReplay?.length || !auth.user || auth.offlineMode) return;
    const id = activity.id;
    const owner = auth.user.id;
    let alive = true;
    void requestApi<{ routeReplay: unknown; detailedPolyline?: string }>(
      mobileEnv.apiUrl,
      auth.accessToken,
      `/api/fitness/replay?activityId=${encodeURIComponent(id)}`,
    )
      .then((body) => {
        if (alive) {
          setFetched({
            id,
            owner,
            detailedPolyline: typeof body.detailedPolyline === "string" ? body.detailedPolyline : undefined,
            samples: normalizeRouteReplay(body.routeReplay),
          });
        }
      })
      .catch(() => {
        /* Optional telemetry never prevents route playback. */
      });
    return () => {
      alive = false;
    };
  }, [activity?.id, activity?.routeReplay, auth.user?.id, auth.offlineMode, auth.accessToken]);

  const routeReplay =
    activity?.routeReplay?.length ? activity.routeReplay :
    (fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.samples : undefined);

  if (!coordinates || !activity) return null;

  const switchImmersiveMode = () => {
    const next = mode === "3d-flyover" ? "2d-overview" : "3d-flyover";
    const apply = () => {
      setMode(next);
      controllerRef?.current?.setMode(next);
    };
    if (Platform.OS === "ios") pendingMode.current = apply;
    else apply();
    closeLayerMenu();
  };

  const player = unavailable ? (
    <View style={s.unavailableBox}>
      <RouteStaticPreview coordinates={coordinates} width={window.width} height={window.height} strokeColor="176c75" showPlayBadge={false} />
      <AppText role="caption" style={[s.unavailableCaption, { top: insets.top + 64 }]}>
        Route outline only. Interactive maps and flyovers are currently unavailable.
      </AppText>
    </View>
  ) : (
    <RouteTimelapse
      coordinates={coordinates}
      routeReplay={routeReplay ?? undefined}
      units={units}
      running={activity.sport === "running"}
      mode="2d-overview"
      hideControls
      hudInsets={{ top: insets.top + 8, bottom: PLAYBACK_DOCK_HEIGHT + insets.bottom }}
      onStateChange={onPlaybackState}
      controllerRef={controllerRef}
      onUnavailable={onUnavailable}
      style={s.fullPlayer}
    />
  );

  return <View style={StyleSheet.absoluteFill}>
    {player}
    {!unavailable && (
      <View ref={layerAnchorRef} collapsable={false} style={{ position: "absolute", top: insets.top + 8, right: 16, zIndex: 40 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Map layers"
          accessibilityState={{ expanded: layerMenuOpen }}
          hitSlop={8}
          onPress={toggleLayerMenu}
          style={({ pressed }) => [{
            minHeight: 44,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: hud.chrome?.backgroundColor ?? "rgba(20, 20, 19, 0.72)",
            borderWidth: 1,
            borderColor: hud.chrome?.borderColor ?? "rgba(255, 255, 255, 0.2)",
          }, pressed && { opacity: 0.75 }]}
        >
          <MapHudBackdrop radius={22} />
          <AppIcon name="layers" size={22} color={hud.ink} />
        </Pressable>
        <AnchoredMenu open={layerMenuOpen} onClose={closeLayerMenu} onDismiss={finishPendingMode} menuLayout={layerMenuLayout} style={{ width: layerMenuLayout?.width ?? 200 }} accessibilityLabel="Close map layers">
          <SettingsToggleRow label="3D view" value={mode === "3d-flyover"} onChange={switchImmersiveMode} />
        </AnchoredMenu>
      </View>
    )}
  </View>;

}

const styles = StyleSheet.create({
  playbackDock: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 31, paddingHorizontal: 16, justifyContent: "center", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  dockHandle: { height: 44, alignItems: "center", justifyContent: "center" },
  grip: { width: 40, height: 4, borderRadius: 4 },
});

const sThemes = createThemedStyles(c => ({
  fullPlayer: { flex: 1, width: "100%", borderRadius: 0 },
  unavailableCaption: { position: "absolute", left: 16, right: 16, padding: 12, borderRadius: 12, backgroundColor: c.paper },
  unavailableBox: { flex: 1, alignItems: "center" },
}));

function SheetReplayBar({ state, units, controller }: {
  state: RoutePlaybackState;
  units: ActivityReplayUnits;
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

const METRIC_ICONS: Record<SyncReviewMetric["id"], AppIconName> = {
  distance: "distance",
  duration: "time",
  "heart-rate": "heart",
  elevation: "progress",
};

export function ActivitySummaryMetrics({ activity, history, units }: { activity: Activity; history: readonly Activity[]; units: ActivityReplayUnits }) {
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
