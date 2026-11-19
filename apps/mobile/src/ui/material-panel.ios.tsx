import { useAppTheme } from "../theme";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View, type ViewProps } from "react-native";
// Named views are absent in older binaries; requiring one does not throw synchronously.
const anchoredChoice = requireOptionalNativeModule<{ ViewPrototypes?: Record<string, unknown> }>("AnchoredChoice");
const NativePanel = anchoredChoice?.ViewPrototypes?.AnchoredChoice_MaterialPanel
  ? requireNativeView<ViewProps & { dark: boolean }>("AnchoredChoice", "MaterialPanel") : null;
export function MaterialPanel({ style, fallbackColor, ...props }: ViewProps & { fallbackColor?: string }) {
  const { mode, colors } = useAppTheme();
  const [reduceTransparency, setReduceTransparency] = useState(true);
  useEffect(() => {
    if (!fallbackColor || !NativePanel) return;
    let current = true;
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", value => {
      current = false;
      setReduceTransparency(value);
    });
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
      if (current) setReduceTransparency(value);
    });
    return () => {
      current = false;
      subscription.remove();
    };
  }, [fallbackColor]);
  return NativePanel && (!fallbackColor || !reduceTransparency) ? <NativePanel {...props} dark={mode === "dark"} style={style} /> : <View {...props} style={[{ backgroundColor: fallbackColor ?? `${colors.card}66` }, style]} />;
}
