import { createThemedStyles, useThemedStyles } from "../../theme";
import { useSceneActive } from "../../ui/use-scene-active";
import type { VitalsLabCanvasMessage } from "@fitness-battle/shared";
import { mobileEnv } from "../../lib/env";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { AppText } from "../../ui/section";

const SYNC_MS = 80;

export function VitalsLabCanvas({
  model,
  onUnavailable,
}: {
  model: VitalsLabCanvasMessage;
  onUnavailable?: () => void;
}) {
  const styles = useThemedStyles(styleThemes);
  const active = useSceneActive();
  const sceneActive = useRef(active);
  sceneActive.current = active;
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(model);
  latest.current = model;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fail = useRef(onUnavailable);
  fail.current = onUnavailable;

  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/vitals-lab-canvas`;
  const origin = new URL(uri).origin;

  function inject(next: VitalsLabCanvasMessage) {
    if (!ready.current || !sceneActive.current) return;
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(next)}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  function scheduleSync() {
    if (!ready.current || !sceneActive.current) return;
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      inject(latest.current);
    }, SYNC_MS);
  }

  useEffect(() => {
    scheduleSync();
  }, [model, active]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      if (!ready.current) {
        setFailed(true);
        fail.current?.();
      }
    }, 14_000);
    return () => clearTimeout(t);
  }, [active]);

  if (failed) {
    return (
      <View style={styles.fallback}>
        <AppText role="caption" secondary>
          3D body scan unavailable. Check that the web server is running.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <WebView
        ref={ref}
        source={{ uri }}
        originWhitelist={[origin]}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.web}
        onShouldStartLoadWithRequest={(r: { url: string }) =>
          r.url === "about:blank" || r.url.startsWith(`${origin}/vitals-lab-canvas`)
        }
        onLoadEnd={() => {
          if (ready.current) inject(latest.current);
        }}
        onContentProcessDidTerminate={() => {
          ready.current = false;
          setFailed(true);
          onUnavailable?.();
        }}
        onError={() => {
          setFailed(true);
          onUnavailable?.();
        }}
        onHttpError={() => {
          setFailed(true);
          onUnavailable?.();
        }}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "vitals-lab-canvas-ready") {
              ready.current = true;
              inject(latest.current);
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

const styleThemes = createThemedStyles((theme) => ({
  frame: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.soft,
  },
  web: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
}));
