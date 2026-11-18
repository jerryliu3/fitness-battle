import { createThemedStyles, useThemedStyles } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";
import { AppText, textStyle } from "./section";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { activityRoute, normalizeRouteReplay, type RouteReplaySample, type Activity } from "@fitness-battle/shared";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { AppIcon } from "./app-icon";
import { FocusSegments } from "./focus";
import { IconButton } from "./icon-button";
import { RouteStaticPreview } from "./route-static-preview";
import { RouteTimelapse, type RoutePlaybackController, type RoutePlaybackState } from "./route-timelapse";
import { SettingsToggleRow } from "./settings-toggle-row";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";


export function ActivityRoute({
  activity,
  milestone = false,
  immersive = false,
  hideControls = false,
  units = "metric",
  onPlaybackState,
  controllerRef,
}: {
  activity?: Activity;
  milestone?: boolean;
  immersive?: boolean;
  hideControls?: boolean;
  units?: "us" | "metric";
  onPlaybackState?: (state: RoutePlaybackState) => void;
  controllerRef?: MutableRefObject<RoutePlaybackController | null>;
}) {
const s=useThemedStyles(sThemes);

  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduced = useReducedMotion();
  const [fetched, setFetched] = useState<{ id: string; owner?: string; detailedPolyline?: string; samples: RouteReplaySample[] } | null>(null);
  const fetchedLine = fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.detailedPolyline : undefined;
  const coordinates = useMemo(
    () => activityRoute(activity ? { ...activity, detailedPolyline: fetchedLine ?? activity.detailedPolyline } : undefined),
    [activity?.summaryPolyline, activity?.detailedPolyline, fetchedLine],
  );
  const [mode, setMode] = useState<"2d-overview" | "3d-flyover">("2d-overview");
  const initialMode = useRef(mode).current;
  const [fullScreen, setFullScreen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const { open: layerMenuOpen, close: closeLayerMenu, toggle: toggleLayerMenu, anchorRef: layerAnchorRef, menuLayout: layerMenuLayout } = useAnchoredMenu({ minWidth: 200, estimatedHeight: 60 });
  const pendingMode = useRef<(() => void) | null>(null);
  const finishPendingMode = () => {
    const fn = pendingMode.current;
    pendingMode.current = null;
    fn?.();
  };

  // Prefetch detailed route samples immediately in background so replay is ready
  useEffect(() => {
    if (!activity || activity.routeReplay || !auth.user || auth.offlineMode) return;
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
    activity?.routeReplay ??
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
    <View style={[s.unavailableBox, immersive && { flex: 1, padding: 0 }]}>
      <RouteStaticPreview coordinates={coordinates} width={immersive ? window.width : undefined} height={immersive ? window.height : 260} strokeColor="176c75" showPlayBadge={false} />
      <AppText role="caption" style={immersive ? [s.unavailableCaption, { top: insets.top + 64 }] : undefined}>
        Route outline only. Interactive maps and flyovers are currently unavailable.
      </AppText>
    </View>
  ) : (
    <RouteTimelapse
      key={immersive ? activity.id : `${activity.id}:${mode}:${fullScreen ? "full" : "inline"}`}
      coordinates={coordinates}
      routeReplay={routeReplay ?? undefined}
      units={units}
      mode={immersive ? initialMode : mode}
      hideControls={hideControls}
      hudInsets={immersive ? { top: insets.top + 64, bottom: 124 + insets.bottom } : undefined}
      onStateChange={onPlaybackState}
      controllerRef={controllerRef}
      onUnavailable={() => setUnavailable(true)}
      style={immersive ? [s.fullPlayer, { borderRadius: 0 }] : fullScreen ? s.fullPlayer : s.inlinePlayer}
    />
  );

  if (immersive) return <View style={StyleSheet.absoluteFill}>
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
            backgroundColor: "rgba(20, 20, 19, 0.72)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }, pressed && { opacity: 0.75 }]}
        >
          <AppIcon name="layers" size={22} color="#ffffff" />
        </Pressable>
        <AnchoredMenu open={layerMenuOpen} onClose={closeLayerMenu} onDismiss={finishPendingMode} menuLayout={layerMenuLayout} style={{ width: layerMenuLayout?.width ?? 200 }} accessibilityLabel="Close map layers">
          <SettingsToggleRow label="3D view" value={mode === "3d-flyover"} onChange={switchImmersiveMode} />
        </AnchoredMenu>
      </View>
    )}
  </View>;

  return (
    <View style={s.container}>
      {activity.id.startsWith("local-route-") && (
        <AppText role="caption">Local file preview · original activity date · Open only</AppText>
      )}
      {milestone && (
        <AppText role="caption">Full activity route · the record segment is not identified.</AppText>
      )}

      {/* Control bar: 2D vs 3D switcher & Fullscreen button */}
      <View style={s.controlBar}>
        <View style={s.segmentWrap}>
          <FocusSegments
            label="Replay mode"
            value={mode}
            options={[
              { value: "2d-overview", label: "2D View" },
              { value: "3d-flyover", label: "3D Flyover" },
            ]}
            onChange={(val) => setMode(val as "2d-overview" | "3d-flyover")}
          />
        </View>
        <IconButton
          icon="expand"
          label="Open full screen"
          onPress={() => setFullScreen(true)}
        />
      </View>

      {/* Directly playable route embedded in the activity sheet */}
      <View style={s.playerWrap}>
        {!fullScreen ? player : <View style={s.inlinePlayer} />}
      </View>

      <AppText role="caption">
        Replay follows recorded GPS points. Playback speed is illustrative. Sensor readings appear only when recorded samples are available. Speed may be calculated from the recorded GPS interval.
      </AppText>

      {/* Dedicated native full screen mode that returns cleanly without closing activity */}
      <Modal
        visible={fullScreen}
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setFullScreen(false)}
      >
        <SafeAreaView style={s.fullRoot}>
          <View style={s.fullHeader}>
            <IconButton icon="back" label="Exit full screen" onPress={() => setFullScreen(false)} />
            <AppText role="heading" style={{ flex: 1, textAlign: "center" }}>Your route</AppText>
            <View style={{ width: 130 }}>
              <FocusSegments
                label="Replay mode"
                value={mode}
                options={[
                  { value: "2d-overview", label: "2D" },
                  { value: "3d-flyover", label: "3D" },
                ]}
                onChange={(val) => setMode(val as "2d-overview" | "3d-flyover")}
              />
            </View>
          </View>
          <View style={s.fullContent}>
            {fullScreen ? player : null}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  container: { gap: 12 },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  segmentWrap: { width: 180 },
  playerWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: themeColors.textPrimary,
    borderWidth: 1,
    borderColor: c.line,
  },
  inlinePlayer: { height: 320, width: "100%" },
  fullRoot: { flex: 1, backgroundColor: c.paper },
  fullHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  fullContent: { flex: 1, backgroundColor: themeColors.textPrimary },
  fullPlayer: { flex: 1, width: "100%" },
  unavailableCaption: { position: "absolute", left: 16, right: 16, padding: 12, borderRadius: 12, backgroundColor: c.paper },
  unavailableBox: { padding: 12, gap: 10, alignItems: "center" },
};});
