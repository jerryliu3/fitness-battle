"use client";

import {
  VITALS_LAB_METRICS,
  VITALS_LAB_SYSTEM_PILLS,
  parseVitalsLabSceneMessage,
  vitalsLabSystemToHealth,
  type VitalsLabSceneMessage,
} from "@fitness-battle/shared";
import { VitalsBodyRenderer } from "@fitness-battle/pursuit/vitals-body";
import type { VitalsBodyChoreography } from "@fitness-battle/pursuit/vitals-body";
import { useEffect, useMemo, useRef, useState } from "react";

function choreographyFromMessage(
  msg: VitalsLabSceneMessage,
): VitalsBodyChoreography {
  const metric = msg.metricId
    ? VITALS_LAB_METRICS.find((m) => m.id === msg.metricId)
    : undefined;
  const pill = VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === msg.system);
  const cam = metric?.camera ?? pill?.camera ?? { zoom: 1, panY: 0, targetRotY: 0 };
  return {
    distanceMul: cam.zoom,
    targetY: 0.92 + cam.panY * 0.38,
    azimuth: cam.targetRotY,
  };
}

/**
 * Native WebView host for Vitals Lab 3D (Progress → Health Lab).
 */
export function VitalsLabScene() {
  const [msg, setMsg] = useState<VitalsLabSceneMessage | null>(null);
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
      const next = parseVitalsLabSceneMessage(data);
      if (!next) return;
      gotModel.current = true;
      setMsg(next);
    }
    window.addEventListener("message", receive);
    send({ type: "vitals-lab-ready" });
    const retry = window.setInterval(() => {
      if (gotModel.current) {
        window.clearInterval(retry);
        return;
      }
      send({ type: "vitals-lab-ready" });
    }, 500);
    const stop = window.setTimeout(() => window.clearInterval(retry), 8000);
    return () => {
      window.removeEventListener("message", receive);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, []);

  const choreography = useMemo(
    () => (msg ? choreographyFromMessage(msg) : undefined),
    [msg],
  );

  if (!msg) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0a161d",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        Loading body scan…
      </div>
    );
  }

  const zoom =
    msg.system === "movement" ? "lower" : msg.metricId === "sleep" ? "upper" : "full";

  return (
    <div
      style={{
        height: "100dvh",
        background: msg.appearance === "dark" ? "#0a161d" : "#f3f6f7",
        overflow: "hidden",
      }}
    >
      <style>{`canvas{touch-action:none}`}</style>
      <VitalsBodyRenderer
        sex={msg.sex}
        mode={msg.vizMode}
        view={msg.autoOrbit ? "free" : msg.view}
        zoom={zoom}
        system={vitalsLabSystemToHealth(msg.system)}
        appearance={msg.appearance}
        quality="medium"
        choreography={choreography}
        scanToken={msg.scanGeneration}
        autoRotate={msg.autoOrbit}
      />
    </div>
  );
}
