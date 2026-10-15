"use client";

import { ThemeProvider } from "@/theme/theme-provider";
import type { ReactNode } from "react";
import { AuthProvider } from "./auth-context";

export function Providers({
  initialTheme,
  children,
}: {
  initialTheme: string | null;
  children: ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
