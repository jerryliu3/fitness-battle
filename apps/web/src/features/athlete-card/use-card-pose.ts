"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cardOptics, nearestPose, FLAT_POSE, REST_POSE, type CardPose } from "./card-optics";

/** One short-lived frame loop drives both geometry and reflections. */
export function useCardPose(still: boolean) {
  const [backVisible, setBackVisible] = useState(false);
  const back = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const current = useRef(REST_POSE);
  const target = useRef(REST_POSE);
  const frame = useRef<number | null>(null);
  const followDrag = useRef(false);

  const moveTo = useCallback((next: CardPose, immediate = false) => {
    target.current = next;
    followDrag.current = false;
    const paint = (pose: CardPose) => {
      if (!stage.current) return;
      for (const [key, value] of Object.entries(cardOptics(pose))) stage.current.style.setProperty(key, value);
      const nextBack = Math.cos(pose.x * Math.PI / 180) * Math.cos(pose.y * Math.PI / 180) < 0;
      if (back.current !== nextBack) { back.current = nextBack; setBackVisible(nextBack); }
    };
    if (immediate) {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      current.current = next;
      paint(next);
      return;
    }
    if (frame.current !== null) return;
    let previous = performance.now();
    const tick = (now: number) => {
      const blend = 1 - Math.exp(-Math.min(now - previous, 40) / 65);
      previous = now;
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      const settled = followDrag.current || Math.abs(dx) + Math.abs(dy) < 0.025;
      current.current = settled ? target.current : { x: current.current.x + dx * blend, y: current.current.y + dy * blend };
      paint(current.current);
      frame.current = settled ? null : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  const dragTo = useCallback((next: CardPose) => {
    // Coalesce raw pointer events into the existing frame loop, with no easing
    // behind the finger. The latest target wins before the next paint.
    moveTo(next);
    followDrag.current = true;
  }, [moveTo]);

  useEffect(() => {
    moveTo(still ? FLAT_POSE : nearestPose(current.current, REST_POSE), still);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [moveTo, still]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) moveTo(target.current, true); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [moveTo]);

  return {
    stage, moveTo, dragTo, backVisible, getTarget: () => target.current, getCurrent: () => current.current,
    reset: () => moveTo(nearestPose(current.current, REST_POSE)),
  };
}
