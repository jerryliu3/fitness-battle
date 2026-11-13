import {
  VITALS_LAB_SYSTEM_PILLS,
  vitalsLabMetricsFromModel,
  type AnalyticsLabModel,
  type VitalsLabCanvasMessage,
  type VitalsLabMetricDisplay,
  type VitalsLabMetricId,
  type VitalsLabSystemId,
} from "@fitness-battle/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
type VitalsLabGender = "male" | "female";
type VitalsLabViewMode = "lumen" | "outline";

export function useVitalsLabController(
  analytics: AnalyticsLabModel | null | undefined,
  appearance: "dark" | "light",
  assetBaseUrl: string,
) {
  const [gender, setGender] = useState<VitalsLabGender>("female");
  const [viewMode, setViewMode] = useState<VitalsLabViewMode>("lumen");
  const [activeMetricId, setActiveMetricId] = useState<VitalsLabMetricId | null>(
    null,
  );
  const [activeSystem, setActiveSystem] = useState<VitalsLabSystemId>("full");
  const [zoom, setZoom] = useState(1);
  const [panY, setPanY] = useState(0);
  const [targetRotY, setTargetRotY] = useState(0);
  const [rotYStepNonce, setRotYStepNonce] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [scanNonce, setScanNonce] = useState(0);
  const scanTriggeredRef = useRef(false);

  const metrics = useMemo(
    () => vitalsLabMetricsFromModel(analytics),
    [analytics],
  );

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
      setAutoOrbit(false);
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

  const selectSystem = useCallback(
    (systemId: VitalsLabSystemId) => {
      const pill =
        VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === systemId) ??
        VITALS_LAB_SYSTEM_PILLS[0]!;
      const targetMetric = pill.defaultMetric
        ? metrics.find((m) => m.id === pill.defaultMetric) ?? null
        : null;
      setActiveSystem(pill.id);
      setActiveMetricId(targetMetric?.id ?? null);
      applyCamera(
        targetMetric ? targetMetric.camera : pill.camera,
      );
    },
    [applyCamera, metrics],
  );

  const stepRotate = useCallback((dir: -1 | 1) => {
    setAutoOrbit(false);
    setTargetRotY((r) => r + dir * (Math.PI / 4));
    setRotYStepNonce((n) => n + 1);
  }, []);

  const setViewAngle = useCallback((rad: number) => {
    setAutoOrbit(false);
    setTargetRotY(rad);
    setRotYStepNonce((n) => n + 1);
  }, []);

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

  const activePill =
    VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === activeSystem) ??
    VITALS_LAB_SYSTEM_PILLS[0]!;

  return {
    metrics,
    leftMetrics: metrics.filter((m) => m.column === "left"),
    rightMetrics: metrics.filter((m) => m.column === "right"),
    gender,
    setGender,
    viewMode,
    setViewMode,
    activeMetricId,
    activeSystem,
    autoOrbit,
    setAutoOrbit,
    autoScan,
    setAutoScan,
    triggerScan,
    selectMetric,
    selectSystem,
    stepRotate,
    setViewAngle,
    canvasModel,
    headline: activeMetric?.fullTitle ?? activePill.headline,
    subline: activeMetric?.delta ?? activePill.subline,
  };
}
