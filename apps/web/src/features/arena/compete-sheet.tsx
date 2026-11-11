"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./compete-sheet.css";

const FlipLayer = createContext<(flipping: boolean) => void>(() => {});
export const useCompeteFlipLayer = () => useContext(FlipLayer);

export function CompeteSheet({ children, active, expandRequest = 0, overview, scrollable = true }: { children: ReactNode; active: boolean; expandRequest?: number; overview?: ReactNode; scrollable?: boolean }) {
  const [flipping, setFlipping] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);
  const flipLayer = useCallback((next: boolean) => {
    if (next) scrollTop.current = body.current?.scrollTop ?? 0;
    setFlipping(next);
  }, []);
  useLayoutEffect(() => {
    if (!flipping && body.current) body.current.scrollTop = scrollTop.current;
  }, [flipping]);
  const [stop, setStop] = useState(0);
  useEffect(() => { if (active) setStop(0); }, [active]);
  useEffect(() => { if (expandRequest) setStop(2); }, [expandRequest]);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ y: number; height: number; maximum: number } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const [maximum, setMaximum] = useState(0);
  useEffect(() => { const node = sheet.current; if (!node || typeof ResizeObserver === "undefined") return; const update = () => setMaximum(node.offsetHeight); update(); const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect(); }, []);
  const overviewRef = useRef<HTMLDivElement>(null);
  const [overviewHeight, setOverviewHeight] = useState(0);
  useLayoutEffect(() => {
    const node = overviewRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setOverviewHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [Boolean(overview)]);
  const minimum = Math.min(maximum || Infinity, 44 + overviewHeight);
  const middle = Math.max(minimum, maximum * .42);
  const visible = dragHeight !== null ? `${dragHeight}px` : stop === 0 ? `${minimum}px` : stop === 1 ? `${middle}px` : "100%";
  return <section onKeyDown={event => { if (event.key === "Escape") setStop(0); }} ref={sheet} className="compete-sheet" data-active={active} data-flipping={flipping} aria-label="Competition standings and events" data-stop={stop} inert={!active}
    style={{ visibility: active ? "visible" : "hidden", transform: `translateY(calc(100% - ${visible}))`, translate: active ? "0 0" : "100vw 0", transition: dragHeight !== null ? "none" : `transform 280ms cubic-bezier(.22,1,.36,1), translate 320ms cubic-bezier(.22,1,.36,1), visibility 0s ${active ? "0ms" : "320ms"}` }}>

    <div className="compete-sheet-grip" role="slider" tabIndex={0} aria-label="Competition sheet height" aria-valuemin={0} aria-valuemax={2} aria-valuenow={stop} aria-valuetext={["Minimized", "Partially expanded", "Fully expanded"][stop]}
      onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setStop(value => Math.max(0, Math.min(2, value + (event.key === "ArrowUp" ? 1 : -1)))); } }}
      onPointerDown={event => { const maximum = sheet.current?.offsetHeight ?? 0; drag.current = { y: event.clientY, height: stop === 0 ? minimum : stop === 1 ? middle : maximum, maximum }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) setDragHeight(Math.max(minimum, Math.min(drag.current.maximum, drag.current.height + drag.current.y - event.clientY))); }}
      onPointerUp={event => { const current = drag.current; if (!current) return; if (Math.abs(event.clientY - current.y) < 5) { setStop(stop === 2 ? 1 : 2); setDragHeight(null); drag.current = null; return; } const height = Math.max(minimum, Math.min(current.maximum, current.height + current.y - event.clientY)); const stops = [minimum, Math.max(minimum, current.maximum * .42), current.maximum]; setStop(stops.reduce((best, item, index) => Math.abs(item - height) < Math.abs(stops[best] - height) ? index : best, 0)); setDragHeight(null); drag.current = null; }}
      onPointerCancel={() => { setDragHeight(null); drag.current = null; }}><span /></div>
    {overview && <div ref={overviewRef} className="compete-sheet-overview">{overview}</div>}
    <div ref={body} className="compete-sheet-body" style={{ overflow: scrollable ? undefined : "hidden", paddingBottom: 32 + Math.max(0, maximum - (dragHeight ?? (stop === 0 ? minimum : stop === 1 ? middle : maximum))) }} inert={stop === 0 && dragHeight === null}><div style={{ transform: flipping && scrollTop.current ? `translateY(-${scrollTop.current}px)` : undefined }}><FlipLayer.Provider value={flipLayer}>{children}</FlipLayer.Provider></div></div>
  </section>;
}
