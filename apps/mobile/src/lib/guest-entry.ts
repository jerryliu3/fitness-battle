import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const PENDING_CREW_INVITE_KEY = "fb:pending-crew-invite:v1";
const PENDING_CREW_ACCEPT_KEY = "fb:pending-crew-accept:v1";
const DISMISS_PREFIX = "fb:guest-entry-dismiss:v1:";

export async function readPendingCrewInvite(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CREW_INVITE_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export async function stashPendingCrewInvite(code: string | null | undefined) {
  const trimmed = code?.trim();
  if (!trimmed) await AsyncStorage.removeItem(PENDING_CREW_INVITE_KEY);
  else await AsyncStorage.setItem(PENDING_CREW_INVITE_KEY, trimmed.toUpperCase());
}

export async function clearPendingCrewInvite() {
  await stashPendingCrewInvite(null);
}

export async function stashPendingCrewAccept(pending: boolean) {
  if (pending) await AsyncStorage.setItem(PENDING_CREW_ACCEPT_KEY, "1");
  else await AsyncStorage.removeItem(PENDING_CREW_ACCEPT_KEY);
}

export async function readPendingCrewAccept(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PENDING_CREW_ACCEPT_KEY)) === "1";
  } catch {
    return false;
  }
}

async function isDismissed(path: string) {
  try {
    return (await AsyncStorage.getItem(`${DISMISS_PREFIX}${path}`)) === "1";
  } catch {
    return false;
  }
}

async function rememberDismiss(path: string) {
  try {
    await AsyncStorage.setItem(`${DISMISS_PREFIX}${path}`, "1");
  } catch {
    /* ignore */
  }
}

export function useGuestEntryPrompt(userId: string | undefined, options: { enabled: boolean; nextPath: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isDismissed(options.nextPath).then((value) => {
      if (!cancelled) {
        setDismissed(value);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [options.nextPath]);

  const open = options.enabled && ready && !userId && !dismissed;

  const dismiss = useCallback(() => {
    void rememberDismiss(options.nextPath);
    setDismissed(true);
  }, [options.nextPath]);

  return { open, dismiss, reopen: () => setDismissed(false) };
}