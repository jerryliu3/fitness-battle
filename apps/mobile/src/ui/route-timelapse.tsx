import { createThemedStyles, useThemedStyles, legacyColors } from "../theme";
import { useSceneActive } from "./use-scene-active";
import { useRef, useEffect, type MutableRefObject } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { encodePolyline, type RouteReplaySample, type LngLat } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useLegacyColors } from "../theme";

export interface RoutePlaybackState {
  isPlaying: boolean;
  isFinished: boolean;
  progress: number;
  currentDistanceKm: number;
  totalDistanceKm: number;
  isRecordingVideo: boolean;
  recordingProgress?: number;
}

export interface RoutePlaybackController {
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (progress: number) => void;
  exportVideo: () => void;
  setMode: (mode: "3d-flyover" | "2d-overview") => void;
}

export interface RouteTimelapseProps {
  coordinates: LngLat[] | string;
  routeReplay?: RouteReplaySample[];
  mode?: "3d-flyover" | "2d-overview";
  units?: "us" | "metric";
  accentColor?: string;
  durationMs?: number;
  hideControls?: boolean;
  onFinish?: () => void;
  onUnavailable?: () => void;
  onStateChange?: (state: RoutePlaybackState) => void;
  controllerRef?: MutableRefObject<RoutePlaybackController | null>;
  style?: StyleProp<ViewStyle>;
  hudInsets?: { top: number; bottom: number };
}

export function RouteTimelapse({
  coordinates,
  routeReplay,
  mode = "3d-flyover",
  units = "metric",
  accentColor: suppliedaccentColor,
  durationMs = 12000,
  hideControls = false,
  onFinish,
  onUnavailable,
  onStateChange,
  controllerRef,
  style,
  hudInsets,
}: RouteTimelapseProps) {
  const colors = useLegacyColors();
  const accentColor = suppliedaccentColor ?? colors.lime;
const styles=useThemedStyles(stylesThemes);

  const active = useSceneActive();
  const sceneActive = useRef(active);
  sceneActive.current = active;
  const fail = useRef(onUnavailable);
  fail.current = onUnavailable;
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const pendingMessages = useRef<object[]>([]);

  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const insetQuery = hudInsets ? `&hudTop=${Math.round(hudInsets.top)}&hudBottom=${Math.round(hudInsets.bottom)}` : "";
  const controlsQuery = hideControls ? "&controls=none" : "";
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?mode=${mode}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}&units=${units}${insetQuery}${controlsQuery}`;
  const origin = new URL(uri).origin;

  function inject(message: object, queueIfNotReady = false) {
    if (!ready.current || !sceneActive.current) {
      if (queueIfNotReady) pendingMessages.current.push(message);
      return;
    }
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(
      message,
    )}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  useEffect(() => {
    ready.current = false;
    pendingMessages.current = [];
  }, [uri]);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      if (!ready.current) fail.current?.();
    }, 15000);
    return () => clearTimeout(timeout);
  }, [uri, active]);

  useEffect(() => {
    if (!controllerRef) return;
    controllerRef.current = {
      play: () => inject({ type: "play" }, true),
      pause: () => inject({ type: "pause" }, true),
      replay: () => inject({ type: "replay" }, true),
      seek: (progress: number) => inject({ type: "seek", progress }),
      exportVideo: () => inject({ type: "export-video" }),
      setMode: (nextMode) => inject({ type: "set-mode", mode: nextMode }, true),
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef]);

  useEffect(() => {
    if (ready.current) {
      inject({
        type: "set-route",
        hudInsets,
        hideControls,
        routeReplay,
        coordinates: polylineStr,
        mode,
        accentColor,
        durationMs,
      });
    }
  }, [polylineStr, routeReplay, mode, accentColor, durationMs, active, hideControls, hudInsets?.top, hudInsets?.bottom]);

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
              inject({ type: "set-route", hudInsets, hideControls, routeReplay, coordinates: polylineStr, mode, accentColor, durationMs });
              for (const next of pendingMessages.current.splice(0)) {
                inject(next);
              }
            } else if (msg.type === "route-state") {
              onStateChange?.(msg);
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

const stylesThemes = createThemedStyles(themeColors=>{const colors=legacyColors(themeColors);
return {
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
};});
