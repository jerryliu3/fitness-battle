import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";
import {
  resolveTelemetryEnvironment,
  shouldDropTelemetryErrorMessage,
} from "@fitness-battle/shared";
import { mobileEnv } from "./env";

const { environment, enabled } = resolveTelemetryEnvironment({
  isDev: typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development",
  explicitEnv: mobileEnv.appEnv,
  useDemoData: mobileEnv.useDemoData,
});

Sentry.init({
  dsn: mobileEnv.sentryDsn || undefined,
  enabled: enabled && Boolean(mobileEnv.sentryDsn),
  environment,
  tracesSampleRate: 0.1,
  enableAutoSessionTracking: true,
  dist: Updates.updateId ?? undefined,
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value ?? event.message;
    if (shouldDropTelemetryErrorMessage(message)) return null;
    return event;
  },
});

export { Sentry };
