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
