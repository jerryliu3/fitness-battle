import { Pressable } from "react-native";
import { playCue } from "../lib/haptics";
import { AppIcon } from "./app-icon";
import { SHELL_COLORS as c } from "../theme";

export function IconButton({ icon, label, onPress, disabled = false }: {
  icon: "back" | "plus" | "sync" | "expand" | "edit"; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled }} onPress={() => { if (disabled) return; void playCue("light"); onPress(); }}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1,
      borderColor: c.line, backgroundColor: "#ffffffdc", alignItems: "center", justifyContent: "center",
      opacity: disabled ? 0.4 : pressed ? 0.65 : 1 })}>
    <AppIcon name={icon} size={22} />
  </Pressable>;
}
