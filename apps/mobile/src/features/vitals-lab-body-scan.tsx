import { useMemo } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import { mobileEnv } from "../lib/env";
import { createThemedStyles, useAppTheme, useThemedStyles } from "../theme";

const EMBED_HEIGHT = 720;

/**
 * Temporary full-page UX embed (stacks before hybrid Vitals Lab).
 * `/ux/*` is design-gated; follow-up PR replaces this with native shell + `/vitals-lab-canvas`.
 */
export function VitalsLabBodyScan() {
  const { mode } = useAppTheme();
  const styles = useThemedStyles(styleThemes);

  const uri = useMemo(() => {
    const base = mobileEnv.apiUrl.replace(/\/$/, "");
    const appearance = mode === "dark" ? "dark" : "light";
    return `${base}/ux/vitals-lab-embed?appearance=${appearance}`;
  }, [mode]);

  const origin = useMemo(() => new URL(uri).origin, [uri]);

  return (
    <View style={styles.frame} accessibilityLabel="Vitals Lab three-dimensional body scan">
      <WebView
        source={{ uri }}
        originWhitelist={[origin]}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        style={styles.web}
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
}));
