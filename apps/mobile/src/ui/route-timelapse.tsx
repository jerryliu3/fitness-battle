import { createThemedStyles, useThemedStyles, useLegacyColors } from "../theme";
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
  const colors = useLegacyColors();
  const styles = useThemedStyles(stylesThemes);

  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);

  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?mode=${mode}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}&units=${units}`;
  const origin = new URL(uri).origin;

  function inject(message: object) {
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      message,
    )}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  useEffect(() => {
    ready.current = false;
    const timeout = setTimeout(() => {
      if (!ready.current) onUnavailable?.();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [uri]);

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
  }, [polylineStr, routeReplay, mode, accentColor, durationMs]);

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

const stylesThemes = createThemedStyles((themeColors) => ({
  frame: {
    width: "100%",
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: themeColors.ink,
  },
  web: {
    flex: 1,
    backgroundColor: themeColors.ink,
  },
}));
