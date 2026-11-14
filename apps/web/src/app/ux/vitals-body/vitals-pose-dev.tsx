"use client";

import { isLocalHost } from "@/lib/auth/design-access";
import { DEFAULT_VITALS_POSE, VITALS_POSE_BONES, type VitalsPoseBoneLabel, type VitalsPoseRot } from "@/lib/vitals-pose";
import { poseFromPreset, VITALS_ARM_AT_SIDE_PRESETS } from "@/lib/vitals-pose-arm-presets";
import type { BodyMeshSource } from "@fitness-battle/pursuit/vitals-body";
import { useEffect, useState } from "react";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;
const AXES = ["x", "y", "z"] as const;

export function VitalsPoseDev({ meshSource, onPoseBones, onSelectedBone }: {
  meshSource: BodyMeshSource;
  onPoseBones: (bones: PoseState) => void;
  onSelectedBone: (bone: VitalsPoseBoneLabel) => void;
}) {
  const [bones, setBones] = useState<PoseState | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [openBones, setOpenBones] = useState<Set<VitalsPoseBoneLabel>>(() => new Set(["upperarm01.L", "upperarm01.R"]));
  useEffect(() => {
    if (!isLocalHost(window.location.hostname) || meshSource !== "anny") return;
    const abort = new AbortController();
    void fetch("/api/dev/vitals-pose", { signal: abort.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load saved pose");
      const data = await response.json();
      if (!abort.signal.aborted) setBones(data.bones);
    }).catch((error) => { if (!abort.signal.aborted) setStatus(error.message); });
    return () => abort.abort();
  }, [meshSource]);
  useEffect(() => { if (bones) onPoseBones(bones); }, [bones, onPoseBones]);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/dev/vitals-pose", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bones }),
      });
      if (!response.ok) throw new Error("Save failed");
      setStatus("Saved pose.json. Bake the point cloud: pnpm bodies:generate && pnpm bodies:sync");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }
  if (meshSource !== "anny") return null;
  if (!bones) return status ? <p role="status">{status}</p> : null;
  return <section className="vitals-pose-dev">
    <p style={{ fontSize: 11, letterSpacing: "0.12em" }}>LOCAL ANNY POSE</p>
    <p style={{ fontSize: 12, lineHeight: 1.5 }}>
      The stage shows the live mesh and its actual skeleton. Pink is anatomical left;
      blue is right. Focus a slider to highlight its pivot in yellow.
      Upperarm 01/02 split one upper arm; lowerarm 01/02 split one forearm.
    </p>
    <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.7 }}>
      Controls are Anny <strong>local-ref rotation vectors in degrees</strong>.
      X/Y/Z form one axis-angle vector, not three Euler rotations. Native axes:
      X across the body, Y front/back, Z up; ancestors carry those axes with them.
      The baked point cloud updates only after regeneration.
    </p>
    <div className="vitals-pose-presets">
      <p className="vitals-pose-presets__title">Pose presets</p>
      <div className="vitals-pose-presets__grid">
        {VITALS_ARM_AT_SIDE_PRESETS.map((preset) => <button key={preset.id} type="button" className="vitals-pose-presets__btn" title={preset.hint} onClick={() => {
          setBones(poseFromPreset(preset)); setStatus(preset.hint);
        }}>{preset.label}</button>)}
      </div>
    </div>
    <div className="vitals-pose-dev__toolbar">
      <button type="button" onClick={() => setOpenBones(new Set(VITALS_POSE_BONES))}>Expand all bones</button>
      <button type="button" onClick={() => setOpenBones(new Set())}>Collapse all</button>
    </div>
    <div className="vitals-pose-bone-grid">
      {VITALS_POSE_BONES.map((bone) => <div key={bone} className={`vitals-pose-bone-card vitals-pose-bone-card--${bone.endsWith(".L") ? "left" : "right"}`}>
        <button type="button" className="vitals-pose-bone-card__head" aria-expanded={openBones.has(bone)} onClick={() => {
          onSelectedBone(bone);
          setOpenBones((previous) => {
            const next = new Set(previous);
            if (next.has(bone)) next.delete(bone); else next.add(bone);
            return next;
          });
        }}><strong>{bone}</strong><span>{openBones.has(bone) ? "Collapse" : `${bones[bone].x} / ${bones[bone].y} / ${bones[bone].z}°`}</span></button>
        {openBones.has(bone) && <div className="vitals-pose-bone-card__sliders">
          {AXES.map((axis) => <label key={axis}>
            <span>{axis.toUpperCase()} {bones[bone][axis].toFixed(1)}°</span>
            <input aria-label={`${bone} ${axis.toUpperCase()}`} type="range" min={-120} max={120} step={0.1} value={bones[bone][axis]} onFocus={() => onSelectedBone(bone)} onChange={(event) => {
              const value = Number(event.target.value);
              onSelectedBone(bone);
              setBones((previous) => previous && ({ ...previous, [bone]: { ...previous[bone], [axis]: value } }));
              setStatus("");
            }} />
          </label>)}
        </div>}
      </div>)}
    </div>
    <div className="vitals-pose-dev__actions">
      <button type="button" onClick={() => { setBones({ ...DEFAULT_VITALS_POSE }); setStatus(""); }}>Reset defaults</button>
      <button type="button" className="vitals-pose-dev__save" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save pose.json"}</button>
    </div>
    {status && <p role="status" style={{ fontSize: 12 }}>{status}</p>}
  </section>;
}
