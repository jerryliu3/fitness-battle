import { createThemedStyles, useThemedStyles } from "../../theme";
import { useSceneActive } from "../../ui/use-scene-active";
import type { VitalsLabCanvasMessage } from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { AppText } from "../../ui/section";
import {
  resolveVitalsLabHostSource,
  type VitalsLabHostSource,
} from "./vitals-lab-host-source";

const SYNC_MS = 80;

export function VitalsLabCanvas({
  model,
  host,
  onUnavailable,
}: {
  model: VitalsLabCanvasMessage;
  host: VitalsLabHostSource | null;
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
    if (!active || !host) return;
    const t = setTimeout(() => {
      if (!ready.current) {
        setFailed(true);
        fail.current?.();
      }
    }, host.mode === "bundled" ? 8_000 : 14_000);
    return () => clearTimeout(t);
  }, [active, host]);

  if (!host) {
    return <View style={styles.frame} />;
  }

  if (failed) {
    return (
      <View style={styles.fallback}>
        <AppText role="caption" secondary>
          3D body scan unavailable.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <WebView
        ref={ref}
        source={{ uri: host.uri }}
        originWhitelist={
          host.mode === "bundled"
            ? ["file://", "about:blank"]
            : [new URL(host.uri).origin]
        }
        allowingReadAccessToURL={host.readAccessUrl}
        javaScriptEnabled
        cacheEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.web}
        onShouldStartLoadWithRequest={(r) => host.allowsRequest(r.url)}
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

export function useVitalsLabHostSource() {
  const [host, setHost] = useState<VitalsLabHostSource | null>(null);
  useEffect(() => {
    let alive = true;
    resolveVitalsLabHostSource().then((next) => {
      if (alive) setHost(next);
    });
    return () => {
      alive = false;
    };
  }, []);
  return host;
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
