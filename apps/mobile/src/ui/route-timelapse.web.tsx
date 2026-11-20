import { createThemedStyles, useThemedStyles, legacyColors } from "../theme";
import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { encodePolyline } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useAppTheme, useLegacyColors } from "../theme";
import type { RouteTimelapseProps } from "./route-timelapse";

export function RouteTimelapse({
  coordinates,
  routeReplay,
  running = false,
  mode = "3d-flyover",
  units = "metric",
  accentColor: suppliedaccentColor,
  durationMs = 12000,
  hideControls = false,
  hudInsets,
  controllerRef,
  onStateChange,
  onFinish,
  onUnavailable,
  style,
}: RouteTimelapseProps) {
  const colors = useLegacyColors();
  const accentColor = suppliedaccentColor ?? colors.lime;
  const styles = useThemedStyles(stylesThemes);

  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const ref = useRef<HTMLIFrameElement>(null);
  const { mode: appearance } = useAppTheme();
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?mode=${mode}&appearance=${appearance}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}&units=${units}${running ? "&running=1" : ""}`;
  const origin = new URL(uri).origin;
  const post = useCallback((message: object) => ref.current?.contentWindow?.postMessage(message, origin), [origin]);
  const top = hudInsets?.top;
  const bottom = hudInsets?.bottom;
  const sendRoute = useCallback(() => post({
    type: "set-route", routeReplay, coordinates: polylineStr, accentColor, durationMs, hideControls,
    hudInsets: top != null && bottom != null ? { top, bottom } : undefined,
  }), [post, routeReplay, polylineStr, accentColor, durationMs, hideControls, top, bottom]);
  const callbacks = useRef({ onFinish, onUnavailable, onStateChange });
  callbacks.current = { onFinish, onUnavailable, onStateChange };

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== ref.current?.contentWindow) return;
      if (event.data?.type === "route-ready") sendRoute();
      if (event.data?.type === "route-state") callbacks.current.onStateChange?.(event.data);
      if (event.data?.type === "route-finish") callbacks.current.onFinish?.();
      if (event.data?.type === "route-unavailable") callbacks.current.onUnavailable?.();
    }
    window.addEventListener("message", receive);
    sendRoute();
    return () => window.removeEventListener("message", receive);
  }, [origin, sendRoute, uri]);

  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      play: () => post({ type: "play" }),
      pause: () => post({ type: "pause" }),
      replay: () => post({ type: "replay" }),
      seek: progress => post({ type: "seek", progress }),
      exportVideo: () => post({ type: "export-video" }),
      setMode: mode => post({ type: "set-mode", mode }),
    };
    return () => { controllerRef.current = null; };
  }, [controllerRef, post]);

  return (
    <View style={[styles.frame, style]}>
      <iframe
        ref={ref}
        src={uri}
        onLoad={sendRoute}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="3D Route Replay"
      />
    </View>
  );
}

const stylesThemes = createThemedStyles(themeColors=>{const colors=legacyColors(themeColors);
return {
  frame: {
    width: "100%",
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
};});
