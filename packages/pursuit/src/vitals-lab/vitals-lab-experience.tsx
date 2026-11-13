"use client";

import type { AnalyticsLabModel } from "@fitness-battle/shared";
import {
  VITALS_LAB_SYSTEM_PILLS,
  type VitalsLabMetricDisplay,
  type VitalsLabMetricId,
  type VitalsLabSystemId,
  vitalsLabMetricsFromModel,
} from "@fitness-battle/shared";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VitalsLabSparkline } from "./vitals-lab-sparkline";
import {
  type VitalsLabGender,
  type VitalsLabProjectedPoint,
  type VitalsLabViewMode,
  VitalsLabThreeViewport,
} from "./vitals-lab-three";
import "./vitals-lab-experience.css";

export interface VitalsLabExperienceProps {
  analytics?: AnalyticsLabModel | null;
  appearance?: "dark" | "light";
  embedded?: boolean;
  assetBaseUrl?: string;
  onAppearanceChange?: (appearance: "dark" | "light") => void;
}

const ANGLE_PRESETS = [
  { id: "front", label: "Front", rad: 0 },
  { id: "side", label: "Side", rad: Math.PI / 2 },
  { id: "back", label: "Back", rad: Math.PI },
] as const;

function normalizeAngleDiff(a: number, b: number): number {
  const twoPi = Math.PI * 2;
  let d = ((a - b) % twoPi + twoPi) % twoPi;
  if (d > Math.PI) d -= twoPi;
  return Math.abs(d);
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function ScanLineIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

function RotateCcwIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RotateCwIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function VitalsLabExperience({
  analytics = null,
  appearance: appearanceProp = "dark",
  embedded = false,
  assetBaseUrl = "",
  onAppearanceChange,
}: VitalsLabExperienceProps) {
  const [appearance, setAppearance] = useState<"dark" | "light">(appearanceProp);
  const [gender, setGender] = useState<VitalsLabGender>("female");
  const [viewMode, setViewMode] = useState<VitalsLabViewMode>("lumen");
  const [activeMetricId, setActiveMetricId] = useState<VitalsLabMetricId | null>(null);
  const [activeSystem, setActiveSystem] = useState<VitalsLabSystemId>("full");
  const [labNoteOpen, setLabNoteOpen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [panY, setPanY] = useState(0);
  const [targetRotY, setTargetRotY] = useState(0);
  const [liveRotY, setLiveRotY] = useState(0);
  const [rotYStepNonce, setRotYStepNonce] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(false);

  const [scanNonce, setScanNonce] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setAppearance(appearanceProp);
  }, [appearanceProp]);

  const metrics = useMemo(() => vitalsLabMetricsFromModel(analytics), [analytics]);
  const leftMetrics = useMemo(
    () => metrics.filter((m) => m.column === "left").sort((a, b) => a.row - b.row),
    [metrics],
  );
  const rightMetrics = useMemo(
    () => metrics.filter((m) => m.column === "right").sort((a, b) => a.row - b.row),
    [metrics],
  );

  const activeMetric = useMemo<VitalsLabMetricDisplay | null>(
    () => metrics.find((m) => m.id === activeMetricId) ?? null,
    [metrics, activeMetricId],
  );

  const activeSystemPill = useMemo(
    () =>
      VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === activeSystem) ??
      VITALS_LAB_SYSTEM_PILLS[0],
    [activeSystem],
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Partial<Record<VitalsLabMetricId, HTMLButtonElement | null>>>({});
  const cardAnchorRef = useRef<{ x: number; y: number } | null>(null);

  const tetherSvgRef = useRef<SVGSVGElement | null>(null);
  const tetherLineRef = useRef<SVGPolylineElement | null>(null);
  const tetherHaloRef = useRef<SVGCircleElement | null>(null);
  const tetherAnchorDotRef = useRef<SVGCircleElement | null>(null);
  const tetherCardDotRef = useRef<SVGCircleElement | null>(null);

  const recomputeCardAnchor = useCallback(() => {
    if (!activeMetric || !stageRef.current) {
      cardAnchorRef.current = null;
      return;
    }
    const cardEl = cardRefs.current[activeMetric.id];
    if (!cardEl) {
      cardAnchorRef.current = null;
      return;
    }
    const stageRect = stageRef.current.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const x =
      activeMetric.column === "left"
        ? cardRect.right - stageRect.left
        : cardRect.left - stageRect.left;
    const y = cardRect.top + cardRect.height * 0.5 - stageRect.top;
    cardAnchorRef.current = { x, y };
  }, [activeMetric]);

  useEffect(() => {
    recomputeCardAnchor();
    const id = requestAnimationFrame(recomputeCardAnchor);
    window.addEventListener("resize", recomputeCardAnchor);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", recomputeCardAnchor);
    };
  }, [recomputeCardAnchor]);

  const handleProjectAnchor = useCallback((pt: VitalsLabProjectedPoint | null) => {
    const svg = tetherSvgRef.current;
    const line = tetherLineRef.current;
    const halo = tetherHaloRef.current;
    const anchorDot = tetherAnchorDotRef.current;
    const cardDot = tetherCardDotRef.current;
    const cardPt = cardAnchorRef.current;

    if (!svg || !line || !halo || !anchorDot || !cardDot) return;
    if (!pt || !pt.visible || !cardPt) {
      svg.style.opacity = "0";
      return;
    }

    const startX = pt.x;
    const startY = pt.y;
    const endX = cardPt.x;
    const endY = cardPt.y;
    const kneeX = startX + (endX - startX) * 0.52;
    const kneeY = endY;

    svg.style.opacity = "1";
    line.setAttribute(
      "points",
      `${startX.toFixed(1)},${startY.toFixed(1)} ${kneeX.toFixed(1)},${kneeY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`,
    );
    halo.setAttribute("cx", startX.toFixed(1));
    halo.setAttribute("cy", startY.toFixed(1));
    anchorDot.setAttribute("cx", startX.toFixed(1));
    anchorDot.setAttribute("cy", startY.toFixed(1));
    cardDot.setAttribute("cx", endX.toFixed(1));
    cardDot.setAttribute("cy", endY.toFixed(1));
  }, []);

  const handleSelectMetric = (metric: VitalsLabMetricDisplay) => {
    if (activeMetricId === metric.id) {
      handleResetZoom();
      return;
    }
    setActiveMetricId(metric.id);
    setActiveSystem(metric.system);
    setAutoOrbit(false);
    setZoom(metric.camera.zoom);
    setPanY(metric.camera.panY);
    setTargetRotY(metric.camera.targetRotY);
    setLiveRotY(metric.camera.targetRotY);
    setRotYStepNonce((n) => n + 1);
  };

  const handleSelectSystem = (systemId: VitalsLabSystemId) => {
    const pill =
      VITALS_LAB_SYSTEM_PILLS.find((p) => p.id === systemId) ??
      VITALS_LAB_SYSTEM_PILLS[0];
    setActiveSystem(pill.id);
    setAutoOrbit(false);

    if (pill.defaultMetric) {
      const targetMetric =
        metrics.find((m) => m.id === pill.defaultMetric) ?? null;
      setActiveMetricId(targetMetric ? targetMetric.id : null);
      const cam = targetMetric ? targetMetric.camera : pill.camera;
      setZoom(cam.zoom);
      setPanY(cam.panY);
      setTargetRotY(cam.targetRotY);
      setLiveRotY(cam.targetRotY);
    } else {
      setActiveMetricId(null);
      setZoom(pill.camera.zoom);
      setPanY(pill.camera.panY);
      setTargetRotY(pill.camera.targetRotY);
      setLiveRotY(pill.camera.targetRotY);
    }
    setRotYStepNonce((n) => n + 1);
  };

  const handleResetZoom = () => {
    setActiveMetricId(null);
    setActiveSystem("full");
    setLabNoteOpen(false);
    setAutoOrbit(false);
    setZoom(1);
    setPanY(0);
    setTargetRotY(0);
    setLiveRotY(0);
    setRotYStepNonce((n) => n + 1);
  };

  const handleStepRotate = (delta: number) => {
    setAutoOrbit(false);
    const next = liveRotY + delta;
    setTargetRotY(next);
    setLiveRotY(next);
    setRotYStepNonce((n) => n + 1);
  };

  const handleAnglePreset = (rad: number) => {
    setAutoOrbit(false);
    setTargetRotY(rad);
    setLiveRotY(rad);
    setRotYStepNonce((n) => n + 1);
  };

  const handleTriggerScan = () => {
    setIsScanning(true);
    setScanNonce((n) => n + 1);
  };

  const hasCustomFocus =
    activeMetricId !== null ||
    activeSystem !== "full" ||
    Math.abs(zoom - 1) > 0.04 ||
    Math.abs(panY) > 0.04 ||
    normalizeAngleDiff(liveRotY, 0) > 0.08;

  const isLight = appearance === "light";
  const accentColor = isLight ? "#D99B16" : "#F3C952";

  const drawerHeadline = activeMetric
    ? `${activeMetric.fullTitle} · ${activeMetric.value}${activeMetric.unit ? ` ${activeMetric.unit}` : ""}`
    : activeSystemPill.headline;
  const drawerSubline = activeMetric
    ? activeMetric.subtitle
    : activeSystemPill.subline;

  const renderMetricCard = (m: VitalsLabMetricDisplay) => {
    const isActive = activeMetricId === m.id;
    const isDimmed =
      (activeMetricId !== null && !isActive) ||
      (activeMetricId === null &&
        activeSystem !== "full" &&
        m.system !== activeSystem);
    const cardColor = isLight ? m.colorLight : m.colorDark;

    return (
      <button
        key={m.id}
        ref={(el) => {
          cardRefs.current[m.id] = el;
        }}
        type="button"
        onClick={() => handleSelectMetric(m)}
        className={[
          "vitals-lab__card",
          m.column === "right"
            ? "vitals-lab__card--right"
            : "vitals-lab__card--left",
          isActive ? "is-active" : "",
          isDimmed ? "is-dimmed" : "",
        ].join(" ")}
        style={{
          ["--card-accent" as string]: cardColor,
        }}
      >
        <span className="vitals-lab__card-label">{m.label}</span>
        <span className="vitals-lab__card-value">
          {m.displayParts ? (
            m.displayParts.map((part, idx) => (
              <span key={`${part.num}${part.unit}${idx}`} className="vitals-lab__card-part">
                <span className="vitals-lab__card-num">{part.num}</span>
                <span className="vitals-lab__card-unit">{part.unit}</span>
              </span>
            ))
          ) : (
            <>
              <span className="vitals-lab__card-num">{m.value}</span>
              {m.unit ? (
                <span className="vitals-lab__card-unit">{m.unit}</span>
              ) : null}
            </>
          )}
        </span>
        <span className="vitals-lab__card-footer">
          {isActive ? (
            <VitalsLabSparkline
              data={m.sparkline}
              color={cardColor}
              width={82}
              height={18}
              active
            />
          ) : (
            <span
              className="vitals-lab__card-bar"
              style={{ background: cardColor }}
            />
          )}
        </span>
      </button>
    );
  };

  return (
    <section
      className={[
        "vitals-lab",
        isLight ? "vitals-lab--light" : "vitals-lab--dark",
        embedded ? "vitals-lab--embedded" : "",
      ].join(" ")}
    >
      {/* Header */}
      <header className="vitals-lab__header">
        <div className="vitals-lab__title-wrap">
          <h1 className="vitals-lab__title">Vitals Lab</h1>
          <span className="vitals-lab__subtitle">Overnight vitals</span>
        </div>

        <div className="vitals-lab__header-actions">
          <button
            type="button"
            className="vitals-lab__icon-btn"
            aria-label={isLight ? "Switch to Obsidian Lumen dark mode" : "Switch to Ceramic Daylight light mode"}
            onClick={() => {
              const next = isLight ? "dark" : "light";
              setAppearance(next);
              onAppearanceChange?.(next);
            }}
          >
            {isLight ? <MoonIcon /> : <SunIcon />}
          </button>

          <div className="vitals-lab__segmented" role="group" aria-label="Body model">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                className={`vitals-lab__seg-btn ${gender === g ? "is-active" : ""}`}
                onClick={() => setGender(g)}
              >
                {g === "female" ? "Female" : "Male"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Secondary mode & scan bar */}
      <div className="vitals-lab__toolbar">
        <div className="vitals-lab__segmented" role="group" aria-label="Visual mode">
          {(["lumen", "outline"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`vitals-lab__seg-btn ${viewMode === mode ? "is-active" : ""}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === "lumen" ? "Lumen" : "Outline"}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`vitals-lab__scan-btn ${isScanning ? "is-scanning" : ""}`}
          onClick={handleTriggerScan}
        >
          <ScanLineIcon />
          <span>{isScanning ? "Scanning…" : "Scan"}</span>
        </button>
      </div>

      {/* 3D Body Stage + Flanking Metric Cards + HUD Tether */}
      <div ref={stageRef} className="vitals-lab__stage">
        <div className="vitals-lab__stage-glow" />

        <div className="vitals-lab__canvas-wrap">
          <VitalsLabThreeViewport
            appearance={appearance}
            gender={gender}
            viewMode={viewMode}
            activeMetric={activeMetricId}
            activeSystem={activeSystem}
            zoom={zoom}
            panY={panY}
            targetRotY={targetRotY}
            rotYStepNonce={rotYStepNonce}
            autoOrbit={autoOrbit}
            scanNonce={scanNonce}
            anchor3D={activeMetric ? activeMetric.anchor3D : null}
            assetBaseUrl={assetBaseUrl}
            onScanComplete={() => setIsScanning(false)}
            onDragStart={() => setAutoOrbit(false)}
            onRotYChange={(r) => setLiveRotY(r)}
            onProjectAnchor={handleProjectAnchor}
          />
        </div>

        {/* SVG 3D-to-2D HUD Tether */}
        <svg
          ref={tetherSvgRef}
          className="vitals-lab__tether"
          style={{ opacity: 0 }}
          aria-hidden="true"
        >
          <polyline
            ref={tetherLineRef}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.35"
            strokeOpacity="0.88"
            strokeLinejoin="round"
          />
          <circle
            ref={tetherHaloRef}
            r="7"
            fill={accentColor}
            fillOpacity="0.22"
            className="vitals-lab__tether-halo"
          />
          <circle
            ref={tetherAnchorDotRef}
            r="3.2"
            fill={accentColor}
          />
          <circle
            ref={tetherCardDotRef}
            r="2.6"
            fill={accentColor}
          />
        </svg>

        {/* Flanking Left & Right Metric Cards */}
        <div className="vitals-lab__col vitals-lab__col--left">
          {leftMetrics.map(renderMetricCard)}
        </div>
        <div className="vitals-lab__col vitals-lab__col--right">
          {rightMetrics.map(renderMetricCard)}
        </div>

        {/* Floating Reset Zoom pill */}
        {hasCustomFocus && (
          <button
            type="button"
            className="vitals-lab__reset-pill"
            onClick={handleResetZoom}
          >
            Reset zoom
          </button>
        )}

        {/* Camera orientation strip */}
        <div className="vitals-lab__camera-bar" role="toolbar" aria-label="Camera orientation">
          <button
            type="button"
            className="vitals-lab__cam-btn"
            aria-label="Rotate 45 degrees counter-clockwise"
            onClick={() => handleStepRotate(-Math.PI / 4)}
          >
            <RotateCcwIcon />
          </button>

          {ANGLE_PRESETS.map((preset) => {
            const isPresetActive =
              !autoOrbit && normalizeAngleDiff(liveRotY, preset.rad) < 0.16;
            return (
              <button
                key={preset.id}
                type="button"
                className={`vitals-lab__cam-btn vitals-lab__cam-btn--text ${isPresetActive ? "is-active" : ""}`}
                onClick={() => handleAnglePreset(preset.rad)}
              >
                {preset.label}
              </button>
            );
          })}

          <button
            type="button"
            className={`vitals-lab__cam-btn vitals-lab__cam-btn--text ${autoOrbit ? "is-active" : ""}`}
            onClick={() => setAutoOrbit((o) => !o)}
          >
            360°
          </button>

          <button
            type="button"
            className="vitals-lab__cam-btn"
            aria-label="Rotate 45 degrees clockwise"
            onClick={() => handleStepRotate(Math.PI / 4)}
          >
            <RotateCwIcon />
          </button>
        </div>
      </div>

      {/* Bottom Contextual Drawer */}
      <footer className="vitals-lab__drawer">
        <div className="vitals-lab__drawer-head">
          <div className="vitals-lab__drawer-copy">
            <h2 className="vitals-lab__drawer-title">{drawerHeadline}</h2>
            <p className="vitals-lab__drawer-sub">{drawerSubline}</p>
          </div>
          <button
            type="button"
            className={`vitals-lab__note-toggle ${labNoteOpen ? "is-active" : ""}`}
            aria-expanded={labNoteOpen}
            aria-label="Toggle Lab note"
            onClick={() => setLabNoteOpen((v) => !v)}
          >
            <InfoIcon />
            <span>Lab note</span>
          </button>
        </div>

        {labNoteOpen && (
          <div className="vitals-lab__lab-note">
            {activeMetric ? (
              <>
                <div className="vitals-lab__lab-note-meta">
                  <span className="vitals-lab__lab-note-badge">
                    {activeMetric.status}
                  </span>
                  <span className="vitals-lab__lab-note-delta">
                    {activeMetric.delta}
                  </span>
                </div>
                <p className="vitals-lab__lab-note-body">
                  {activeMetric.description}
                </p>
              </>
            ) : (
              <p className="vitals-lab__lab-note-body">
                Select any flanking metric or physiological system pill below to
                isolate its anatomical zone, inspect recovery trend deltas, and
                drag anywhere across the scanner to inspect from 360°.
              </p>
            )}
          </div>
        )}

        <div className="vitals-lab__pills" role="tablist" aria-label="Body systems">
          {VITALS_LAB_SYSTEM_PILLS.map((pill) => {
            const isSelected = activeSystem === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`vitals-lab__pill ${isSelected ? "is-active" : ""}`}
                onClick={() => handleSelectSystem(pill.id)}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </footer>
    </section>
  );
}
