import { vitalsLabCanvasPrefetchMessage } from "@fitness-battle/shared";
import { useAppTheme } from "../../theme";
import { useMemo, useRef } from "react";
import { Platform, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { resolveVitalsLabHostSource, type VitalsLabHostSource } from "./vitals-lab-host-source";
import { useEffect, useState } from "react";

/**
 * Hidden WebView on the Progress tab: warms bundled or remote canvas before Health Lab opens.
 */
export function VitalsLabCanvasPrefetch() {
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const warmed = useRef(false);
  const { mode } = useAppTheme();
  const appearance = mode === "dark" ? "dark" : "light";
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

  if (Platform.OS === "web" || !host) return null;

  function injectPrefetch() {
    if (warmed.current || !ready.current) return;
    warmed.current = true;
    const payload = vitalsLabCanvasPrefetchMessage(host!.assetBaseUrl, appearance);
    const script = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(payload)}}));true;`;
    ref.current?.injectJavaScript(script);
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
    >
      <WebView
        ref={ref}
        source={{ uri: host.uri }}
        originWhitelist={
          host.mode === "bundled" ? ["file://", "about:blank"] : [new URL(host.uri).origin]
        }
        allowingReadAccessToURL={host.readAccessUrl}
        javaScriptEnabled
        cacheEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={{ width: 1, height: 1 }}
        onShouldStartLoadWithRequest={(r) => host.allowsRequest(r.url)}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "vitals-lab-canvas-ready") {
              ready.current = true;
              injectPrefetch();
            }
          } catch {
            /* ignore */
          }
        }}
        onLoadEnd={() => {
          if (ready.current) injectPrefetch();
        }}
      />
    </View>
  );
}
