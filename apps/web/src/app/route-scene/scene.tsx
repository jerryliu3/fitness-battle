"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { DEFAULT_SAMPLE_ROUTE, type LngLat } from "@fitness-battle/shared";
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

  // Read initial params from query or default to sample route
  const paramPolyline = searchParams.get("polyline") || searchParams.get("route");
  const paramMode = (searchParams.get("mode") as "3d-flyover" | "2d-overview") || "3d-flyover";
  const paramAccent = searchParams.get("accent") || "#f7c948";
  const paramToken = searchParams.get("token") || undefined;

  const [coordinates, setCoordinates] = useState<LngLat[] | string>(
    paramPolyline || DEFAULT_SAMPLE_ROUTE.summaryPolyline,
  );
  const [mode, setMode] = useState<"3d-flyover" | "2d-overview">(paramMode);
  const [accentColor, setAccentColor] = useState<string>(paramAccent);
  const gotMessage = useRef(false);

  function send(data: object) {
    const native = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (s: string) => void };
      }
    ).ReactNativeWebView;
    if (native) {
      native.postMessage(JSON.stringify(data));
    }
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
      } else if (msg.type === "toggle-mode") {
        setMode((prev) => (prev === "3d-flyover" ? "2d-overview" : "3d-flyover"));
      }
    }

    window.addEventListener("message", receive);
    send({ type: "route-ready" });

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
      <RouteTimelapseMap
        coordinates={coordinates}
        mode={mode}
        accentColor={accentColor}
        mapboxToken={paramToken}
        className="h-full w-full rounded-none border-none"
        onFinish={() => send({ type: "route-finish" })}
      />
    </div>
  );
}
