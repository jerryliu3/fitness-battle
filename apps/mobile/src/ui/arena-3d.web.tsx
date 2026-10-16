import { createElement, useEffect, useRef } from "react";
import { mobileEnv } from "../lib/env";
import type { Arena3DProps } from "./arena-3d";
export function Arena3D({
  model,
  onSelect,
  onPan,
  onUnavailable,
}: Arena3DProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const origin = new URL(mobileEnv.apiUrl).origin;
  const latest = useRef({ model, onSelect, onPan, onUnavailable });
  latest.current = { model, onSelect, onPan, onUnavailable };
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== ref.current?.contentWindow ||
        event.origin !== origin
      )
        return;
      const m = event.data;
      const p = latest.current;
      if (m?.type === "arena-ready") {
        ready.current = true;
        ref.current?.contentWindow?.postMessage(p.model, origin);
      }
      if (
        m?.type === "arena-selected" &&
        p.model.lanes.some((l) => l.id === m.id)
      )
        p.onSelect(m.id);
      if (m?.type === "arena-pan" && Number.isFinite(m.center))
        p.onPan(Math.max(0, m.center));
      if (m?.type === "arena-unavailable") p.onUnavailable();
    };
    const timeout = setTimeout(() => {
      if (!ready.current) latest.current.onUnavailable();
    }, 12000);
    window.addEventListener("message", receive);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, [origin]);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage(model, origin);
  }, [model, origin]);
  return createElement("iframe", {
    ref,
    src: `${origin}/arena-scene`,
    title: "3D athlete lanes",
    style: {
      height: 520,
      width: "100%",
      border: 0,
      borderRadius: 20,
      background: "#edf2e8",
    },
    onLoad: () =>
      ref.current?.contentWindow?.postMessage(latest.current.model, origin),
    onError: onUnavailable,
  });
}
