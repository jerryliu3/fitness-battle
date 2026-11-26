import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type ReportPreviewReady = (id: symbol, ready: boolean) => void;

const PreviewReadyContext = createContext<ReportPreviewReady | null>(null);

/** Tracks whether every visible Compete Mapbox preview snapshot has settled. */
export function CoursePreviewReadyProvider({
  onReadyChange,
  children,
}: {
  onReadyChange: (ready: boolean) => void;
  children: ReactNode;
}) {
  const [pending, setPending] = useState<Set<symbol>>(() => new Set());
  const onReadyRef = useRef(onReadyChange);
  onReadyRef.current = onReadyChange;

  const report = useCallback<ReportPreviewReady>((id, ready) => {
    setPending((previous) => {
      const has = previous.has(id);
      if (has === !ready) return previous;
      const next = new Set(previous);
      if (ready) next.delete(id);
      else next.add(id);
      onReadyRef.current(next.size === 0);
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    onReadyRef.current(pending.size === 0);
  }, [pending.size]);

  return (
    <PreviewReadyContext.Provider value={report}>
      {children}
    </PreviewReadyContext.Provider>
  );
}

/** Registers one preview capture with the surrounding Compete readiness gate. */
export function useCoursePreviewReady(ready: boolean) {
  const report = useContext(PreviewReadyContext);
  const id = useRef(Symbol("course-preview"));
  useLayoutEffect(() => {
    report?.(id.current, ready);
    return () => report?.(id.current, true);
  }, [report, ready]);
}
