"use client";

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import {
  resolveTelemetryEnvironment,
  sanitizeTelemetryProperties,
  type TelemetryEventMap,
  type TelemetryEventName,
} from "@fitness-battle/shared";
import { webEnv } from "./env";

let initialized = false;

export function isWebPostHogEnabled(): boolean {
  const { enabled } = resolveTelemetryEnvironment({
    isDev: process.env.NODE_ENV === "development",
    explicitEnv: webEnv.vercelEnv || process.env.NODE_ENV,
    useDemoData: webEnv.useDemoData,
  });
  return enabled && Boolean(webEnv.posthogKey);
}

export function initWebPostHog(): void {
  if (initialized || typeof window === "undefined" || !isWebPostHogEnabled()) {
    return;
  }
  initialized = true;
  posthog.init(webEnv.posthogKey, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
    },
    loaded(ph) {
      const distinctId = ph.get_distinct_id();
      if (distinctId) {
        Sentry.setTag("posthog_distinct_id", distinctId);
      }
      const replayUrl = ph.get_session_replay_url?.();
      if (replayUrl) {
        Sentry.setContext("posthog", { session_replay_url: replayUrl });
      }
    },
  });
}

export function trackWebEvent<K extends TelemetryEventName>(
  name: K,
  properties: TelemetryEventMap[K],
): void {
  if (!isWebPostHogEnabled()) return;
  posthog.capture(name, sanitizeTelemetryProperties(properties));
}

export function identifyWebUser(userId: string | null | undefined): void {
  if (!isWebPostHogEnabled()) return;
  if (!userId) {
    posthog.reset();
    Sentry.setUser(null);
    return;
  }
  posthog.identify(userId);
  Sentry.setUser({ id: userId });
  Sentry.setTag("posthog_distinct_id", posthog.get_distinct_id());
}

export { posthog };
