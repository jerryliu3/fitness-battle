import { PostHogProvider, usePostHog } from "posthog-react-native";
import { usePathname } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import {
  normalizeTelemetryScreen,
  resolveTelemetryEnvironment,
  sanitizeTelemetryProperties,
  type TelemetryEventMap,
  type TelemetryEventName,
} from "@fitness-battle/shared";
import { useAuth } from "./auth";
import { mobileEnv } from "./env";
import { Sentry } from "./sentry";

export function isMobilePostHogEnabled(): boolean {
  const { enabled } = resolveTelemetryEnvironment({
    isDev: typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development",
    explicitEnv: mobileEnv.appEnv,
    useDemoData: mobileEnv.useDemoData,
  });
  return enabled && Boolean(mobileEnv.posthogKey);
}

export function MobilePostHogProvider({ children }: { children: ReactNode }) {
  if (!isMobilePostHogEnabled()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={mobileEnv.posthogKey}
      options={{
        host: mobileEnv.posthogHost,
        captureAppLifecycleEvents: true,
        enableSessionReplay: Platform.OS !== "web",
        sessionReplayConfig: {
          maskAllTextInputs: true,
          maskAllImages: false,
        },
      }}
      autocapture={{
        captureTouches: true,
        captureScreens: false,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

export function MobileScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const { user } = useAuth();
  const previousRef = useRef<{ screen: string; enteredAt: number } | null>(null);

  useEffect(() => {
    if (!posthog || !isMobilePostHogEnabled()) return;
    if (!user?.id) {
      posthog.reset();
      Sentry.setUser(null);
      return;
    }
    posthog.identify(user.id);
    Sentry.setUser({ id: user.id });
    const distinctId = posthog.getDistinctId();
    if (distinctId) {
      Sentry.setTag("posthog_distinct_id", distinctId);
    }
  }, [posthog, user?.id]);

  useEffect(() => {
    if (!posthog || !isMobilePostHogEnabled() || !pathname) return;
    const { screen, tab } = normalizeTelemetryScreen(pathname);
    const now = Date.now();
    const prev = previousRef.current;

    posthog.screen(screen, tab ? { tab } : undefined);
    posthog.capture(
      "screen_viewed",
      sanitizeTelemetryProperties({
        screen,
        tab,
        previous_screen: prev?.screen ?? null,
        duration_ms: prev ? Math.max(0, now - prev.enteredAt) : undefined,
      }) as Parameters<typeof posthog.capture>[1],
    );

    previousRef.current = { screen, enteredAt: now };
  }, [posthog, pathname]);

  return null;
}

export function useTrackMobileEvent() {
  const posthog = usePostHog();
  return <K extends TelemetryEventName>(
    name: K,
    properties: TelemetryEventMap[K],
  ) => {
    if (!posthog || !isMobilePostHogEnabled()) return;
    posthog.capture(
      name,
      sanitizeTelemetryProperties(properties) as Parameters<
        typeof posthog.capture
      >[1],
    );
  };
}
