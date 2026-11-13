"use client";

import {
  DEFAULT_TUNING,
  VitalsBodyControls,
  VitalsBodyRenderer,
  vitalsAssetBase,
  type AppearanceMode,
  type BodyMeshSource,
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
import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";
import { VitalsPhenotypeDev } from "./vitals-phenotype-dev";
import { VitalsPoseDev } from "./vitals-pose-dev";
import { VitalsPoseLiveRig } from "./vitals-pose-live-rig";

export function VitalsBodyDemo() {
  const [meshSource, setMeshSource] = useState<BodyMeshSource>("anny");
  const [sex, setSex] = useState<BodySex>("male");
  const [mode, setMode] = useState<VizMode>("cloud");
  const [view, setView] = useState<ViewPreset>("front");
  const [zoom, setZoom] = useState<ZoomPreset>("full");
  const [system, setSystem] = useState<HealthSystem>("full");
  const [appearance, setAppearance] = useState<AppearanceMode>("dark");
  const [faceStyle, setFaceStyle] = useState<FaceStyle>("soft");
  const [quality, setQuality] = useState<QualityPreset>("medium");
  const [tuning, setTuning] = useState<VitalsBodyTuning>(DEFAULT_TUNING);
  const [showLivePose, setShowLivePose] = useState(false);
  const [selectedBone, setSelectedBone] = useState<VitalsPoseBoneLabel>("upperarm01.L");
  const [rigRevision, setRigRevision] = useState(0);
  const [livePoseBones, setLivePoseBones] = useState<Record<
    VitalsPoseBoneLabel,
    VitalsPoseRot
  > | null>(null);
  const livePoseActive = meshSource === "anny" && livePoseBones !== null && showLivePose;

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
      <div className="vitals-body-layout vitals-body-layout--wide-panel">
        <div className="vitals-body-stage">
          {livePoseActive && livePoseBones ? (
            <div className="vitals-body-pose-live-overlay vitals-body-pose-live-overlay--draggable">
              <VitalsPoseLiveRig bones={livePoseBones} sex={sex} revision={rigRevision} selectedBone={selectedBone} view={view} zoom={zoom} />
              <span>Live Anny mesh + skeleton · drag to orbit · scroll to zoom</span>
            </div>
          ) : null}
          {!livePoseActive && <VitalsBodyRenderer
            assetBase={vitalsAssetBase(meshSource)}
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
          />}
        </div>
        <aside className="vitals-body-panel">
          {meshSource === "anny" && livePoseBones && <label style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
            <input type="checkbox" checked={showLivePose} onChange={(event) => setShowLivePose(event.target.checked)} /> Live pose mesh + rig (off: baked scan)
          </label>}
          <VitalsBodyControls
            meshSource={meshSource}
            onMeshSource={setMeshSource}
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
          <VitalsPhenotypeDev sex={sex} onSaved={() => setRigRevision((revision) => revision + 1)} />
          <VitalsPoseDev
            meshSource={meshSource}
            onPoseBones={setLivePoseBones}
            onSelectedBone={setSelectedBone}
          />
        </aside>
      </div>
    </main>
  );
}
