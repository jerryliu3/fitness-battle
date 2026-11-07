"use client";
import { useLayoutEffect, useRef } from "react";
export type PreviewFrame = { x: number; y: number; width: number; height: number };
export function CoursePreview({ sport, queued, onFrame }: { sport: string; queued: boolean; onFrame(sport: string, frame: PreviewFrame): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => { const rect = ref.current?.getBoundingClientRect(); if (rect) onFrame(sport, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }); };
    const observer = new ResizeObserver(measure); if (ref.current) observer.observe(ref.current);
    measure(); window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [sport, onFrame]);
  return <div ref={ref} className="compete-event-preview">{queued ? <small>Course assigned when your wave starts</small> : null}</div>;
}
