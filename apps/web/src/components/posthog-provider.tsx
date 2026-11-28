"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeTelemetryScreen } from "@fitness-battle/shared";
import { useAuth } from "./auth-context";
import {
  identifyWebUser,
  initWebPostHog,
  isWebPostHogEnabled,
  posthog,
  trackWebEvent,
} from "../lib/analytics";

function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRef = useRef<{ screen: string; enteredAt: number } | null>(null);

  useEffect(() => {
    if (!isWebPostHogEnabled() || !pathname) return;

    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    posthog.capture("$pageview", { $current_url: url });

    const { screen, tab } = normalizeTelemetryScreen(pathname);
    const now = Date.now();
    const prev = previousRef.current;

    trackWebEvent("screen_viewed", {
      screen,
      tab,
      previous_screen: prev?.screen ?? null,
      duration_ms: prev ? Math.max(0, now - prev.enteredAt) : undefined,
    });

    previousRef.current = { screen, enteredAt: now };
  }, [pathname, searchParams]);

  return null;
}

export function PostHogTelemetryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  useEffect(() => {
    initWebPostHog();
  }, []);

  useEffect(() => {
    identifyWebUser(user?.id ?? null);
  }, [user?.id]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </>
  );
}
