"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  parseArenaSceneMessage,
  type ArenaSceneMessage,
} from "@fitness-battle/shared";
import { defaultLook } from "@/features/field/avatar";
import "@/features/field/field.css";

const Scene = dynamic(
  () =>
    import("@/features/field/components/live-pursuit").then(
      (m) => m.LivePursuit,
    ),
  { ssr: false },
);

function parentOrigin(): string {
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    /* ignore bad referrer */
  }
  return window.location.origin;
}

function send(data: object) {
  const native = (
    window as unknown as {
      ReactNativeWebView?: { postMessage: (s: string) => void };
    }
  ).ReactNativeWebView;
  if (native) native.postMessage(JSON.stringify(data));
  else if (window.parent !== window)
    window.parent.postMessage(data, parentOrigin());
}

export function ArenaScene() {
  const [model, setModel] = useState<ArenaSceneMessage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    function receive(event: MessageEvent) {
      const native = !!(window as unknown as { ReactNativeWebView?: unknown })
        .ReactNativeWebView;
      if (!native) {
        if (event.source !== window.parent) return;
        if (event.origin !== parentOrigin() && event.origin !== window.location.origin)
          return;
      }
      let data = event.data;
      try {
        if (typeof data === "string") data = JSON.parse(data);
      } catch {
        return;
      }
      const m = parseArenaSceneMessage(data);
      if (m) setModel(m);
    }
    window.addEventListener("message", receive);
    send({ type: "arena-ready" });
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <div
      style={{ height: "100dvh", background: "#edf2e8", overflow: "hidden" }}
      className="embedded-arena"
    >
      <style>{`.embedded-arena .fd-live-world{height:100dvh;min-height:100dvh}.embedded-arena .fd-world-label{background:#fffffff0;color:#26382d;border:1px solid #dce3d7;border-radius:10px}.embedded-arena canvas{touch-action:none}`}</style>
      {error ? (
        <p>3D is unavailable. Switch to 2D lanes.</p>
      ) : model ? (
        <Scene
          runners={model.lanes
            .filter((l) => !l.ghost)
            .map((l) => ({ ...l, series: [0, l.value] }))}
          ghost={(() => {
            const g = model.lanes.find((l) => l.ghost);
            return g ? { ...g, series: [0, g.value] } : null;
          })()}
          time={1}
          extra={0}
          selected={model.selected}
          showGhost={true}
          camera="above"
          look={defaultLook}
          unit={model.unit}
          view={model.view}
          onPan={(center) => send({ type: "arena-pan", center })}
          onSelect={(id) => send({ type: "arena-selected", id })}
          onUnavailable={() => {
            setError(true);
            send({ type: "arena-unavailable" });
          }}
        />
      ) : (
        <p style={{ padding: 24, color: "#768172", fontFamily: "sans-serif" }}>
          Preparing your lanes…
        </p>
      )}
    </div>
  );
}
