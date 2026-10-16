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
  useEffect(() => {
    const t = setTimeout(() => {
      if (!ready.current) fail.current();
    }, 12000);
    return () => clearTimeout(t);
  }, []);
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/arena-scene`;
  const origin = new URL(uri).origin;
  const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(model)}}));true;`;
  useEffect(() => {
    ref.current?.injectJavaScript(script);
  }, [script]);
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
        onLoadEnd={() => ref.current?.injectJavaScript(script)}
        onError={onUnavailable}
        onHttpError={onUnavailable}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "arena-ready") {
              ready.current = true;
              ref.current?.injectJavaScript(script);
            } else if (
              msg.type === "arena-selected" &&
              model.lanes.some((l) => l.id === msg.id)
            )
              onSelect(msg.id);
            else if (msg.type === "arena-pan" && Number.isFinite(msg.center))
              onPan(Math.max(0, msg.center));
            else if (msg.type === "arena-unavailable") onUnavailable();
          } catch {}
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
