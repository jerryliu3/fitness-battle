import { useFocusStyles } from "./focus";
import { playCue } from "../lib/haptics";
import { AppText } from "./section";
import { AppIcon, type AppIconName } from "./app-icon";
import { Pressable, View } from "react-native";


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
const f=useFocusStyles();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { void playCue("selection"); onPress(); }}
      style={({ pressed }) => [
        f.section,
        f.row,
        { paddingVertical: 14, minHeight: 72, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {settingsIcons[title] && <AppIcon name={settingsIcons[title]} />}
      <View style={f.grow}>
        <AppText role="row">{title}</AppText>
        <AppText role="support" secondary>{detail}</AppText>
      </View>
      <AppIcon name="chevron" size={18} />
    </Pressable>
  );
}
