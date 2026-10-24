"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { type LngLat } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";
import type { RouteTimelapseMapProps } from "@/components/routes";

const RouteTimelapseMap = dynamic<RouteTimelapseMapProps>(
  () => import("@/components/routes").then((m) => m.RouteTimelapseMap),
  { ssr: false },
);

export interface RouteSceneMessage {
  type: "set-route" | "play" | "pause" | "seek" | "toggle-mode";
  coordinates?: LngLat[] | string;
  mode?: "3d-flyover" | "2d-overview";
  accentColor?: string;
  durationMs?: number;
  progress?: number;
}

export function RouteScene() {
  const searchParams = useSearchParams();

  // Only render the supplied recorded route.
  const paramPolyline = searchParams.get("polyline") || searchParams.get("route");
  const paramMode = (searchParams.get("mode") as "3d-flyover" | "2d-overview") || "3d-flyover";
  const paramAccent = searchParams.get("accent") || "#f7c948";
  const paramToken = searchParams.get("token") || undefined;

  const [coordinates, setCoordinates] = useState<LngLat[] | string>(
    paramPolyline || "",
  );
  const [mode, setMode] = useState<"3d-flyover" | "2d-overview">(paramMode);
  const [accentColor, setAccentColor] = useState<string>(paramAccent);
  const [durationMs, setDurationMs] = useState(Math.max(1000, Math.min(120000, Number(searchParams.get("duration")) || 12000)));
  const gotMessage = useRef(false);

  function send(data: object) {
    const native = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (s: string) => void };
      }
    ).ReactNativeWebView;
    if (native) native.postMessage(JSON.stringify(data));
    if (window.parent !== window) window.parent.postMessage(data, "*");
  }

  useEffect(() => {
    function receive(event: MessageEvent) {
      let data = event.data;
      try {
        if (typeof data === "string") data = JSON.parse(data);
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;

      const msg = data as RouteSceneMessage;
      gotMessage.current = true;

      if (msg.type === "set-route") {
        if (msg.coordinates) setCoordinates(msg.coordinates);
        if (msg.mode) setMode(msg.mode);
        if (msg.accentColor) setAccentColor(msg.accentColor);
        if (Number.isFinite(msg.durationMs)) setDurationMs(Math.max(1000, Math.min(120000, msg.durationMs!)));
      } else if (msg.type === "toggle-mode") {
        setMode((prev) => (prev === "3d-flyover" ? "2d-overview" : "3d-flyover"));
      }
    }

    window.addEventListener("message", receive);
    send({ type: "route-ready" });
    if (!webEnv.mapboxAccessToken && !paramToken) send({ type: "route-unavailable" });

    const retry = window.setInterval(() => {
      if (gotMessage.current) {
        window.clearInterval(retry);
        return;
      }
      send({ type: "route-ready" });
    }, 500);

    const stop = window.setTimeout(() => window.clearInterval(retry), 8000);

    return () => {
      window.removeEventListener("message", receive);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, []);

  return (
    <div style={{ height: "100dvh", width: "100vw", background: "#142b3b", overflow: "hidden" }}>
      {coordinates.length > 0 ? <RouteTimelapseMap
        coordinates={coordinates}
        key={`${typeof coordinates === "string" ? coordinates : JSON.stringify(coordinates)}:${mode}`}
        mode={mode}
        autoPlay={false}
        durationMs={durationMs}
        units={searchParams.get("units") === "us" ? "us" : "metric"}
        onUnavailable={() => send({ type: "route-unavailable" })}
        accentColor={accentColor}
        mapboxToken={paramToken}
        className="route-scene-map"
        onFinish={() => send({ type: "route-finish" })}
      /> : <p role="status" style={{ color: "white", padding: 24 }}>Preparing your route…</p>}
    </div>
  );
}
