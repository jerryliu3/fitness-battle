import * as Sentry from "@sentry/nextjs";
import {
  resolveTelemetryEnvironment,
  shouldDropTelemetryErrorMessage,
} from "@fitness-battle/shared";
import { webEnv } from "./lib/env";

const { environment, enabled } = resolveTelemetryEnvironment({
  isDev: process.env.NODE_ENV === "development",
  explicitEnv: webEnv.vercelEnv || process.env.NODE_ENV,
  useDemoData: webEnv.useDemoData,
});

Sentry.init({
  dsn: webEnv.sentryDsn || undefined,
  enabled: enabled && Boolean(webEnv.sentryDsn),
  environment,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? event.message;
    if (shouldDropTelemetryErrorMessage(message)) return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
