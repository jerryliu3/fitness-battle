"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  parseArenaSceneMessage,
  type ArenaSceneMessage,
} from "@fitness-battle/shared";
import { defaultLook } from "@fitness-battle/pursuit";

const Scene = dynamic(
  () => import("@fitness-battle/pursuit").then((m) => m.LivePursuit),
  { ssr: false },
);

/**
 * Native-only host page for Arena 3D.
 *
 * Expo web renders LivePursuit in-process (no iframe). Native WebView loads
 * this route and talks through ReactNativeWebView.postMessage / injectJavaScript
 * — never window.postMessage target origins.
 */
export function ArenaScene() {
  const [model, setModel] = useState<ArenaSceneMessage | null>(null);
  const [error, setError] = useState(false);
  const gotModel = useRef(false);

  function send(data: object) {
    const native = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (s: string) => void };
      }
    ).ReactNativeWebView;
    if (native) native.postMessage(JSON.stringify(data));
  }

  useEffect(() => {
    function receive(event: MessageEvent) {
      let data = event.data;
      try {
        if (typeof data === "string") data = JSON.parse(data);
      } catch {
        return;
      }
      const next = parseArenaSceneMessage(data);
      if (!next) return;
      gotModel.current = true;
      setModel(next);
    }
    window.addEventListener("message", receive);
    send({ type: "arena-ready" });
    const retry = window.setInterval(() => {
      if (gotModel.current) {
        window.clearInterval(retry);
        return;
      }
      send({ type: "arena-ready" });
    }, 500);
    const stop = window.setTimeout(() => window.clearInterval(retry), 8000);
    return () => {
      window.removeEventListener("message", receive);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
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
