import { AppIcon, type AppIconName } from "./app-icon";
import { Pressable, Text, View } from "react-native";
import { f } from "./focus";

const settingsIcons: Record<string, AppIconName> = {
  "Data Sync": "sync", Preferences: "preferences", Notifications: "notifications",
  "How scoring works": "scoring", Account: "person",
};

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
        f.section,
        f.row,
        { paddingVertical: 14, minHeight: 72, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {settingsIcons[title] && <AppIcon name={settingsIcons[title]} />}
      <View style={f.grow}>
        <Text style={f.rowTitle}>{title}</Text>
        <Text style={f.small}>{detail}</Text>
      </View>
      <AppIcon name="chevron" size={18} />
    </Pressable>
  );
}
