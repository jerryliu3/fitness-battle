"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  PRODUCT_SEEN_PREFIX,
  homeSnapshot,
  progressGain,
  readSnapshot,
  seenKey,
  type ProgressSnapshot,
} from "@/app/design/_studies/home-lab/model";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Arrival {
  previous: ProgressSnapshot;
  current: ProgressSnapshot;
  reveal: boolean;
}

interface VisitApi {
  snapshot: ProgressSnapshot | null;
  arrival: Arrival | null;
  progress: number;
  finished: boolean;
  replay: () => void;
  settle: () => void;
}

const VisitContext = createContext<VisitApi | null>(null);

export function VisitProvider({ children }: { children: ReactNode }) {
  const { state, loadStatus } = useCompete();
  const { user } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const accountId = user?.id ?? "guest";
  const persist = loadStatus !== "failed";
  const snapshot = useMemo(() => (state ? homeSnapshot(state) : null), [state]);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [progress, setProgress] = useState(1);
  const [finished, setFinished] = useState(false);
  const [replayCount, setReplay] = useState(0);
  const handled = useRef("");
  const inMemory = useRef<ProgressSnapshot | null>(null);

  const saveSeen = useCallback(
    (value: ProgressSnapshot) => {
      inMemory.current = value;
      if (!persist) return;
      try {
        localStorage.setItem(seenKey(accountId, value, PRODUCT_SEEN_PREFIX), JSON.stringify(value));
      } catch {
        /* Session memory covers a blocked store. */
      }
    },
    [accountId, persist],
  );

  useEffect(() => {
    if (!snapshot) return;
    const signature = `${accountId}:${JSON.stringify(snapshot)}`;
    if (handled.current === signature) return;
    handled.current = signature;
    let previous = inMemory.current;
    if (persist) {
      try {
        previous =
          readSnapshot(localStorage.getItem(seenKey(accountId, snapshot, PRODUCT_SEEN_PREFIX))) ??
          previous;
      } catch {
        /* Storage is optional. */
      }
    }
    const reveal = loadStatus !== "failed" && Boolean(progressGain(previous, snapshot));
    setArrival({
      previous: previous?.scope === snapshot.scope ? previous : snapshot,
      current: snapshot,
      reveal,
    });
    setFinished(!reveal);
    setProgress(reveal ? 0 : 1);
    if (reveal && path !== "/board") router.push("/board");
    if (!reveal) saveSeen(snapshot);
  }, [accountId, loadStatus, path, persist, router, saveSeen, snapshot]);

  useEffect(() => {
    if (!arrival?.reveal && replayCount === 0) return;
    let frame = 0;
    let start: number | null = null;
    setProgress(0);
    setFinished(false);
    function finish() {
      setProgress(1);
      setFinished(true);
      saveSeen(arrival!.current);
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const tick = (time: number) => {
      start ??= time;
      const elapsed = Math.max(0, time - start - 400);
      const fraction = Math.min(1, elapsed / 1800);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [arrival, replayCount, saveSeen]);

  const api = useMemo<VisitApi>(
    () => ({
      snapshot,
      arrival,
      progress,
      finished,
      replay: () => setReplay((count) => count + 1),
      settle: () => {
        if (snapshot) saveSeen(snapshot);
        setFinished(true);
      },
    }),
    [arrival, finished, progress, saveSeen, snapshot],
  );

  return <VisitContext.Provider value={api}>{children}</VisitContext.Provider>;
}

export function useVisit() {
  const value = useContext(VisitContext);
  if (!value) throw new Error("useVisit needs VisitProvider");
  return value;
}
