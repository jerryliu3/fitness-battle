"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type Context } from "react";

// Screen requests register while the app mounts underneath the launch cover.
// Once opened, the gate stays open: later refreshes never replay startup.
export const BootLoadingContext = createContext<((id: symbol, loading: boolean) => void) | null>(null);
export const BootCoverContext = createContext<((id: symbol, covering: boolean) => void) | null>(null);
export const BootOpenedContext = createContext(true);

function useBootSignal(context: Context<((id: symbol, active: boolean) => void) | null>, active: boolean, label: string) {
  const report = useContext(context);
  const id = useRef(Symbol(label));
  useLayoutEffect(() => {
    report?.(id.current, active);
    return () => report?.(id.current, false);
  }, [report, active]);
}

export function useBootLoading(loading: boolean) {
  useBootSignal(BootLoadingContext, loading, "boot request");
}

export function useBootCover(covering: boolean) {
  useBootSignal(BootCoverContext, covering, "boot cover");
}

export function useBootOpened() {
  return useContext(BootOpenedContext);
}

export function useBootRequests() {
  const [pending, setPending] = useState<Set<symbol>>(() => new Set());
  const report = useCallback((id: symbol, loading: boolean) => {
    setPending(previous => {
      if (previous.has(id) === loading) return previous;
      const next = new Set(previous);
      if (loading) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  return { pending: pending.size > 0, report };
}
