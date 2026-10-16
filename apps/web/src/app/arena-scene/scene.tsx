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

function isNativeBridge() {
  return !!(window as unknown as { ReactNativeWebView?: unknown })
    .ReactNativeWebView;
}

function send(data: object, targetOrigin = "*") {
  const native = (
    window as unknown as {
      ReactNativeWebView?: { postMessage: (s: string) => void };
    }
  ).ReactNativeWebView;
  if (native) native.postMessage(JSON.stringify(data));
  else if (window.parent !== window)
    window.parent.postMessage(data, targetOrigin);
}

export function ArenaScene() {
  const [model, setModel] = useState<ArenaSceneMessage | null>(null);
  const [error, setError] = useState(false);
  const [parent, setParent] = useState<string | null>(null);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!isNativeBridge()) {
        if (event.source !== window.parent) return;
        // Learn the embedder origin from the first valid parent message.
        if (!parent && event.origin) setParent(event.origin);
        else if (parent && event.origin !== parent) return;
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
    send({ type: "arena-ready" }, parent ?? "*");
    return () => window.removeEventListener("message", receive);
  }, [parent]);
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
          onPan={(center) => send({ type: "arena-pan", center }, parent ?? "*")}
          onSelect={(id) =>
            send({ type: "arena-selected", id }, parent ?? "*")
          }
          onUnavailable={() => {
            setError(true);
            send({ type: "arena-unavailable" }, parent ?? "*");
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
