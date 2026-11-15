"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BootLoadingContext, BootOpenedContext, useBootCover, useBootRequests } from "./boot-readiness";

/** Mount the application first, then uncover its committed content and assets. */
export function ApplicationBootGate({ ready, splash, children }: {
  ready: boolean;
  splash: ReactNode;
  children: ReactNode;
}) {
  const { pending, report } = useBootRequests();
  const [opened, setOpened] = useState(false);
  useBootCover(!opened);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (opened || !ready || pending) return;
    let cancelled = false;
    let frame = 0;
    const cleanups: (() => void)[] = [];
    // Effects can start requests and insert images after the first commit.
    frame = requestAnimationFrame(() => {
      const images = Array.from(content.current?.querySelectorAll("img") ?? []);
      const assets = images.filter(image => !image.complete && image.loading !== "lazy").map(image => new Promise<void>(resolve => {
        const finish = () => { cleanup(); resolve(); };
        const cleanup = () => {
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
        };
        cleanups.push(cleanup);
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        if (image.complete) finish();
      }));
      void Promise.all([document.fonts?.ready, ...assets]).then(() => {
        if (!cancelled) frame = requestAnimationFrame(() => setOpened(true));
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanups.forEach(cleanup => cleanup());
    };
  }, [opened, ready, pending]);
  return <BootLoadingContext.Provider value={report}>
    <BootOpenedContext.Provider value={opened}>
      <div ref={content} inert={!opened} aria-hidden={!opened} style={opened ? undefined : { visibility: "hidden" }}>{children}</div>
      {!opened && <div style={{ position: "fixed", inset: 0, zIndex: 10000, overflow: "auto" }}>{splash}</div>}
    </BootOpenedContext.Provider>
  </BootLoadingContext.Provider>;
}
