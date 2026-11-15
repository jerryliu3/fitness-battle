import { createThemedStyles, useThemedStyles } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";
import { AppText, textStyle } from "./section";
import { useEffect, useMemo, useState } from "react";
import { Modal, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { activityRoute, normalizeRouteReplay, type RouteReplaySample, type Activity } from "@fitness-battle/shared";
import { FocusSegments } from "./focus";
import { IconButton } from "./icon-button";
import { RouteStaticPreview } from "./route-static-preview";
import { RouteTimelapse } from "./route-timelapse";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";


export function ActivityRoute({
  activity,
  milestone = false,
  immersive = false,
  units = "metric",
}: {
  activity?: Activity;
  milestone?: boolean;
  immersive?: boolean;
  units?: "us" | "metric";
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
  const [fullScreen, setFullScreen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

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

  const player = unavailable ? (
    <View style={[s.unavailableBox, immersive && { flex: 1, padding: 0 }]}>
      <RouteStaticPreview coordinates={coordinates} width={immersive ? window.width : undefined} height={immersive ? window.height : 260} strokeColor="176c75" showPlayBadge={false} />
      <AppText role="caption" style={immersive ? [s.unavailableCaption, { top: insets.top + 64 }] : undefined}>
        Route outline only. Interactive maps and flyovers are currently unavailable.
      </AppText>
    </View>
  ) : (
    <RouteTimelapse
      key={`${activity.id}:${mode}:${fullScreen ? "full" : "inline"}`}
      coordinates={coordinates}
      routeReplay={routeReplay ?? undefined}
      units={units}
      mode={mode}
      hudInsets={immersive ? { top: insets.top + 64, bottom: window.height * .42 + 12 } : undefined}
      onUnavailable={() => setUnavailable(true)}
      style={immersive ? [s.fullPlayer, { borderRadius: 0 }] : fullScreen ? s.fullPlayer : s.inlinePlayer}
    />
  );

  if (immersive) return <View style={StyleSheet.absoluteFill}>
    {player}
    <View style={{ position: "absolute", top: insets.top + 8, right: 16, width: 160 }}>
      <FocusSegments label="Replay mode" value={mode} options={[{ value: "2d-overview", label: "2D" }, { value: "3d-flyover", label: "3D" }]} onChange={value => setMode(value as typeof mode)}/>
    </View>
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
            <Text style={[textStyle("heading"), { flex: 1, textAlign: "center" }]}>Your route</Text>
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
