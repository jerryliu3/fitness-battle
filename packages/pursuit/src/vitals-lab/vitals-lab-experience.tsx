"use client";

import {
  VITALS_LAB_SYSTEM_PILLS,
  vitalsLabMetricsFromModel,
  vitalsLabSystemToHealth,
  type VitalsLabMetricDisplay,
  type VitalsLabMetricId,
  type VitalsLabSystemId,
} from "@fitness-battle/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyticsLabModel } from "@fitness-battle/shared";
import { VitalsBodyRenderer } from "../vitals-body/vitals-body-renderer";
import type {
  AppearanceMode,
  BodySex,
  ViewPreset,
  VitalsBodyChoreography,
  VizMode,
} from "../vitals-body/types";
import { VitalsLabChamber } from "./vitals-lab-chamber";
import { VitalsLabSparkline } from "./vitals-lab-sparkline";
import "./vitals-lab-experience.css";

function cameraFromConfig(
  zoom: number,
  panY: number,
  targetRotY: number,
): VitalsBodyChoreography {
  return {
    distanceMul: zoom,
    targetY: 0.92 + panY * 0.38,
    azimuth: targetRotY,
  };
}

export interface VitalsLabExperienceProps {
  embedded?: boolean;
  appearance?: AppearanceMode;
  onAppearanceChange?: (mode: AppearanceMode) => void;
  analytics?: AnalyticsLabModel | null;
  className?: string;
}

