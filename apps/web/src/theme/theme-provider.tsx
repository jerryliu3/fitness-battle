"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getTheme,
  parseThemeId,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_OPTIONS,
  type AppTheme,
  type ThemeId,
} from "./catalog";

const ThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (id: ThemeId) => void;
}>({
  theme: getTheme(),
  setTheme: () => {},
});

function writeThemeCookie(id: ThemeId) {
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const option of THEME_OPTIONS) {
    root.classList.remove(option.htmlClass);
  }
  root.classList.add(theme.htmlClass);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.backgroundColor);
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: string | null;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState(() => getTheme(parseThemeId(initialTheme)));
  const api = useMemo(
    () => ({
      theme,
      setTheme: (id: ThemeId) => {
        const next = getTheme(id);
        setThemeState(next);
        applyTheme(next);
        writeThemeCookie(id);
      },
    }),
    [theme],
  );
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
