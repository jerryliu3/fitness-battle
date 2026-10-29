import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import * as ReactNative from "react-native";
import { StyleSheet, type TextStyle, type ViewStyle, type ImageStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_COLORS, getAppColors, homeHealthColors, resolveColorMode, type AppColors, type AppearancePreference, type ColorMode } from "@fitness-battle/shared";

const preferenceKey = "overtaek.appearance";
const ThemeContext = createContext<{ preference: AppearancePreference; setPreference: (value: AppearancePreference) => void }>({ preference: "system", setPreference() {} });
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppearancePreference>("system");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let alive = true; void AsyncStorage.getItem(preferenceKey).then(value => {
    if (alive && (value === "light" || value === "dark")) setPreference(value);
  }).catch(() => {}).finally(() => { if (alive) setLoaded(true); }); return () => { alive = false; }; }, []);
  useEffect(() => { if (loaded) void AsyncStorage.setItem(preferenceKey, preference).catch(() => {}); }, [loaded, preference]);
  return createElement(ThemeContext.Provider, { value: { preference, setPreference } }, children);
}
export function useAppTheme() {
  const context = useContext(ThemeContext);
  let system: ColorMode | null = null;
  try {
    if (Object.prototype.hasOwnProperty.call(ReactNative, "useColorScheme")) {
      const hook = (ReactNative as Record<string, unknown>).useColorScheme;
      if (typeof hook === "function") {
        system = (hook as () => ColorMode | null | undefined)() ?? null;
      }
    }
  } catch {
    system = null;
  }
  const mode = resolveColorMode(context.preference, system);
  return { mode, colors: getAppColors(mode), preference: context.preference, setPreference: context.setPreference };
}
export function useThemeColors() { return useAppTheme().colors; }
export function useHomeHealthColors() { return homeHealthColors(useThemeColors()); }
export function useMobileSurfaces() { return { divider: useThemeColors().divider }; }
function legacyColors(c: AppColors) {
  return { ink: c.ink, paper: c.paper, card: c.card, muted: c.muted, line: c.line,
    lime: c.actionPrimary, limeDeep: c.actionPressed, accent: c.accentSecondary,
    accentSoft: c.accentSecondarySoft, greenSoft: c.greenSoft, blue: c.accentSecondary, blueSoft: c.soft };
}
export function useLegacyColors() { return legacyColors(useThemeColors()); }
export const colors = legacyColors(APP_COLORS.light);
export const mobileSurfaces = { divider: APP_COLORS.light.divider };
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export function createThemedStyles<T extends NamedStyles<T>>(factory: (colors: AppColors) => T) {
  return { light: StyleSheet.create(factory(APP_COLORS.light)), dark: StyleSheet.create(factory(APP_COLORS.dark)) };
}
export function useThemedStyles<T>(styles: { light: T; dark: T }): T { return styles[useAppTheme().mode]; }
export const fonts = { body: "Manrope_400Regular", bodyMedium: "Manrope_500Medium", bodyBold: "Manrope_700Bold" };
export { SHELL_COLORS, SHELL_RADIUS, SHELL_TYPE, SHELL_TABS } from "@fitness-battle/shared";
export type { AppColors, AppearancePreference } from "@fitness-battle/shared";