export function VitalsLabExperience({
  embedded = false,
  appearance: appearanceProp,
  onAppearanceChange,
  analytics,
  className,
}: VitalsLabExperienceProps) {
  const [appearanceInternal, setAppearanceInternal] =
    useState<AppearanceMode>("dark");
  const appearance = appearanceProp ?? appearanceInternal;
  const setAppearance = onAppearanceChange ?? setAppearanceInternal;

  const metrics = useMemo(
    () => vitalsLabMetricsFromModel(analytics),
    [analytics],
  );

  const [sex, setSex] = useState<BodySex>("male");
  const [vizMode, setVizMode] = useState<VizMode>("cloud");
  const [system, setSystem] = useState<VitalsLabSystemId>("full");
  const [metricId, setMetricId] = useState<VitalsLabMetricId | null>(null);
  const [view, setView] = useState<ViewPreset>("front");
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [scanToken, setScanToken] = useState(1);
  const [scanUiY, setScanUiY] = useState(0);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const native = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (s: string) => void };
      }
    ).ReactNativeWebView;
    native?.postMessage(JSON.stringify({ type: "vitals-lab-ready" }));
  }, []);

  const activePill =
    VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === system) ??
    VITALS_LAB_SYSTEM_PILLS[0]!;

  const activeMetric = metricId
    ? metrics.find((m) => m.id === metricId)
    : undefined;

  const headline =
    activeMetric?.fullTitle ?? activePill.headline;
  const subline = activeMetric?.delta ?? activePill.subline;

  const choreography = useMemo((): VitalsBodyChoreography | undefined => {
    const cam = activeMetric?.camera ?? activePill.camera;
    return cameraFromConfig(cam.zoom, cam.panY, cam.targetRotY);
  }, [activeMetric, activePill]);

  const applyCameraView = useCallback((preset: "front" | "side" | "back") => {
    setAutoOrbit(false);
    setView(preset);
  }, []);

  const triggerScan = useCallback(() => {
    setScanning(true);
    setScanUiY(0);
    setScanToken((t) => t + 1);
  }, []);

  useEffect(() => {
    setScanUiY(0);
    setScanning(true);
    let y = 0;
    let raf = 0;
    const step = () => {
      y += 0.014;
      setScanUiY(y);
      if (y < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setScanning(false);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scanToken]);

  const selectMetric = (id: VitalsLabMetricId) => {
    if (metricId === id) {
      selectSystem("full");
      return;
    }
    const m = metrics.find((item) => item.id === id);
    if (!m) return;
    setMetricId(id);
    setSystem(m.system);
    setView("front");
    triggerScan();
  };

  const selectSystem = (id: VitalsLabSystemId) => {
    const pill = VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === id);
    if (!pill) return;
    setSystem(id);
    setMetricId(pill.defaultMetric);
    if (id === "full") {
      setView("front");
    }
    triggerScan();
  };

  const renderMetricCard = (m: VitalsLabMetricDisplay) => {
    const active = metricId === m.id;
    const accent = appearance === "dark" ? m.colorDark : m.colorLight;
    return (
      <button
        key={m.id}
        type="button"
        className={`vitals-lab__metric${active ? " vitals-lab__metric--active" : ""}`}
        onClick={() => selectMetric(m.id)}
        aria-pressed={active}
      >
        <div className="vitals-lab__metric-label">{m.label}</div>
        <div>
          <span className="vitals-lab__metric-value">{m.value}</span>
          {m.unit ? (
            <span className="vitals-lab__metric-unit">{m.unit}</span>
          ) : null}
        </div>
        <div className="vitals-lab__metric-status">{m.status}</div>
        <VitalsLabSparkline
          data={m.sparkline}
          color={accent}
          active={active}
        />
      </button>
    );
  };

  const left = metrics.filter((m) => m.column === "left");
  const right = metrics.filter((m) => m.column === "right");

  return (
    <section
      className={[
        "vitals-lab",
        appearance === "light" ? "vitals-lab--light" : "",
        embedded ? "vitals-lab--embedded" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-appearance={appearance}
      aria-label="Vitals Lab body scan"
    >
      <header className="vitals-lab__head">
        <div>
          <div className="vitals-lab__kicker">Overtaek / Vitals Lab</div>
          <h1 className="vitals-lab__title">Your health lab.</h1>
        </div>
        <div className="vitals-lab__actions">
          <button
            type="button"
            className="vitals-lab__icon-btn"
            aria-label={
              appearance === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            onClick={() =>
              setAppearance(appearance === "dark" ? "light" : "dark")
            }
          >
            {appearance === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <div className="vitals-lab__meta">
        <span>Overnight vitals · body scan</span>
        <button type="button" onClick={triggerScan}>
          <span className="vitals-lab__meta-dot" />
          Run scan
        </button>
      </div>

      <div className="vitals-lab__segbar" role="tablist" aria-label="Body model">
        <div className="vitals-lab__segpair">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={sex === g}
              className={`vitals-lab__seg${sex === g ? " vitals-lab__seg--active" : ""}`}
              onClick={() => setSex(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="vitals-lab__segpair">
          {(
            [
              ["cloud", "lumen"],
              ["outline", "outline"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={vizMode === mode}
              className={`vitals-lab__seg${vizMode === mode ? " vitals-lab__seg--active" : ""}`}
              onClick={() => setVizMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="vitals-lab__stage">
        <VitalsLabChamber
          appearance={appearance}
          scanY={scanUiY}
          scanning={scanning}
        />
        <VitalsBodyRenderer
          className="vitals-lab__renderer"
          sex={sex}
          mode={vizMode}
          view={autoOrbit ? "free" : view}
          zoom={
            system === "movement" || metricId === "active"
              ? "lower"
              : metricId === "sleep" || metricId === "hrv"
                ? "upper"
                : "full"
          }
          system={vitalsLabSystemToHealth(system)}
          appearance={appearance}
          quality="medium"
          choreography={choreography}
          scanToken={scanToken}
          autoRotate={autoOrbit}
          tuning={{
            particleScale: vizMode === "outline" ? 0.16 : 0.2,
            opacity: vizMode === "outline" ? 0.72 : 0.58,
            brightness: appearance === "dark" ? 0.95 : 0.88,
            glow: appearance === "dark" ? 0.52 : 0.38,
            edgeLight: 0.7,
          }}
          onScanComplete={() => setScanning(false)}
        />

        <div className="vitals-lab__hud">
          <div className="vitals-lab__col">{left.map(renderMetricCard)}</div>
          <div className="vitals-lab__col">
            {metricId ? (
              <button
                type="button"
                className="vitals-lab__reset"
                onClick={() => selectSystem("full")}
              >
                Reset zoom
              </button>
            ) : null}
          </div>
          <div className="vitals-lab__col">{right.map(renderMetricCard)}</div>
        </div>

        <div className="vitals-lab__camera">
          <button type="button" aria-label="Rotate left" onClick={() => setView("free")}>
            ⟲
          </button>
          <div className="vitals-lab__camera-views">
            {(["front", "side", "back"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={!autoOrbit && view === v ? "active" : ""}
                onClick={() => applyCameraView(v)}
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              className={`vitals-lab__orbit${autoOrbit ? " vitals-lab__orbit--on" : ""}`}
              onClick={() => setAutoOrbit((o) => !o)}
            >
              360°
            </button>
          </div>
          <button type="button" aria-label="Rotate right" onClick={() => setView("free")}>
            ⟳
          </button>
        </div>
      </div>

      <footer className="vitals-lab__drawer">
        <div className="vitals-lab__drawer-kicker">
          {activeMetric?.status ?? "Balanced"} / {vizMode === "cloud" ? "lumen" : "outline"}
        </div>
        <h2>{headline}</h2>
        <p>{subline}</p>
        <div className="vitals-lab__pills" role="tablist" aria-label="Body systems">
          {VITALS_LAB_SYSTEM_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={system === pill.id}
              className={`vitals-lab__pill${system === pill.id ? " vitals-lab__pill--active" : ""}`}
              onClick={() => selectSystem(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </footer>
    </section>
  );
}
