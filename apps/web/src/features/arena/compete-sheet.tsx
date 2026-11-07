"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./compete-sheet.css";

export function CompeteSheet({ children, active, expandRequest = 0, overview }: { children: ReactNode; active: boolean; expandRequest?: number; overview?: ReactNode }) {
  const [stop, setStop] = useState(1);
  useEffect(() => { if (expandRequest) setStop(2); }, [expandRequest]);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ y: number; height: number; maximum: number } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const [maximum, setMaximum] = useState(0);
  useEffect(() => { const node = sheet.current; if (!node || typeof ResizeObserver === "undefined") return; const update = () => setMaximum(node.offsetHeight); update(); const observer = new ResizeObserver(update); observer.observe(node); return () => observer.disconnect(); }, []);
  const minimum = overview ? 96 : 44;
  const visible = dragHeight !== null ? `${dragHeight}px` : stop === 0 ? `${minimum}px` : stop === 1 ? "42%" : "100%";
  return <section onKeyDown={event => { if (event.key === "Escape") setStop(0); }} ref={sheet} className="compete-sheet" data-active={active} aria-label="Competition standings and events" data-stop={stop} inert={!active}
    style={{ visibility: active ? "visible" : "hidden", transform: `translateY(calc(100% - ${visible}))`, transition: dragHeight !== null ? "none" : undefined }}>

    <div className="compete-sheet-grip" role="slider" tabIndex={0} aria-label="Competition sheet height" aria-valuemin={0} aria-valuemax={2} aria-valuenow={stop} aria-valuetext={["Minimized", "Partially expanded", "Fully expanded"][stop]}
      onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setStop(value => Math.max(0, Math.min(2, value + (event.key === "ArrowUp" ? 1 : -1)))); } }}
      onPointerDown={event => { const maximum = sheet.current?.offsetHeight ?? 0; drag.current = { y: event.clientY, height: stop === 0 ? minimum : stop === 1 ? maximum * .42 : maximum, maximum }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) setDragHeight(Math.max(minimum, Math.min(drag.current.maximum, drag.current.height + drag.current.y - event.clientY))); }}
      onPointerUp={event => { const current = drag.current; if (!current) return; if (Math.abs(event.clientY - current.y) < 5) { setStop(stop === 2 ? 1 : 2); setDragHeight(null); drag.current = null; return; } const height = Math.max(minimum, Math.min(current.maximum, current.height + current.y - event.clientY)); const stops = [minimum, current.maximum * .42, current.maximum]; setStop(stops.reduce((best, item, index) => Math.abs(item - height) < Math.abs(stops[best] - height) ? index : best, 0)); setDragHeight(null); drag.current = null; }}
      onPointerCancel={() => { setDragHeight(null); drag.current = null; }}><span /></div>
    {overview && <div className="compete-sheet-overview">{overview}</div>}
    <div className="compete-sheet-body" style={{ paddingBottom: 32 + Math.max(0, maximum - (dragHeight ?? (stop === 0 ? minimum : stop === 1 ? maximum * .42 : maximum))) }} inert={stop === 0 && dragHeight === null}>{children}</div>
  </section>;
}
