import { Text, View } from "react-native";
import { IconButton } from "./icon-button";
import { f } from "./focus";
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={[f.row, { paddingHorizontal: 22, paddingVertical: 8 }]}>
    <IconButton icon="back" label="Return to previous screen" onPress={onBack} />
    <Text accessibilityRole="header" style={[f.h2, { flex: 1, textAlign: "center" }]}>{title}</Text><View style={{ width: 44 }} />
  </View>;
}
