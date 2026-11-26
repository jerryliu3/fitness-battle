import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { mobileEnv } from "./env";
import { fetchWithTimeout } from "./fetch-with-timeout";

export type NetworkStatus = "online" | "offline";

const PROBE_BACKOFF_MS = [3_000, 6_000, 12_000, 30_000];
const PROBE_TIMEOUT_MS = 3_500;

let currentStatus: NetworkStatus = "online";
let backoffIndex = 0;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probeInFlight: Promise<boolean> | null = null;
let appStateWired = false;
const listeners = new Set<(status: NetworkStatus) => void>();

function notify() {
  for (const listener of listeners) listener(currentStatus);
}

function clearProbeTimer() {
  if (probeTimer !== null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
}

export function isTransportError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number") {
    return false;
  }
  const name = error instanceof Error ? error.name : "";
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (name === "AbortError") return true;
  if (name === "TypeError" && (message.includes("network") || message.includes("fetch") || message.includes("load failed"))) {
    return true;
  }
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("the internet connection appears to be offline") ||
    message.includes("could not connect to the server")
  );
}

export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

export function reportNetworkSuccess() {
  backoffIndex = 0;
  clearProbeTimer();
  if (currentStatus !== "online") {
    currentStatus = "online";
    notify();
  }
}

function isAppActive(): boolean {
  const state = AppState?.currentState;
  return !state || state === "active";
}

function scheduleProbe() {
  if (probeTimer !== null || currentStatus === "online" || !isAppActive()) return;
  const delay = PROBE_BACKOFF_MS[Math.min(backoffIndex, PROBE_BACKOFF_MS.length - 1)]!;
  probeTimer = setTimeout(() => {
    probeTimer = null;
    void checkNetworkNow();
  }, delay);
}

export function reportNetworkFailure(error?: unknown) {
  if (error !== undefined && !isTransportError(error)) {
    reportNetworkSuccess();
    return;
  }
  if (currentStatus !== "offline") {
    currentStatus = "offline";
    backoffIndex = 0;
    notify();
  }
  scheduleProbe();
}

export function checkNetworkNow(): Promise<boolean> {
  if (probeInFlight) return probeInFlight;
  const baseUrl = mobileEnv.apiUrl?.replace(/\/$/, "");
  if (!baseUrl) return Promise.resolve(currentStatus === "online");
  probeInFlight = fetchWithTimeout(`${baseUrl}/api/health`, { method: "GET" }, PROBE_TIMEOUT_MS)
    .then((response) => {
      if (response.status > 0) {
        reportNetworkSuccess();
        return true;
      }
      backoffIndex = Math.min(backoffIndex + 1, PROBE_BACKOFF_MS.length - 1);
      scheduleProbe();
      return false;
    })
    .catch(() => {
      backoffIndex = Math.min(backoffIndex + 1, PROBE_BACKOFF_MS.length - 1);
      if (currentStatus !== "offline") {
        currentStatus = "offline";
        notify();
      }
      scheduleProbe();
      return false;
    })
    .finally(() => {
      probeInFlight = null;
    });
  return probeInFlight;
}

function ensureListenersWired() {
  if (appStateWired) return;
  appStateWired = true;
  if (typeof AppState?.addEventListener === "function") {
    AppState.addEventListener("change", (state) => {
      if (state === "active" && currentStatus === "offline") {
        backoffIndex = 0;
        clearProbeTimer();
        void checkNetworkNow();
      } else if (state !== "active") {
        clearProbeTimer();
      }
    });
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("online", () => {
      void checkNetworkNow();
    });
    window.addEventListener("offline", () => {
      reportNetworkFailure();
    });
  }
}

export function subscribeNetworkStatus(listener: (status: NetworkStatus) => void): () => void {
  ensureListenersWired();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeNetworkReconnect(onReconnect: () => void): () => void {
  let wasOffline = currentStatus === "offline";
  return subscribeNetworkStatus((status) => {
    if (status === "offline") {
      wasOffline = true;
    } else if (wasOffline) {
      wasOffline = false;
      onReconnect();
    }
  });
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(currentStatus);
  useEffect(() => {
    setStatus(currentStatus);
    return subscribeNetworkStatus(setStatus);
  }, []);
  return {
    status,
    isOnline: status === "online",
    checkNow: checkNetworkNow,
  };
}

export function resetNetworkStatusForTests() {
  clearProbeTimer();
  probeInFlight = null;
  backoffIndex = 0;
  currentStatus = "online";
  listeners.clear();
  appStateWired = false;
}
