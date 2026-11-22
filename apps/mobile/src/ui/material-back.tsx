import { Pressable, Text } from "react-native";
import { useThemeColors } from "../theme";
import { IconButton } from "./icon-button";
import { MapHudBackdrop, useMapHud } from "./map-hud";
import { textStyle } from "./section";
export function MaterialBack({ onPress, label = "Back to events" }: { onPress(): void; label?: string }) { return <IconButton glass icon="back" label={label} onPress={onPress} />; }
export function MaterialClose({ onPress, disabled = false, label = "Close" }: { onPress(): void; disabled?: boolean; label?: string }) {
  const c = useThemeColors();
  const hud = useMapHud();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: hud.chrome?.borderColor ?? "rgba(255, 255, 255, 0.18)",
        backgroundColor: hud.chrome?.backgroundColor ?? "rgba(28, 46, 56, 0.72)",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <MapHudBackdrop radius={22} />
      <Text style={{ ...textStyle("heading"), color: c.ink }}>✕</Text>
    </Pressable>
  );
}
