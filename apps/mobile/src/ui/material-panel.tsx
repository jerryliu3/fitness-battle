import { useAppTheme } from "../theme";
import { View, type ViewProps } from "react-native";
export function MaterialPanel({ style, fallbackColor, ...props }: ViewProps & { fallbackColor?: string }) {
  const { colors } = useAppTheme();
  return <View {...props} style={[{ backgroundColor: fallbackColor ?? `${colors.card}66` }, style]} />;
}
