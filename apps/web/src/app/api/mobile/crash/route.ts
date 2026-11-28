import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

interface MobileCrashPayload {
  message?: unknown;
  stack?: unknown;
  route?: unknown;
  appVersion?: unknown;
  updateId?: unknown;
  isEmbeddedLaunch?: unknown;
  timestamp?: unknown;
  updateLogs?: unknown;
}

function asString(value: unknown, max = 4000): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, max);
}

export async function POST(request: Request) {
  let body: MobileCrashPayload;
  try {
    body = (await request.json()) as MobileCrashPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = asString(body.message, 500) ?? "Unknown mobile fatal error";
  const stack = asString(body.stack, 4000);
  const route = asString(body.route, 200);
  const appVersion = asString(body.appVersion, 64);
  const updateId = asString(body.updateId, 128);
  const isEmbeddedLaunch =
    typeof body.isEmbeddedLaunch === "boolean" ? body.isEmbeddedLaunch : undefined;
  const timestamp = asString(body.timestamp, 64);

  const err = new Error(`[Mobile OTA Crash] ${message}`);
  if (stack) err.stack = stack;

  Sentry.withScope((scope) => {
    scope.setTag("source", "mobile_ota_crash");
    if (route) scope.setTag("route", route);
    if (appVersion) scope.setTag("app_version", appVersion);
    if (updateId) scope.setTag("ota_update_id", updateId);
    if (isEmbeddedLaunch !== undefined) {
      scope.setTag("is_embedded_launch", String(isEmbeddedLaunch));
    }
    scope.setContext("mobile_ota_crash", {
      timestamp,
      updateLogs: Array.isArray(body.updateLogs)
        ? body.updateLogs.slice(0, 20)
        : undefined,
    });
    Sentry.captureException(err);
  });

  console.error("[api/mobile/crash]", {
    message,
    route,
    appVersion,
    updateId,
    isEmbeddedLaunch,
    timestamp,
  });

  return NextResponse.json({ ok: true });
}
