import { useThemeColors } from "../theme";
import { View, type ViewProps } from "react-native";
import { SHELL_COLORS as c } from "../theme";

export function ChartFrame({
  ready = true,
  children,
  style,
}: {
  ready?: boolean;
  children: React.ReactNode;
  style?: ViewProps["style"];
}) {
  const c = useThemeColors();

  return (
    <View
      accessibilityElementsHidden={!ready}
      importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
      style={[{ position: "relative" }, style]}
    >
      {ready ? (
        children
      ) : (
        <View
          accessibilityLabel="Chart loading"
          style={{
            minHeight: 160,
            borderRadius: 16,
            backgroundColor: c.soft,
            borderWidth: 1,
            borderColor: c.line,
            opacity: 0.85,
          }}
        />
      )}
    </View>
  );
}
