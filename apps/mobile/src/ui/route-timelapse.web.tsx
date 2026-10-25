import { useEffect, useRef } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { encodePolyline, type RouteReplaySample, type LngLat } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { colors } from "../theme";

export interface RouteTimelapseProps {
  coordinates: LngLat[] | string;
  routeReplay?: RouteReplaySample[];
  mode?: "3d-flyover" | "2d-overview";
  units?: "us" | "metric";
  accentColor?: string;
  durationMs?: number;
  onFinish?: () => void;
  onUnavailable?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function RouteTimelapse({
  coordinates,
  routeReplay,
  mode = "3d-flyover",
  units = "metric",
  accentColor = colors.lime,
  durationMs = 12000,
  onFinish,
  onUnavailable,
  style,
}: RouteTimelapseProps) {
  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const ref = useRef<HTMLIFrameElement>(null);
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?mode=${mode}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}&units=${units}`;
  const origin = new URL(uri).origin;
  const send = () => ref.current?.contentWindow?.postMessage({ type: "set-route", routeReplay, coordinates: polylineStr, mode, accentColor, durationMs }, origin);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== ref.current?.contentWindow) return;
      if (event.data?.type === "route-ready") send();
      if (event.data?.type === "route-finish") onFinish?.();
      if (event.data?.type === "route-unavailable") onUnavailable?.();
    }
    window.addEventListener("message", receive);
    send();
    return () => window.removeEventListener("message", receive);
  }, [polylineStr, routeReplay, mode, accentColor, durationMs, origin, onFinish, onUnavailable]);

  return (
    <View style={[styles.frame, style]}>
      <iframe
        ref={ref}
        src={uri}
        onLoad={send}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="3D Route Replay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
});
