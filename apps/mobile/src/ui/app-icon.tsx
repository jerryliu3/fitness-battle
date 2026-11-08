import Svg, { Path } from "react-native-svg";
import { APP_ICON_PATHS, SPORT_ICON_PATHS } from "@fitness-battle/shared";
import { Platform } from "react-native";
import { useThemeColors } from "../theme";

const icons = { ...APP_ICON_PATHS, ...SPORT_ICON_PATHS };
export type AppIconName = keyof typeof icons;

/** The enclosing control owns the accessible label. */
export function AppIcon({ name, size = 24, color }: { name: AppIconName; size?: number; color?: string }) {
  const c = useThemeColors();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? c.ink} accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined}><Path d={icons[name]} /></Svg>;
}
