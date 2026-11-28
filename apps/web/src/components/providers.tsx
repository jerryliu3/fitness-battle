"use client";
import { AppearanceProvider } from "@/theme/appearance-provider";

import { ThemeProvider } from "@/theme/theme-provider";
import type { ReactNode } from "react";
import { AuthProvider } from "./auth-context";
import { PostHogTelemetryProvider } from "./posthog-provider";

export function Providers({
  initialTheme,
  initialAppearance,
  children,
}: {
  initialTheme: string | null;
  initialAppearance?: string | null;
  children: ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AppearanceProvider initialAppearance={initialAppearance}>
        <AuthProvider>
          <PostHogTelemetryProvider>{children}</PostHogTelemetryProvider>
        </AuthProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
}
