import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { useAppTheme } from "../appearance";

/** Native stack transitions and transparent bars also need the app palette. */
export function NavigationAppearance({ children }: { children: ReactNode }) {
  const { mode, colors: c } = useAppTheme();
  const theme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors,
      background: c.paper, card: c.card, text: c.ink,
      border: c.line, primary: c.ink, notification: c.statusError,
    } };
  }, [mode, c]);
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}
