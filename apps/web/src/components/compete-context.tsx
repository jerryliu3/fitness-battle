"use client";
import { AppParagraph } from "@/ui/section";


import { useCompetitionExperience } from "@/lib/use-competition-experience";
import { useSyncReviewGate } from "@/lib/use-sync-review";

import { accountName } from "@/lib/account-name";

import { useAuth } from "@/components/auth-context";
import { getDemoCompeteState } from "@/lib/compete-demo-seed";
import {
  applyDebugEvent,
  applyRemoteSnapshot,
  FIELD_REFRESH_MS,
  fieldChangeNotice,
  fieldSeenStorageKey,
  freshState,
  findDemoAccount,
  isCompeteState,
  migrateCompeteState,
  primaryRevealResults,
  readSeenField,
  reduceCompete,
  rollClock,
  seedArenaBaselinesFromState,
  seenFieldFromState,
  withAccountEloBaseline,
  type Action,
  type Activity,
  type CompeteState,
  type DebugEventId,
  type DebugEventResult,
  type FieldNotice,
} from "@fitness-battle/shared";
import type { CompeteLoadStatus } from "@fitness-battle/shared/boot";
import {
  lazy,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SyncReview = lazy(() =>
  import("@/features/club/sync-review").then((m) => ({
    default: m.SyncReview,
  })),
);

type LoadStatus = CompeteLoadStatus;

interface CompeteApi {
  state: CompeteState | null;
  dispatch: (action: Action) => void;
  previewSyncReview?: () => void;
  beginSyncReviewBatch?: (accountId?: string) => void;
  endSyncReviewBatch?: (accountId?: string) => void;
  /** True when the last account save failed. */
  saveError: string | null;
  loadStatus: LoadStatus;
  /** Real crew or personal movement since this browser last acknowledged the field. */
  fieldNotice: FieldNotice | null;
  /** The last field refresh failed. Lanes may be behind the server. */
  standingsStale: boolean;
  retryLoad: () => void;
  dismissFieldNotice: () => void;
  refresh: () => Promise<boolean>;
  debugActive?: boolean;
  lastDebugEvent?: { id: DebugEventId; nonce: number } | null;
  triggerDebugEvent?: (event: DebugEventId) => DebugEventResult | null;
  resetDebugState?: () => void;
}

const CompeteContext = createContext<CompeteApi>({
  state: null,
  dispatch: () => {},
  saveError: null,
  loadStatus: "loading",
  fieldNotice: null,
  standingsStale: false,
  retryLoad: () => {},
  dismissFieldNotice: () => {},
  refresh: async () => false,
  debugActive: false,
  lastDebugEvent: null,
  triggerDebugEvent: () => null,
  resetDebugState: () => {},
});

function storageKey(userId: string | null): string {
  return userId ? `fb-compete-v1:${userId}` : "fb-compete-v1:guest";
}

function deviceOnlyKey(userId: string): string {
  return `fb-compete-v1:${userId}:device-only`;
}

function parseStored(raw: string | null): { savedAt: string; state: CompeteState } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: string; state?: unknown };
    const state = isCompeteState(parsed.state)
      ? parsed.state
      : isCompeteState(parsed)
        ? parsed
        : null;
    if (!state) return null;
    return {
      savedAt: parsed.savedAt ?? new Date(0).toISOString(),
      state: rollClock(migrateCompeteState(state)),
    };
  } catch {
    return null;
  }
}

function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("Could not read compete state from local storage:", error);
    return null;
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Progress remains available if device storage is disabled. */
  }
}

function removeStorageItem(key: string): void {
  try { localStorage.removeItem(key); } catch {
    /* Storage failure must not block edits or successful server acknowledgements. */
  }
}

