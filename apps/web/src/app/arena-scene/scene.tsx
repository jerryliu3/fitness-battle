"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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

/**
 * Parent ↔ child handshake for the embedded Arena 3D page.
 *
 * Native WebView never uses window.postMessage target origins — it goes
 * through ReactNativeWebView.postMessage / injectJavaScript.
 *
 * Expo web embeds this page in a cross-origin iframe. The child does not
 * know the parent's origin until the parent posts the first valid model.
 * So `arena-ready` may use targetOrigin "*" until that parse succeeds
 * (browser requirement when the peer origin is unknown). Ready is retried
 * briefly so a missed first ping cannot leave the iframe blank. After a
 * successfully parsed parent message, replies lock to that origin.
 */
export function ArenaScene() {
  const [model, setModel] = useState<ArenaSceneMessage | null>(null);
  const [error, setError] = useState(false);
  const parentOrigin = useRef<string | null>(null);
  const gotModel = useRef(false);

  function send(data: object) {
    const native = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (s: string) => void };
      }
    ).ReactNativeWebView;
    if (native) {
      native.postMessage(JSON.stringify(data));
      return;
    }
    if (window.parent !== window) {
      window.parent.postMessage(data, parentOrigin.current ?? "*");
    }
  }

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!isNativeBridge()) {
        if (event.source !== window.parent) return;
      }
      let data = event.data;
      try {
        if (typeof data === "string") data = JSON.parse(data);
      } catch {
        return;
      }
      const next = parseArenaSceneMessage(data);
      if (!next) return;
      if (!isNativeBridge()) {
        if (!parentOrigin.current) parentOrigin.current = event.origin;
        else if (event.origin !== parentOrigin.current) return;
      }
      gotModel.current = true;
      setModel(next);
    }
    window.addEventListener("message", receive);
    // Ping until the parent delivers a model (covers a missed first ready).
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
