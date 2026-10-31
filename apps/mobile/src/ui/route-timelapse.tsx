import { useSceneActive } from "./use-scene-active";
import { useRef, useEffect } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
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
  const active = useSceneActive();
  const sceneActive = useRef(active);
  sceneActive.current = active;
  const fail = useRef(onUnavailable);
  fail.current = onUnavailable;
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);

  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?mode=${mode}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}&units=${units}`;
  const origin = new URL(uri).origin;

  function inject(message: object) {
    if (!ready.current || !sceneActive.current) return;
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      message,
    )}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  useEffect(() => {
    ready.current = false;
  }, [uri]);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      if (!ready.current) fail.current?.();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [uri, active]);

  useEffect(() => {
    if (ready.current) {
      inject({
        type: "set-route",
        routeReplay,
        coordinates: polylineStr,
        mode,
        accentColor,
        durationMs,
      });
    }
  }, [polylineStr, routeReplay, mode, accentColor, durationMs, active]);

  return (
    <View style={[styles.frame, style]}>
      <WebView
        ref={ref}
        source={{ uri }}
        originWhitelist={[origin]}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
        onShouldStartLoadWithRequest={(r: { url: string }) =>
          r.url === "about:blank" || r.url.startsWith(`${origin}/route-scene`)
        }
        onContentProcessDidTerminate={() => {
          ready.current = false;
          onUnavailable?.();
        }}
        onError={onUnavailable}
        onHttpError={onUnavailable}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "route-ready") {
              ready.current = true;
              inject({ type: "set-route", routeReplay, coordinates: polylineStr, mode, accentColor, durationMs });
            } else if (msg.type === "route-finish") {
              onFinish?.();
            } else if (msg.type === "route-unavailable") {
              onUnavailable?.();
            }
          } catch {
            // Ignore malformed bridge messages
          }
        }}
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
  web: {
    flex: 1,
    backgroundColor: colors.ink,
  },
});
