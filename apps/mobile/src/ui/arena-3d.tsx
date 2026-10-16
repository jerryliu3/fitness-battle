import { useRef, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import type { ArenaSceneMessage } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";

export interface Arena3DProps {
  model: ArenaSceneMessage;
  onSelect: (id: string) => void;
  onPan: (center: number) => void;
  onUnavailable: () => void;
}

const SYNC_MS = 80;

export function Arena3D({
  model,
  onSelect,
  onPan,
  onUnavailable,
}: Arena3DProps) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const fail = useRef(onUnavailable);
  fail.current = onUnavailable;
  const latest = useRef(model);
  latest.current = model;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function inject(next: ArenaSceneMessage) {
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(next)}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  function scheduleSync() {
    if (!ready.current) return;
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      inject(latest.current);
    }, SYNC_MS);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (!ready.current) fail.current();
    }, 12000);
    return () => {
      clearTimeout(t);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    scheduleSync();
  }, [model]);

  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/arena-scene`;
  const origin = new URL(uri).origin;

  return (
    <View style={styles.frame}>
      <WebView
        ref={ref}
        source={{ uri }}
        originWhitelist={[origin]}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
        onShouldStartLoadWithRequest={(r) =>
          r.url === "about:blank" || r.url.startsWith(`${origin}/arena-scene`)
        }
        onLoadEnd={() => {
          if (ready.current) inject(latest.current);
        }}
        onError={onUnavailable}
        onHttpError={onUnavailable}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "arena-ready") {
              ready.current = true;
              inject(latest.current);
            } else if (
              msg.type === "arena-selected" &&
              latest.current.lanes.some((l) => l.id === msg.id)
            )
              onSelect(msg.id);
            else if (msg.type === "arena-pan" && Number.isFinite(msg.center))
              onPan(Math.max(0, msg.center));
            else if (msg.type === "arena-unavailable") onUnavailable();
          } catch {
            /* ignore malformed bridge messages */
          }
        }}
      />
      <Text style={styles.caption}>
        3D uses the same distances and lanes as your 2D view.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 520,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#edf2e8",
  },
  web: { flex: 1, backgroundColor: "#edf2e8" },
  caption: { fontSize: 10, color: "#768172", padding: 9, textAlign: "center" },
});
