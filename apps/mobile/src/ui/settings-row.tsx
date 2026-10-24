import Svg, { Path } from "react-native-svg";
import { SETTINGS_ICON_PATHS, SHELL_COLORS } from "@fitness-battle/shared";
import { Pressable, Text, View } from "react-native";
import { f } from "./focus";

export function SettingsRow({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        f.card,
        f.row,
        { padding: 18, minHeight: 64, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {title in SETTINGS_ICON_PATHS && <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={SHELL_COLORS.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden><Path d={SETTINGS_ICON_PATHS[title as keyof typeof SETTINGS_ICON_PATHS]} /></Svg>}
      <View style={f.grow}>
        <Text style={f.rowTitle}>{title}</Text>
        <Text style={f.small}>{detail}</Text>
      </View>
      <Text style={f.copy} accessibilityElementsHidden>
        →
      </Text>
    </Pressable>
  );
}
