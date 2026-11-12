"use client";

import {
  DEFAULT_TUNING,
  VitalsBodyControls,
  VitalsBodyRenderer,
  type AppearanceMode,
  type BodySex,
  type FaceStyle,
  type HealthSystem,
  type QualityPreset,
  type ViewPreset,
  type VitalsBodyTuning,
  type VizMode,
  type ZoomPreset,
} from "@fitness-battle/pursuit/vitals-body";
import { useState } from "react";
import "./vitals-body.css";

export function VitalsBodyDemo() {
  const [sex, setSex] = useState<BodySex>("male");
  const [mode, setMode] = useState<VizMode>("cloud");
  const [view, setView] = useState<ViewPreset>("front");
  const [zoom, setZoom] = useState<ZoomPreset>("full");
  const [system, setSystem] = useState<HealthSystem>("full");
  const [appearance, setAppearance] = useState<AppearanceMode>("dark");
  const [faceStyle, setFaceStyle] = useState<FaceStyle>("soft");
  const [quality, setQuality] = useState<QualityPreset>("medium");
  const [tuning, setTuning] = useState<VitalsBodyTuning>(DEFAULT_TUNING);

  return (
    <main
      className={`vitals-body-page vitals-body-page--${appearance}`}
      data-appearance={appearance}
    >
      <header className="vitals-body-header">
        <span className="vitals-body-kicker">OVERTAEK / VITALS LAB / BODY SCAN</span>
        <h1>MakeHuman particle body</h1>
        <p>
          Illustrative health visualization. Male and female CC0-derived scans — use
          Cloud for interior fill, Outline for a thin shell. Density controls dot count.
          Drag to orbit in Rotate view.
        </p>
      </header>
      <div className="vitals-body-layout">
        <div className="vitals-body-stage">
          <VitalsBodyRenderer
            sex={sex}
            mode={mode}
            view={view}
            zoom={zoom}
            system={system}
            appearance={appearance}
            faceStyle={faceStyle}
            quality={quality}
            tuning={tuning}
            autoRotate={view === "free"}
          />
        </div>
        <aside className="vitals-body-panel">
          <VitalsBodyControls
            sex={sex}
            onSex={setSex}
            mode={mode}
            onMode={setMode}
            view={view}
            onView={setView}
            zoom={zoom}
            onZoom={setZoom}
            system={system}
            onSystem={setSystem}
            appearance={appearance}
            onAppearance={setAppearance}
            faceStyle={faceStyle}
            onFaceStyle={setFaceStyle}
            quality={quality}
            onQuality={setQuality}
            tuning={tuning}
            onTuning={setTuning}
            devTuning
          />
        </aside>
      </div>
    </main>
  );
}
