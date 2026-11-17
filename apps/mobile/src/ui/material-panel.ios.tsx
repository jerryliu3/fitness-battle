import { useAppTheme } from "../theme";
import { requireNativeView } from "expo";
import { View, type ViewProps } from "react-native";
let NativePanel: React.ComponentType<ViewProps & { dark: boolean }> | null = null;
try { NativePanel = requireNativeView<ViewProps & { dark: boolean }>("AnchoredChoice", "MaterialPanel"); } catch { /* Older development clients use the readable fallback. */ }
export function MaterialPanel({ style, ...props }: ViewProps) {
  const { mode, colors } = useAppTheme();
  return NativePanel ? <NativePanel {...props} dark={mode === "dark"} style={style} /> : <View {...props} style={[{ backgroundColor: colors.card }, style]} />;
}
