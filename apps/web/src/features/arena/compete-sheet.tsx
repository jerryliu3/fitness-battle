"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./compete-sheet.css";

export function CompeteSheet({ children, active, expandRequest = 0 }: { children: ReactNode; active: boolean; expandRequest?: number }) {
  const [stop, setStop] = useState(1);
  useEffect(() => { if (expandRequest) setStop(2); }, [expandRequest]);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ y: number; height: number; maximum: number } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const visible = dragHeight !== null ? `${dragHeight}px` : stop === 0 ? "76px" : stop === 1 ? "42%" : "100%";
  return <section onKeyDown={event => { if (event.key === "Escape") setStop(0); }} ref={sheet} className="compete-sheet" data-active={active} aria-label="Competition standings and events" data-stop={stop} inert={!active}
    style={{ visibility: active ? "visible" : "hidden", transform: `translateY(calc(100% - ${visible}))`, transition: dragHeight !== null ? "none" : undefined }}>
    <div className="compete-sheet-grip" role="slider" tabIndex={0} aria-label="Competition sheet height" aria-valuemin={0} aria-valuemax={2} aria-valuenow={stop} aria-valuetext={["Minimized", "Partially expanded", "Fully expanded"][stop]}
      onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setStop(value => Math.max(0, Math.min(2, value + (event.key === "ArrowUp" ? 1 : -1)))); } }}
      onPointerDown={event => { const maximum = sheet.current?.offsetHeight ?? 0; drag.current = { y: event.clientY, height: stop === 0 ? 76 : stop === 1 ? maximum * .42 : maximum, maximum }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) setDragHeight(Math.max(76, Math.min(drag.current.maximum, drag.current.height + drag.current.y - event.clientY))); }}
      onPointerUp={event => { const current = drag.current; if (!current) return; if (Math.abs(event.clientY - current.y) < 5) { setStop(stop === 2 ? 1 : 2); setDragHeight(null); drag.current = null; return; } const height = Math.max(76, Math.min(current.maximum, current.height + current.y - event.clientY)); const stops = [76, current.maximum * .42, current.maximum]; setStop(stops.reduce((best, item, index) => Math.abs(item - height) < Math.abs(stops[best] - height) ? index : best, 0)); setDragHeight(null); drag.current = null; }}
      onPointerCancel={() => { setDragHeight(null); drag.current = null; }}><span /></div>
    <div className="compete-sheet-heading"><strong>Standings</strong></div>
    <div className="compete-sheet-body" inert={stop === 0 && dragHeight === null}>{children}</div>
  </section>;
}
