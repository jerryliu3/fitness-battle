import { MedalGoldFill } from "./medal-gold-fill";
import { useThemeColors } from "../theme";
import { Pressable } from "react-native";
import { playCue } from "../lib/haptics";
import { AppIcon } from "./app-icon";
import { MapHudBackdrop, useMapHud } from "./map-hud";


export function IconButton({ icon, label, onPress, disabled = false, haptic = true, primary = false, glass = false }: {
  icon: "back" | "forward" | "plus" | "sync" | "expand" | "edit" | "play" | "pause" | "replay"; label: string; onPress: () => void; disabled?: boolean; haptic?: boolean; primary?: boolean; glass?: boolean;
}) {
const c=useThemeColors();
const hud=useMapHud();

  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled }} onPress={() => { if (disabled) return; if (haptic) void playCue("light"); onPress(); }}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1,
      borderColor: glass ? (hud.chrome?.borderColor ?? "rgba(255, 255, 255, 0.16)") : c.line,
      backgroundColor: primary ? undefined : glass ? (hud.chrome?.backgroundColor ?? "rgba(20, 20, 19, 0.72)") : c.card,
      alignItems: "center", justifyContent: "center",
      opacity: disabled ? 0.4 : pressed ? 0.65 : 1 })}>
    {primary && <MedalGoldFill radius={22} />}
    {glass && !primary && <MapHudBackdrop radius={22} />}
    <AppIcon name={icon} size={22} color={primary ? c.textOnAction : glass ? hud.ink : c.ink} />
  </Pressable>;
}
