"use client";

import { isLocalHost } from "@/lib/auth/design-access";
import {
  DEFAULT_VITALS_POSE,
  VITALS_POSE_BONES,
  type VitalsPoseBoneLabel,
  type VitalsPoseRot,
} from "@/lib/vitals-pose";
import type { BodyMeshSource } from "@fitness-battle/pursuit/vitals-body";
import { useCallback, useEffect, useState } from "react";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;

const AXIS: (keyof VitalsPoseRot)[] = ["x", "y", "z"];

export function VitalsPoseDev({ meshSource }: { meshSource: BodyMeshSource }) {
  const [visible, setVisible] = useState(false);
  const [bones, setBones] = useState<PoseState | null>(null);
  const [openBone, setOpenBone] = useState<VitalsPoseBoneLabel | null>("upperarm01.L");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVisible(isLocalHost(window.location.hostname));
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/dev/vitals-pose");
    if (!res.ok) return;
    const data = (await res.json()) as { bones: PoseState };
    setBones(data.bones);
  }, []);

  useEffect(() => {
    if (!visible || meshSource !== "anny") return;
    void load();
  }, [visible, meshSource, load]);

  if (!visible || meshSource !== "anny" || !bones) return null;

  function setAxis(bone: VitalsPoseBoneLabel, axis: keyof VitalsPoseRot, value: number) {
    setBones((prev) =>
      prev
        ? {
            ...prev,
            [bone]: { ...prev[bone], [axis]: value },
          }
        : prev,
    );
    setStatus(null);
  }

  function resetDefaults() {
    setBones({ ...DEFAULT_VITALS_POSE });
    setStatus(null);
  }

  async function save() {
    if (!bones) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/dev/vitals-pose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bones }),
      });
      const data = (await res.json()) as { ok?: boolean; preview?: string; regen?: string };
      if (!res.ok) {
        setStatus("Save failed");
        return;
      }
      setStatus(
        data.regen
          ? `Saved pose.json — preview: ${data.preview} — then: ${data.regen} — hard-refresh the page`
          : "Saved",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.65, margin: 0 }}>
        LOCAL ANNY POSE (bone rotvec °)
      </p>
      <p style={{ fontSize: 11, opacity: 0.55, margin: "6px 0 12px", lineHeight: 1.4 }}>
        Per-bone X/Y/Z in Anny bone-local space. Save writes{" "}
        <code style={{ fontSize: 10 }}>body-pipeline/local/pose.json</code>, then regenerate assets.
        Not in production.
      </p>
      {VITALS_POSE_BONES.map((bone) => {
        const rot = bones[bone];
        const isOpen = openBone === bone;
        return (
          <div key={bone} style={{ marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setOpenBone(isOpen ? null : bone)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {bone}
              {isOpen ? "" : ` — x${rot.x} y${rot.y} z${rot.z}`}
            </button>
            {isOpen ? (
              <div style={{ padding: "8px 4px 4px" }}>
                {AXIS.map((axis) => (
                  <label
                    key={axis}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 11,
                      marginBottom: 8,
                    }}
                  >
                    <span>
                      {axis.toUpperCase()}{" "}
                      <span style={{ opacity: 0.6 }}>{rot[axis].toFixed(0)}°</span>
                    </span>
                    <input
                      type="range"
                      min={-120}
                      max={120}
                      step={1}
                      value={rot[axis]}
                      onChange={(e) => setAxis(bone, axis, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => resetDefaults()}
        style={{
          marginTop: 4,
          marginRight: 8,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "transparent",
          color: "inherit",
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        Reset defaults
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        style={{
          marginTop: 4,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #3fd6c5",
          background: "rgba(47,210,190,0.12)",
          color: "inherit",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {busy ? "Saving…" : "Save pose.json"}
      </button>
      {status ? (
        <p style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45, opacity: 0.85 }}>{status}</p>
      ) : null}
    </section>
  );
}
