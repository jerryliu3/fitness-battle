import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, useColorScheme, type TextStyle, type ViewStyle, type ImageStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_COLORS, getAppColors, resolveColorMode, type AppColors, type AppearancePreference } from "@fitness-battle/shared";

const preferenceKey = "overtaek.appearance";
type AppearanceState = {
  preference: AppearancePreference;
  mode: "light" | "dark";
  colors: AppColors;
  setPreference: (value: AppearancePreference) => void;
};
const ThemeContext = createContext<AppearanceState>({
  preference: "system", mode: "light", colors: getAppColors("light"), setPreference() {},
});
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppearancePreference>("system");
  const system = useColorScheme();
  const mode = resolveColorMode(preference, system);
  const changed = useRef(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { let alive = true; void AsyncStorage.getItem(preferenceKey).then(value => {
    if (alive && !changed.current && (value === "light" || value === "dark")) setPreference(value);
  }).catch(() => {}).finally(() => { if (alive) setLoaded(true); }); return () => { alive = false; }; }, []);
  useEffect(() => { if (loaded) void AsyncStorage.setItem(preferenceKey, preference).catch(() => {}); }, [loaded, preference]);
  return createElement(ThemeContext.Provider, { value: { preference, mode, colors: getAppColors(mode), setPreference: value => { changed.current = true; setPreference(value); } } }, children);
}
export function useAppTheme() { return useContext(ThemeContext); }
export function useThemeColors() { return useAppTheme().colors; }
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
export function createThemedStyles<T extends NamedStyles<T>>(factory: (colors: AppColors) => T) {
  return { light: StyleSheet.create(factory(APP_COLORS.light)), dark: StyleSheet.create(factory(APP_COLORS.dark)) };
}
export function useThemedStyles<T>(styles: { light: T; dark: T }): T { return styles[useAppTheme().mode]; }