function readLocal(userId: string | null): { savedAt: string; state: CompeteState; cached: boolean } {
  const existing = parseStored(readStorageItem(storageKey(userId)));
  const demoSeed = getDemoCompeteState(userId);
  if (demoSeed && (!existing || existing.state.activities.length === 0)) {
    return {
      cached: false,
      savedAt: new Date(0).toISOString(),
      state: rollClock(demoSeed),
    };
  }
  if (existing) {
    if (demoSeed) {
      const existingIds = new Set(existing.state.activities.map((a) => a.id));
      const missing = demoSeed.activities.filter((a) => !existingIds.has(a.id));
      const needsCrew = !existing.state.crewBoard || existing.state.crewBoard.crewId === "solo";
      if (missing.length > 0 || needsCrew) {
        const nextState = {
          ...existing.state,
          activities: missing.length > 0 ? [...existing.state.activities, ...missing] : existing.state.activities,
          crewBoard: needsCrew ? demoSeed.crewBoard : existing.state.crewBoard,
          enrollments: existing.state.enrollments.length > 0 ? existing.state.enrollments : demoSeed.enrollments,
        };
        writeLocal(userId, nextState, existing.savedAt);
        return {
          cached: true,
          savedAt: existing.savedAt,
          state: nextState,
        };
      }
    }
    return { ...existing, cached: true };
  }
  if (demoSeed) {
    return {
      cached: false,
      savedAt: new Date(0).toISOString(),
      state: rollClock(demoSeed),
    };
  }
  return {
    cached: false,
    savedAt: new Date(0).toISOString(),
    state: rollClock(freshState()),
  };
}

function writeLocal(userId: string | null, state: CompeteState, savedAt: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ savedAt, state }));
  } catch (error) {
    console.warn("Could not save compete state to local storage:", error);
  }
}

