import { useAppTheme } from "../theme";
import { View, type ViewProps } from "react-native";
export function MaterialPanel({ style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  return <View {...props} style={[{ backgroundColor: colors.card }, style]} />;
}
