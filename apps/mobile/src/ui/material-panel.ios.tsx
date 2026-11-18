import { useAppTheme } from "../theme";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import { View, type ViewProps } from "react-native";
// Named views are absent in older binaries; requiring one does not throw synchronously.
const anchoredChoice = requireOptionalNativeModule<{ ViewPrototypes?: Record<string, unknown> }>("AnchoredChoice");
const NativePanel = anchoredChoice?.ViewPrototypes?.AnchoredChoice_MaterialPanel
  ? requireNativeView<ViewProps & { dark: boolean }>("AnchoredChoice", "MaterialPanel") : null;
export function MaterialPanel({ style, ...props }: ViewProps) {
  const { mode, colors } = useAppTheme();
  return NativePanel ? <NativePanel {...props} dark={mode === "dark"} style={style} /> : <View {...props} style={[{ backgroundColor: `${colors.card}66` }, style]} />;
}