export function CompeteProvider({ children }: { children: ReactNode }) {
  const { user, loading, offlineMode } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<CompeteState | null>(null);
  const syncReviewBlocked = useRef(false);
  const holdRemoteRef = useRef<(next: CompeteState) => CompeteState>(next => next);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryingSave, setRetryingSave] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  /** Account the current `state`/`loadStatus` belong to — cleared synchronously on switch. */
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(
    undefined,
  );
  const [fieldNotice, setFieldNotice] = useState<FieldNotice | null>(null);
  const [standingsStale, setStandingsStale] = useState(false);
  const userIdRef = useRef(userId);
  const offlineRef = useRef(offlineMode);
  const statusRef = useRef<LoadStatus>("loading");
  const stateRef = useRef<CompeteState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Action[]>([]);
  const dirtyRef = useRef(0);
  const unsavedRef = useRef(false);
  const unitsUnsavedRef = useRef(false);
  const revisionRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const lifecycle = useRef(0);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const refreshFlight = useRef<Promise<boolean> | null>(null);
  const [debugActive, setDebugActive] = useState(false);
  const [lastDebugEvent, setLastDebugEvent] = useState<{ id: DebugEventId; nonce: number } | null>(null);
  const debugActiveRef = useRef(false);
  const debugStepRef = useRef(0);
  const preDebugRef = useRef<{ state: CompeteState | null; status: LoadStatus } | null>(null);
  userIdRef.current = userId;
  offlineRef.current = offlineMode;

  // Drop prior-account state before children render with the new userId.
  if (!loading && loadedFor !== userId) {
    lifecycle.current += 1;
    revisionRef.current = null; conflictRef.current = false; setSaveConflict(false);
    setLoadedFor(userId);
    setState(null);
    setLoadStatus("loading");
    setSaveError(null);
    setRetryingSave(false);
    setRetryFailed(false);
    statusRef.current = "loading";
    stateRef.current = null;
    queue.current = [];
    dirtyRef.current = 0;
    unsavedRef.current = false;
    unitsUnsavedRef.current = false;
    debugActiveRef.current = false;
    preDebugRef.current = null;
    setDebugActive(false);
    setLastDebugEvent(null);
    setFieldNotice(null);
    setStandingsStale(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  const runSave = useCallback(
    (accountId: string | null, next: CompeteState, generation: number) => {
      if (!accountId || offlineRef.current || debugActiveRef.current || statusRef.current !== "ready" || conflictRef.current) return;
      const epoch = lifecycle.current;
      const isCurrent = () => accountId === userIdRef.current && epoch === lifecycle.current;
      saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        if (!isCurrent() || generation !== dirtyRef.current || conflictRef.current) {
          if (isCurrent()) setRetryingSave(false);
          return;
        }
        try {
          const response = await fetch("/api/compete", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: next, accountId, updatedAt: revisionRef.current }),
          });
          if (!isCurrent()) return;
          const body = await response.json().catch(() => null);
          if (!isCurrent()) return;
          if (!response.ok) {
            writeStorageItem(deviceOnlyKey(accountId), "1");
            if (body?.error === "account_changed_reload" || body?.error === "account_version_required") {
              conflictRef.current = true; setSaveConflict(true);
              setSaveError("Your account changed elsewhere. Reload the account before saving again.");
            } else if (body?.error === "week_still_open") {
              setSaveError("The wave has started, so your registration was kept. Please retry any other changes.");
              void refresh();
            } else setSaveError("This device updated. The account copy did not save.");
            return;
          }
          if (typeof body?.updatedAt !== "string") throw new Error("missing_revision");
          revisionRef.current = body.updatedAt;
          writeStorageItem(`${storageKey(accountId)}:revision`, body.updatedAt);
          if (dirtyRef.current === generation) {
            if (isCompeteState(body.state)) {
              stateRef.current = body.state;
              setState(body.state);
            }
            removeStorageItem(deviceOnlyKey(accountId));
            unsavedRef.current = false; unitsUnsavedRef.current = false;
          }
          setSaveError(null);
          setRetryFailed(false);
        } catch {
          if (!isCurrent()) return;
          writeStorageItem(deviceOnlyKey(accountId), "1");
          setSaveError("This device updated. The account copy did not save.");
        } finally {
          if (isCurrent()) setRetryingSave(false);
        }
      });
    }, [],
  );

  const scheduleSave = useCallback(
    (accountId: string | null, next: CompeteState, immediate = false, force = false) => {
      if (!accountId || offlineRef.current) return;
      if (statusRef.current !== "ready" && !force) return;
      if (timer.current) clearTimeout(timer.current);
      const generation = dirtyRef.current;
      if (immediate) {
        runSave(accountId, next, generation);
        return;
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        runSave(accountId, next, generation);
      }, 400);
    },
    [runSave],
  );

  const publish = useCallback(
    (
      accountId: string | null,
      next: CompeteState,
      savedAt: string,
      status: LoadStatus,
      upload: boolean,
    ) => {
      statusRef.current = status;
      stateRef.current = next;
      setLoadStatus(status);
      setState(next);
      if (status === "failed") return;
      writeLocal(accountId, next, savedAt);
      if (upload) scheduleSave(accountId, next);
    },
    [scheduleSave],
  );

  const userDisplayName = user?.displayName ?? "";
  const userEmail = user?.email ?? "";

  useEffect(() => {
    if (loading) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    queue.current = [];
    const accountId = userId;
    lifecycle.current += 1;
    let cancelled = false;
    const signedIn = Boolean(accountId) && !offlineMode;
    const local = readLocal(accountId);

    const settle = (chosen: CompeteState, savedAt: string, status: LoadStatus) => {
      if (cancelled || userIdRef.current !== accountId) return;
      let next = signedIn ? withAccountEloBaseline(chosen) : chosen;
      if (userDisplayName || userEmail) next = { ...next, name: accountName(next.name, userDisplayName, userEmail) };
      const pending = queue.current.splice(0);
      for (const action of pending) next = reduceCompete(next, action);
      if (signedIn) next = withAccountEloBaseline(next);
      const stamped = pending.length > 0 ? new Date().toISOString() : savedAt;
      publish(accountId, next, stamped, status, status === "ready" && (pending.length > 0 || unsavedRef.current));
    };

    if (!signedIn) {
      settle(local.state, local.savedAt, "local");
      if (process.env.NODE_ENV === "development" && accountId && offlineMode && findDemoAccount(userEmail)) {
        void fetch(`/api/dev/route-seed?account=${encodeURIComponent(userEmail)}`)
          .then(response => response.ok ? response.json() : null)
          .then((body: { activities?: Activity[] } | null) => {
            if (cancelled || userIdRef.current !== accountId || !body?.activities?.length || !stateRef.current) return;
            const current = stateRef.current;
            const existing = new Map(current.activities.map(a => [a.id, a]));
            const incoming = body.activities.filter(a => a.id.startsWith("local-route-"));
            const ids = new Set(incoming.map(a => a.id));
            const next = { ...current, activities: [...current.activities.filter(a => !ids.has(a.id)), ...incoming.map(a => ({ ...a, disposition: existing.get(a.id)?.disposition ?? a.disposition }))] };
            publish(accountId, next, local.savedAt, "local", false);
          }).catch(() => { /* Optional local fixtures; ordinary offline state remains available. */ });
      }
      return () => {
      cancelled = true;
    };
    }

    if (!stateRef.current) {
      statusRef.current = "loading";
      setLoadStatus("loading");
      setState(null);
    }
    void fetch("/api/compete")
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        return (await response.json()) as { state?: unknown; updatedAt?: string | null };
      })
      .then((body) => {
        if (cancelled || userIdRef.current !== accountId || !accountId) return;
        // A marker cannot turn a missing/corrupt cache into an uploadable draft.
        const staleDeviceDraft = local.cached && readStorageItem(deviceOnlyKey(accountId)) === "1";
        if (!local.cached) removeStorageItem(deviceOnlyKey(accountId));
        unsavedRef.current = staleDeviceDraft || queue.current.length > 0;
        unitsUnsavedRef.current ||= staleDeviceDraft;
        const cachedRevision = readStorageItem(`${storageKey(accountId)}:revision`);
        revisionRef.current = staleDeviceDraft ? cachedRevision : body.updatedAt ?? null;
        if (staleDeviceDraft && cachedRevision && body.updatedAt && cachedRevision !== body.updatedAt) {
          conflictRef.current = true; setSaveConflict(true);
          setSaveError("Your account changed elsewhere. Reload the account before saving again.");
        }
        if (!staleDeviceDraft && body.updatedAt) writeStorageItem(`${storageKey(accountId)}:revision`, body.updatedAt);
        const remote = isCompeteState(body.state)
          ? rollClock(migrateCompeteState(body.state))
          : null;
        if (!remote) {
          settle(local.state, local.savedAt, "ready");
          return;
        }
        const dirty = staleDeviceDraft || !body.updatedAt;
        if (!dirty) removeStorageItem(deviceOnlyKey(accountId));
        // A persisted draft is a whole document; retain its units until acknowledged.
        const chosen = applyRemoteSnapshot(local.state, remote, dirty, staleDeviceDraft);
        settle(
          chosen,
          chosen === local.state ? local.savedAt : (body.updatedAt ?? local.savedAt),
          "ready",
        );
      })
      .catch(() => {
        if (cancelled || userIdRef.current !== accountId) return;
        const pending = queue.current.splice(0);
        let next = { ...withAccountEloBaseline(local.state), name: accountName(local.state.name, userDisplayName, userEmail) };
        for (const action of pending) next = reduceCompete(next, action);
        publish(accountId, next, pending.length > 0 ? new Date().toISOString() : local.savedAt, "failed", false);
        if (pending.some((action) => action.type === "set-avatar")) scheduleSave(accountId, next, true, true);
        setSaveError(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, offlineMode, loading, publish, scheduleSave, userId, userDisplayName, userEmail]);

  useEffect(() => {
    if (!state || loadStatus === "loading" || loadStatus === "failed") return;
    const accountKey = userId ?? "guest";
    seedArenaBaselinesFromState(state, accountKey, readStorageItem, writeStorageItem);
    const next = seenFieldFromState(state, accountKey);
    if (primaryRevealResults(state.periodResults, undefined, state.primary).length > 0) {
      if (next) {
        try {
          localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
        } catch {
          /* The recap still shows if device storage is disabled. */
        }
      }
      setFieldNotice(null);
      return;
    }
    if (!next) {
      setFieldNotice(null);
      return;
    }
    const previous = readSeenField(readStorageItem(fieldSeenStorageKey(accountKey)));
    const notice = fieldChangeNotice(previous, next);
    if (!notice) {
      try {
        localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(next));
      } catch {
        /* Progress remains available if device storage is disabled. */
      }
      setFieldNotice(null);
      return;
    }
    setFieldNotice(notice);
  }, [loadStatus, state, userId]);

  const retryLoad = useCallback(() => {
    const accountId = userIdRef.current;
    if (conflictRef.current && accountId) {
      localStorage.setItem(`${storageKey(accountId)}:recovery`, JSON.stringify(stateRef.current));
      localStorage.removeItem(deviceOnlyKey(accountId));
      conflictRef.current = false; setSaveConflict(false);
      unsavedRef.current = false; unitsUnsavedRef.current = false;
      dirtyRef.current += 1;
    }
    if (!conflictRef.current && statusRef.current === "ready" && unsavedRef.current && stateRef.current) {
      setRetryingSave(true);
      setRetryFailed(true);
      scheduleSave(accountId, stateRef.current, true);
      return;
    }
    setSaveError(null);
    setAttempt((value) => value + 1);
  }, [scheduleSave]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (syncReviewBlocked.current) return false;
    const accountId = userIdRef.current;
    if (!accountId || offlineRef.current || debugActiveRef.current || statusRef.current !== "ready") return true;
    if (refreshFlight.current) return refreshFlight.current;
    const generation = dirtyRef.current;
    const task = (async () => {
      try {
        const response = await fetch("/api/compete");
        if (!response.ok) {
          setStandingsStale(true);
          return false;
        }
        const body = (await response.json()) as { state?: unknown; updatedAt?: string | null };
        if (
          syncReviewBlocked.current ||
          userIdRef.current !== accountId || statusRef.current !== "ready") return false;
        if (!isCompeteState(body.state)) return false;
        const remote = rollClock(migrateCompeteState(body.state));
        const local = stateRef.current;
        if (!local) return false;
        const dirty =
          unsavedRef.current ||
          dirtyRef.current !== generation ||
          timer.current != null;
        if (!dirty && !conflictRef.current) {
          revisionRef.current = body.updatedAt ?? null;
          if (body.updatedAt) writeStorageItem(`${storageKey(accountId)}:revision`, body.updatedAt);
        }
        const next = applyRemoteSnapshot(
          local,
          remote,
          dirty,
          unitsUnsavedRef.current,
        );
        if (next !== local) {
          const savedAt = dirty
            ? new Date().toISOString()
            : (body.updatedAt ?? new Date().toISOString());
          publish(accountId, holdRemoteRef.current(next), savedAt, "ready", false);
        }
        setStandingsStale(false);
        return true;
      } catch {
        if (userIdRef.current === accountId) setStandingsStale(true);
        return false;
      } finally {
        refreshFlight.current = null;
      }
    })();
    refreshFlight.current = task;
    return task;
  }, [publish]);

  useEffect(() => {
    if (loading || !userId || offlineMode) return;
    const kick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("online", kick);
    return () => {
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("online", kick);
    };
  }, [offlineMode, loading, refresh, userId]);

  const dismissFieldNotice = useCallback(() => {
    const accountKey = userIdRef.current ?? "guest";
    const current = stateRef.current;
    if (current) {
      const seen = seenFieldFromState(current, accountKey);
      if (seen) {
        try {
          localStorage.setItem(fieldSeenStorageKey(accountKey), JSON.stringify(seen));
        } catch {
          /* Acknowledgement stays in memory if device storage is disabled. */
        }
      }
    }
    setFieldNotice(null);
  }, []);

  const experience = useCompetitionExperience(
    loadStatus === "loading" || loadStatus === "failed" ? null : state,
    userId ?? "guest",
    readStorageItem,
    (key, value) => { if (!debugActiveRef.current) writeStorageItem(key, value); },
  );

  const triggerDebugEvent = useCallback((event: DebugEventId): DebugEventResult | null => {
    const accountKey = userIdRef.current ?? "guest";
    const current = stateRef.current ?? rollClock(freshState());
    if (!preDebugRef.current) preDebugRef.current = { state: stateRef.current, status: statusRef.current };
    debugActiveRef.current = true;
    setDebugActive(true);
    const step = (debugStepRef.current += 1);
    const result = applyDebugEvent(event.startsWith("sync-") ? { ...current, primary: "running" } : current, event, accountKey, step);
    if (statusRef.current === "loading" || statusRef.current === "failed") {
      statusRef.current = "local";
      setLoadStatus("local");
    }
    syncReview.reset();
    if (event.startsWith("sync-")) {
      const activities = result.state.activities.filter(a => a.id.startsWith("debug-") && !current.activities.some(old => old.id === a.id));
      const ids = new Set(activities.map(a => a.id));
      const base = { ...result.state, activities: result.state.activities.filter(a => !ids.has(a.id)) };
      experience.clear(base);
      stateRef.current = base;
      setState(base);
      syncReview.stage(activities, [{ type: "apply-sync", provider: "strava", activities }], () => experience.prime(result.baselines), base);
    } else {
      experience.prime(result.baselines);
      stateRef.current = result.state;
      setState(result.state);
    }
    setLastDebugEvent({ id: event, nonce: step });
    return result;
  }, []);

  const resetDebugState = useCallback(() => {
    const snapshot = preDebugRef.current;
    preDebugRef.current = null;
    debugActiveRef.current = false;
    setDebugActive(false);
    setLastDebugEvent(null);
    syncReview.reset();
    experience.clear(snapshot?.state ?? undefined);
    if (!snapshot) return;
    statusRef.current = snapshot.status;
    stateRef.current = snapshot.state;
    setLoadStatus(snapshot.status);
    setState(snapshot.state);
  }, []);

  const api = useMemo<CompeteApi>(
    () => ({
      state,
      saveError,
      loadStatus,
      fieldNotice,
      standingsStale,
      retryLoad,
      dismissFieldNotice,
      refresh,
      debugActive,
      lastDebugEvent,
      triggerDebugEvent,
      resetDebugState,
      dispatch: (action: Action) => {
        const withAccount: Action =
          userIdRef.current && !action.accountId
            ? { ...action, accountId: userIdRef.current }
            : action;
        const avatarOnlyWhileFailed =
          withAccount.type === "set-avatar" && statusRef.current === "failed";
        if (statusRef.current === "failed" && !debugActiveRef.current && !avatarOnlyWhileFailed) return;
        if (statusRef.current === "loading" || !stateRef.current) {
          queue.current.push(withAccount);
          dirtyRef.current += 1;
          unsavedRef.current = true;
          return;
        }
        const accountKey = userIdRef.current ?? "guest";
        if (debugActiveRef.current) {
          const next = reduceCompete(stateRef.current, withAccount);
          stateRef.current = next;
          setState(next);
          return;
        }
        seedArenaBaselinesFromState(
          stateRef.current,
          accountKey,
          readStorageItem,
          writeStorageItem,
        );
        const before = userIdRef.current && !offlineRef.current ? { ...stateRef.current, requiresCanonicalFields: true } : stateRef.current;
        const next = reduceCompete(before, withAccount);
        if (JSON.stringify(next) === JSON.stringify(before)) return;
        dirtyRef.current += 1;
        unsavedRef.current = true;
        if (withAccount.type === "set-units") unitsUnsavedRef.current = true;
        if (userIdRef.current && !offlineRef.current)
          writeStorageItem(deviceOnlyKey(userIdRef.current), "1");
        seedArenaBaselinesFromState(
          next,
          accountKey,
          readStorageItem,
          writeStorageItem,
          undefined,
          withAccount.syncPresentation === "quiet",
        );
        const savedAt = new Date().toISOString();
        stateRef.current = next;
        setState(next);
        writeLocal(userIdRef.current, next, savedAt);
        const immediate = withAccount.type === "set-units" || withAccount.type === "set-avatar";
        const forceSave = withAccount.type === "set-avatar" && statusRef.current === "failed";
        if (statusRef.current === "ready" || forceSave) {
          scheduleSave(userIdRef.current, next, immediate, forceSave);
        }
      },
    }),
    [
      debugActive,
      dismissFieldNotice,
      fieldNotice,
      lastDebugEvent,
      loadStatus,
      refresh,
      resetDebugState,
      retryLoad,
      saveError,
      scheduleSave,
      standingsStale,
      state,
      triggerDebugEvent,
    ],
  );

  const syncReview = useSyncReviewGate(
    api.dispatch,
    loadStatus === "failed" || loadStatus === "loading" ? null : state,
    userId ?? null,
    syncReviewBlocked,
    experience.observe,
  );
  holdRemoteRef.current = syncReview.holdRemote;
  return (
    <CompeteContext.Provider value={{
        ...api,
        dispatch: syncReview.dispatch,
        previewSyncReview: syncReview.preview,
        beginSyncReviewBatch: syncReview.begin,
        endSyncReviewBatch: syncReview.end,
      }}>
    {saveConflict && (
        <div role="alert" className="fb-card" style={{ padding: 16 }}>
      Your account changed elsewhere. Reload to use the current account. Your local draft will be kept on this device as a recovery copy.
      <button className="fb-btn-line" onClick={retryLoad}>Reload account</button>
    </div>
      )}
    {saveError && !saveConflict && loadStatus === "ready" && (
      <div role="alert" className="fb-card" style={{ padding: 16 }}>
        <p>{saveError}</p>
        {retryFailed && !retryingSave && <p role="status">Retry could not save. Your changes remain on this device.</p>}
        <button className="fb-btn-line" disabled={retryingSave} onClick={retryLoad}>{retryingSave ? "Saving…" : "Retry save"}</button>
      </div>
    )}
    {children}
      {(syncReview.receipt || experience.moment) && state ? (
        <Suspense fallback={<AppParagraph typographyRole="body" role="status">Opening today’s recap…</AppParagraph>}>
          <SyncReview
            key={userId ?? "guest"}
            debug={debugActive}
            receipt={syncReview.receipt}
            moment={experience.moment}
            remaining={experience.remaining}
            onAcknowledge={experience.acknowledge}
            state={state}
            onComplete={syncReview.finish}
          />
        </Suspense>
      ) : null}
  </CompeteContext.Provider>
  );
}

export function useCompete(): CompeteApi {
  return useContext(CompeteContext);
}

/** Poll the signed-in field while Compete is the visible tab. */
export function useCompeteFieldRefresh(active: boolean) {
  const { refresh, loadStatus } = useCompete();
  useEffect(() => {
    if (!active || (loadStatus !== "ready" && loadStatus !== "local")) return;
    let stopped = false;
    let delay = FIELD_REFRESH_MS;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (document.visibilityState === "hidden") {
        timer = setTimeout(tick, FIELD_REFRESH_MS);
        return;
      }
      void refresh().then((ok) => {
        if (stopped) return;
        delay = ok ? FIELD_REFRESH_MS : Math.min(delay * 2, 5 * 60_000);
        timer = setTimeout(tick, delay);
      });
    };
    void refresh();
    timer = setTimeout(tick, FIELD_REFRESH_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, loadStatus, refresh]);
}
