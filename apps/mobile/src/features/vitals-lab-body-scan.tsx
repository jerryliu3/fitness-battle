import { createThemedStyles, useAppTheme, useThemedStyles } from "../theme";
import { useSceneActive } from "../ui/use-scene-active";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import { mobileEnv } from "../lib/env";
import { AppText } from "../ui/section";

const EMBED_HEIGHT = 720;

export function VitalsLabBodyScan({ signedOut = false }: { signedOut?: boolean }) {
  const { mode } = useAppTheme();
  const styles = useThemedStyles(styleThemes);
  const active = useSceneActive();
  const ready = useRef(false);
  const webRef = useRef<WebView<object>>(null);

  const uri = useMemo(() => {
    const base = mobileEnv.apiUrl.replace(/\/$/, "");
    const appearance = mode === "dark" ? "dark" : "light";
    return `${base}/vitals-lab-embed?appearance=${appearance}`;
  }, [mode]);

  const origin = useMemo(() => new URL(uri).origin, [uri]);

  useEffect(() => {
    if (!active || !ready.current) return;
    webRef.current?.reload();
  }, [mode, active]);

  if (signedOut) {
    return (
      <View style={styles.placeholder}>
        <AppText role="body" secondary>
          Sign in and connect a health tracker to unlock the interactive Vitals Lab body scan.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.frame} accessibilityLabel="Vitals Lab three-dimensional body scan">
      <WebView
        ref={webRef}
        source={{ uri }}
        originWhitelist={[origin]}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.web}
        onMessage={(event: WebViewMessageEvent) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "vitals-lab-ready") ready.current = true;
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

const styleThemes = createThemedStyles(() => ({
  frame: {
    height: EMBED_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
  },
  web: {
    flex: 1,
    backgroundColor: "transparent",
  },
  placeholder: {
    padding: 16,
    borderRadius: 20,
    minHeight: 120,
    justifyContent: "center",
  },
}));
