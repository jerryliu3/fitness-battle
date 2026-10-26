"use client";

import { useEffect, useRef, type RefObject, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { fieldZoomSpan, type ArenaViewWindow } from "@fitness-battle/shared";

interface Point { x: number; y: number }
export interface FieldGestureFrame {
  from: Point;
  to: Point;
  view: ArenaViewWindow;
  span: number;
  lateral: number;
  pinching: boolean;
}

/** All fingers belong to one gesture. Rebase when fingers join/leave; publish once per frame. */
export function useFieldGestures(options: {
  view: ArenaViewWindow;
  unit: string;
  lateral: () => number;
  enabled: boolean;
  onStart?: () => void;
  onMove: (frame: FieldGestureFrame) => { view: ArenaViewWindow; lateral: number } | void;
  onTap?: (event: ReactPointerEvent<SVGSVGElement>, target: EventTarget | null) => void;
  surface?: RefObject<SVGSVGElement | null>;
}) {
  const latest = useRef(options); latest.current = options;
  const points = useRef(new Map<number, Point>());
  const origin = useRef<{ point: Point; distance: number; view: ArenaViewWindow; lateral: number } | null>(null);
  const moved = useRef(false);
  const tapTarget = useRef<EventTarget | null>(null);
  const handledTap = useRef(false);
  const displayed = useRef<{ view: ArenaViewWindow; lateral: number } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<FieldGestureFrame | null>(null);
  const sample = () => {
    const [a, b] = [...points.current.values()];
    return a ? { point: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a, distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 } : null;
  };
  const flush = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const next = pending.current; pending.current = null;
    if (next) displayed.current = latest.current.onMove(next) ?? null;
  };
  const rebase = () => {
    const s = sample(), p = latest.current;
    origin.current = s ? { ...s, view: displayed.current?.view ?? p.view, lateral: displayed.current?.lateral ?? p.lateral() } : null;
  };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  useEffect(() => {
    const node = latest.current.surface?.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      const p = latest.current;
      if (!p.enabled && !event.ctrlKey) return;
      event.preventDefault();
      if (pending.current?.pinching !== event.ctrlKey) flush();
      const pixels = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1;
      const from = { x: event.clientX, y: event.clientY };
      if (!pending.current) {
        p.onStart?.();
        pending.current = { from, to: { ...from }, view: p.view, span: p.view.span, lateral: p.lateral(), pinching: event.ctrlKey };
      }
      const next = pending.current;
      if (event.ctrlKey) next.span = fieldZoomSpan(next.span * Math.exp(event.deltaY * pixels * .008), p.unit);
      else { next.to.x -= event.deltaX * pixels; next.to.y += event.deltaY * pixels; }
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  const finish = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
    if (!points.current.has(e.pointerId)) return;
    flush();
    points.current.delete(e.pointerId);
    if (!points.current.size) {
      if (!cancelled && !moved.current) { latest.current.onTap?.(e, tapTarget.current); handledTap.current = Boolean(latest.current.onTap); }
      origin.current = null;
    } else rebase();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return {
    onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      if (!points.current.size) { moved.current = false; handledTap.current = false; displayed.current = null; tapTarget.current = e.target; latest.current.onStart?.(); }
      flush();
      points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.current.size > 1) moved.current = true;
      rebase();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!points.current.has(e.pointerId) || !origin.current) return;
      points.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = sample()!, d = origin.current, p = latest.current;
      const dx = s.point.x - d.point.x, dy = s.point.y - d.point.y;
      const pinching = points.current.size > 1;
      if (!moved.current && Math.hypot(dx, dy) < 4) return;
      if (!p.enabled && !pinching && e.pointerType === "touch" && Math.abs(dy) > Math.abs(dx) * 1.3) return;
      moved.current = true;
      pending.current = { from: d.point, to: s.point, view: d.view, span: pinching && s.distance > 0 && d.distance > 0 ? fieldZoomSpan(d.view.span * d.distance / s.distance, p.unit) : d.view.span, lateral: d.lateral, pinching };
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => finish(e, false),
    onPointerCancel: (e: ReactPointerEvent<SVGSVGElement>) => finish(e, true),
    onLostPointerCapture: (e: ReactPointerEvent<SVGSVGElement>) => finish(e, true),
    onClickCapture: (e: ReactMouseEvent<SVGSVGElement>) => { if (e.detail !== 0 && (moved.current || handledTap.current)) { e.preventDefault(); e.stopPropagation(); } },
  };
}
