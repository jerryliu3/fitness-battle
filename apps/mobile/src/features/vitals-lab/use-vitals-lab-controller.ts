import {
  VITALS_LAB_SYSTEM_PILLS,
  type VitalsLabCanvasMessage,
  type VitalsLabMetricDisplay,
  type VitalsLabMetricId,
  type VitalsLabSystemId,
} from "@fitness-battle/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type VitalsLabGender = "male" | "female";
type VitalsLabViewMode = "lumen" | "outline";

export function useVitalsLabController(
  metrics: VitalsLabMetricDisplay[],
  appearance: "dark" | "light",
  assetBaseUrl: string,
) {
  const [gender] = useState<VitalsLabGender>("female");
  const [viewMode] = useState<VitalsLabViewMode>("lumen");
  const [activeMetricId, setActiveMetricId] = useState<VitalsLabMetricId | null>(
    null,
  );
  const [activeSystem, setActiveSystem] = useState<VitalsLabSystemId>("full");
  const [zoom, setZoom] = useState(1);
  const [panY, setPanY] = useState(0);
  const [targetRotY, setTargetRotY] = useState(0);
  const [rotYStepNonce, setRotYStepNonce] = useState(0);
  const [autoOrbit] = useState(false);
  const [autoScan] = useState(true);
  const [scanNonce, setScanNonce] = useState(0);
  const scanTriggeredRef = useRef(false);

  const activeMetric = useMemo(
    () => metrics.find((m) => m.id === activeMetricId) ?? null,
    [metrics, activeMetricId],
  );

  const triggerScan = useCallback(() => {
    setScanNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!scanTriggeredRef.current) {
      scanTriggeredRef.current = true;
      triggerScan();
    }
  }, [triggerScan]);

  useEffect(() => {
    if (!autoScan) return;
    const id = setInterval(triggerScan, 10_000);
    return () => clearInterval(id);
  }, [autoScan, triggerScan]);

  const applyCamera = useCallback(
    (camera: { zoom: number; panY: number; targetRotY: number }) => {
      setZoom(camera.zoom);
      setPanY(camera.panY);
      setTargetRotY(camera.targetRotY);
      setRotYStepNonce((n) => n + 1);
      triggerScan();
    },
    [triggerScan],
  );

  const selectMetric = useCallback(
    (metric: VitalsLabMetricDisplay) => {
      if (!metric.value) return;
      if (activeMetricId === metric.id) {
        setActiveMetricId(null);
        setActiveSystem("full");
        applyCamera({ zoom: 1, panY: 0, targetRotY: 0 });
        return;
      }
      setActiveMetricId(metric.id);
      setActiveSystem(metric.system);
      applyCamera(metric.camera);
    },
    [activeMetricId, applyCamera],
  );

  const canvasModel: VitalsLabCanvasMessage = useMemo(
    () => ({
      type: "vitals-lab-canvas",
      appearance,
      gender,
      viewMode,
      activeMetric: activeMetricId,
      activeSystem,
      zoom,
      panY,
      targetRotY,
      rotYStepNonce,
      autoOrbit,
      scanNonce,
      scanEnabled: autoScan,
      anchor3D: activeMetric?.anchor3D ?? null,
      assetBaseUrl,
    }),
    [
      appearance,
      gender,
      viewMode,
      activeMetricId,
      activeSystem,
      zoom,
      panY,
      targetRotY,
      rotYStepNonce,
      autoOrbit,
      scanNonce,
      autoScan,
      activeMetric,
      assetBaseUrl,
    ],
  );

  return {
    metrics,
    leftMetrics: metrics.filter((m) => m.column === "left"),
    rightMetrics: metrics.filter((m) => m.column === "right"),
    activeMetricId,
    selectMetric,
    canvasModel,
  };
}
