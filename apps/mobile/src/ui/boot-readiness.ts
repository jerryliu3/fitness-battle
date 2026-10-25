import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";

// Screen requests register while the app mounts underneath the launch cover.
// Once opened, the gate stays open: later refreshes never replay startup.
export const BootLoadingContext = createContext<((id: symbol, loading: boolean) => void) | null>(null);

export function useBootLoading(loading: boolean) {
  const report = useContext(BootLoadingContext);
  const id = useRef(Symbol("boot request"));
  useLayoutEffect(() => {
    report?.(id.current, loading);
    return () => report?.(id.current, false);
  }, [report, loading]);
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

/** Track the current image source, including native cache hits and errors. */
export function useBootImage(source: unknown) {
  const [settled, setSettled] = useState<unknown>(null);
  useBootLoading(Boolean(source && settled !== source));
  return () => setSettled(source);
}
