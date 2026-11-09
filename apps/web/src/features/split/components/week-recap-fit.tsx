"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Measure natural content, not its transformed size, so fitting cannot feed back. */
export function WeekRecapFit({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = frame.current!, inner = content.current!;
    const fit = () => {
      // Do not undo a user's explicit larger-text setting by shrinking it again.
      const largeText = parseFloat(getComputedStyle(document.documentElement).fontSize) > 20;
      outer.classList.toggle("is-large-text", largeText);
      if (largeText) {
        inner.style.transform = "none";
        inner.style.top = "0";
        return;
      }
      const scale = Math.min(1, outer.clientHeight / Math.max(1, inner.offsetHeight));
      inner.style.transform = `scale(${scale})`;
      inner.style.top = `${Math.max(0, (outer.clientHeight - inner.offsetHeight * scale) / 2)}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    fit();
    return () => observer.disconnect();
  }, []);
  return <div className="week-recap-fit" ref={frame}><div className="week-recap-fit-inner" ref={content}>{children}</div></div>;
}
