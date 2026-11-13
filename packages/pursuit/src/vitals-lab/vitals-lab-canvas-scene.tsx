import { VitalsLabThreeViewport } from "./vitals-lab-three";
import {
  parseVitalsLabCanvasMessage,
  type VitalsLabCanvasMessage,
} from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";

/**
 * Canvas-only host for native WebView bridges (Next `/vitals-lab-canvas` or bundled `index.html`).
 */
export function VitalsLabCanvasScene() {
  const [model, setModel] = useState<VitalsLabCanvasMessage | null>(null);
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
      const next = parseVitalsLabCanvasMessage(data);
      if (!next) return;
      gotModel.current = true;
      setModel(next);
    }
    window.addEventListener("message", receive);
    send({ type: "vitals-lab-canvas-ready" });
    const retry = window.setInterval(() => {
      if (gotModel.current) {
        window.clearInterval(retry);
        return;
      }
      send({ type: "vitals-lab-canvas-ready" });
    }, 500);
    const stop = window.setTimeout(() => window.clearInterval(retry), 8000);
    return () => {
      window.removeEventListener("message", receive);
      window.clearInterval(retry);
      window.clearTimeout(stop);
    };
  }, []);

  if (!model) {
    return (
      <div
        style={{
          height: "100dvh",
          background: "#0a161d",
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: "100dvh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: model.appearance === "dark" ? "#0a161d" : "#f3f6f7",
      }}
    >
      <style>{`canvas{touch-action:none}`}</style>
      <VitalsLabThreeViewport
        appearance={model.appearance}
        gender={model.gender}
        viewMode={model.viewMode}
        activeMetric={model.activeMetric}
        activeSystem={model.activeSystem}
        zoom={model.zoom}
        panY={model.panY}
        targetRotY={model.targetRotY}
        rotYStepNonce={model.rotYStepNonce}
        autoOrbit={model.autoOrbit}
        scanNonce={model.scanNonce}
        scanEnabled={model.scanEnabled}
        anchor3D={model.anchor3D}
        assetBaseUrl={model.assetBaseUrl}
      />
    </div>
  );
}
