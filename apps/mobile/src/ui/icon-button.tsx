import { SETTINGS_ICON_PATHS } from "@fitness-battle/shared";
import { Platform, Pressable } from "react-native";
import { playCue } from "../lib/haptics";
import Svg, { Path } from "react-native-svg";
import { SHELL_COLORS as c } from "../theme";

const paths = {
  back: "m14 6-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  sync: SETTINGS_ICON_PATHS["Data Sync"],
  expand: "M8 3H3v5m13-5h5v5m0 8v5h-5M8 21H3v-5",
  edit: "m15 5 4 4M4 20l4-1L20 7l-4-4L4 15v5Z",
} as const;
export function IconButton({ icon, label, onPress, disabled = false }: {
  icon: keyof typeof paths; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled }} onPress={() => { if (disabled) return; void playCue("light"); onPress(); }}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1,
      borderColor: c.line, backgroundColor: "#ffffffdc", alignItems: "center", justifyContent: "center",
      opacity: disabled ? 0.4 : pressed ? 0.65 : 1 })}>
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" accessible={Platform.OS === "web" ? undefined : false}>
      <Path d={paths[icon]} />
    </Svg>
  </Pressable>;
}
