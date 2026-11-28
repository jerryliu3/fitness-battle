import { describe, expect, it } from "vitest";
import {
  normalizeTelemetryScreen,
  resolveTelemetryEnvironment,
  sanitizeTelemetryProperties,
  shouldDropTelemetryErrorMessage,
} from "./telemetry";

describe("normalizeTelemetryScreen", () => {
  it("strips /app prefix, query strings, hashes, and trailing slashes", () => {
    expect(normalizeTelemetryScreen("/app/arena?tab=standings#top")).toEqual({
      screen: "/arena",
      tab: "arena",
    });
    expect(normalizeTelemetryScreen("/today/")).toEqual({
      screen: "/today",
      tab: "today",
    });
    expect(normalizeTelemetryScreen("/settings")).toEqual({
      screen: "/settings",
      tab: null,
    });
  });

  it("handles empty or null pathnames safely", () => {
    expect(normalizeTelemetryScreen(null)).toEqual({ screen: "/", tab: null });
    expect(normalizeTelemetryScreen("")).toEqual({ screen: "/", tab: null });
  });
});

describe("shouldDropTelemetryErrorMessage", () => {
  it("drops transient abort and network noise", () => {
    expect(shouldDropTelemetryErrorMessage("AbortError: The operation was aborted.")).toBe(true);
    expect(shouldDropTelemetryErrorMessage("TypeError: Network request failed")).toBe(true);
    expect(shouldDropTelemetryErrorMessage("ResizeObserver loop limit exceeded")).toBe(true);
  });

  it("keeps actionable application errors", () => {
    expect(shouldDropTelemetryErrorMessage("Cannot read properties of undefined (reading 'id')")).toBe(false);
    expect(shouldDropTelemetryErrorMessage("")).toBe(false);
  });
});

describe("resolveTelemetryEnvironment", () => {
  it("disables telemetry in development or demo-data mode", () => {
    expect(
      resolveTelemetryEnvironment({ isDev: true, useDemoData: false }),
    ).toEqual({ environment: "development", enabled: false });

    expect(
      resolveTelemetryEnvironment({
        isDev: false,
        explicitEnv: "production",
        useDemoData: true,
      }),
    ).toEqual({ environment: "production", enabled: false });
  });

  it("enables telemetry in preview and production when not in demo mode", () => {
    expect(
      resolveTelemetryEnvironment({
        isDev: false,
        explicitEnv: "preview",
        useDemoData: false,
      }),
    ).toEqual({ environment: "preview", enabled: true });

    expect(
      resolveTelemetryEnvironment({
        isDev: false,
        explicitEnv: "production",
        useDemoData: false,
      }),
    ).toEqual({ environment: "production", enabled: true });
  });
});

describe("sanitizeTelemetryProperties", () => {
  it("strips PII, secrets, and raw biometric/health fields", () => {
    expect(
      sanitizeTelemetryProperties({
        screen: "/today",
        provider: "strava",
        email: "user@example.com",
        access_token: "secret",
        heart_rate: 155,
        gps: "encoded",
        duration_ms: 1200,
      }),
    ).toEqual({
      screen: "/today",
      provider: "strava",
      duration_ms: 1200,
    });
  });
});
