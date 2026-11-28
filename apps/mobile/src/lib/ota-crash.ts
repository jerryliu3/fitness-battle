import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { mobileEnv } from "./env";

const CRASH_STORAGE_KEY = "overtaek:last_fatal_error";

interface StoredCrashReport {
  message: string;
  stack?: string;
  route?: string;
  appVersion?: string;
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
  timestamp: string;
}

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

let installed = false;
let currentRoute = "/";

export function setOtaCrashRoute(route: string): void {
  currentRoute = route || "/";
}

function buildCrashReport(error: unknown): StoredCrashReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message: err.message || "Unknown fatal error",
    stack: err.stack?.slice(0, 4000),
    route: currentRoute,
    appVersion: Constants.expoConfig?.version,
    updateId: Updates.updateId ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    timestamp: new Date().toISOString(),
  };
}

export function persistOtaCrash(error: unknown): void {
  if (Platform.OS === "web") return;
  try {
    const report = buildCrashReport(error);
    void AsyncStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(report));
  } catch {
    // Best-effort persistence; never throw inside a fatal error handler.
  }
}

export function installOtaCrashHandler(): void {
  if (installed || Platform.OS === "web") return;
  installed = true;

  const errorUtils = (
    globalThis as unknown as {
      ErrorUtils?: {
        getGlobalHandler?: () => GlobalErrorHandler | undefined;
        setGlobalHandler?: (handler: GlobalErrorHandler) => void;
      };
    }
  ).ErrorUtils;

  if (!errorUtils?.setGlobalHandler) return;

  const previousHandler = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    if (isFatal !== false) {
      persistOtaCrash(error);
    }
    previousHandler?.(error, isFatal);
  });
}

export async function flushOtaCrashReport(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const raw = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
    if (!raw) return;

    const report = JSON.parse(raw) as StoredCrashReport;
    let updateLogs: unknown[] | undefined;
    try {
      const logs = await Updates.readLogEntriesAsync(60 * 60 * 1000);
      if (logs.length > 0) updateLogs = logs.slice(-20);
    } catch {
      // Ignore if Updates.readLogEntriesAsync is unavailable in dev/simulator.
    }

    const res = await fetch(`${mobileEnv.apiUrl}/api/mobile/crash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...report, updateLogs }),
    });

    if (res.ok) {
      await AsyncStorage.removeItem(CRASH_STORAGE_KEY);
    }
  } catch {
    // Keep stored report for next launch if offline.
  }
}
