"use client";

import { isLocalHost } from "@/lib/auth/design-access";
import {
  DEFAULT_VITALS_POSE,
  VITALS_POSE_BONES,
  type VitalsPoseBoneLabel,
  type VitalsPoseRot,
} from "@/lib/vitals-pose";
import type { BodyMeshSource } from "@fitness-battle/pursuit/vitals-body";
import { useCallback, useEffect, useRef, useState } from "react";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;

const AXIS: (keyof VitalsPoseRot)[] = ["x", "y", "z"];
const PREVIEW_DEBOUNCE_MS = 900;

export function VitalsPoseDev({ meshSource }: { meshSource: BodyMeshSource }) {
  const [visible, setVisible] = useState(false);
  const [bones, setBones] = useState<PoseState | null>(null);
  const [openBone, setOpenBone] = useState<VitalsPoseBoneLabel | null>("upperarm01.L");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoPreview, setAutoPreview] = useState(true);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewMale, setPreviewMale] = useState<string | null>(null);
  const [previewFemale, setPreviewFemale] = useState<string | null>(null);
  const bonesRef = useRef<PoseState | null>(null);
  const previewSeq = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bonesRef.current = bones;
  }, [bones]);

  useEffect(() => {
    setVisible(isLocalHost(window.location.hostname));
  }, []);

  const runPreview = useCallback(async (nextBones: PoseState) => {
    const seq = ++previewSeq.current;
    setPreviewBusy(true);
    try {
      const res = await fetch("/api/dev/vitals-pose/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bones: nextBones }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        images?: { male: string; female: string };
        error?: string;
        detail?: string;
      };
      if (seq !== previewSeq.current) return;
      if (!res.ok) {
        setStatus(data.detail ?? data.error ?? "Mesh preview failed");
        return;
      }
      if (data.images) {
        setPreviewMale(data.images.male);
        setPreviewFemale(data.images.female);
        setStatus(null);
      }
    } catch {
      if (seq === previewSeq.current) setStatus("Mesh preview request failed");
    } finally {
      if (seq === previewSeq.current) setPreviewBusy(false);
    }
  }, []);

  const schedulePreview = useCallback(
    (nextBones: PoseState) => {
      if (!autoPreview) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void runPreview(nextBones);
      }, PREVIEW_DEBOUNCE_MS);
    },
    [autoPreview, runPreview],
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/dev/vitals-pose");
    if (!res.ok) return;
    const data = (await res.json()) as { bones: PoseState };
    setBones(data.bones);
    if (autoPreview) void runPreview(data.bones);
  }, [autoPreview, runPreview]);

  useEffect(() => {
    if (!visible || meshSource !== "anny") return;
    void load();
  }, [visible, meshSource, load]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (!visible || meshSource !== "anny" || !bones) return null;

  function setAxis(bone: VitalsPoseBoneLabel, axis: keyof VitalsPoseRot, value: number) {
    setBones((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        [bone]: { ...prev[bone], [axis]: value },
      };
      schedulePreview(next);
      return next;
    });
    setStatus(null);
  }

  function resetDefaults() {
    const next = { ...DEFAULT_VITALS_POSE };
    setBones(next);
    schedulePreview(next);
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
      const data = (await res.json()) as { ok?: boolean; regen?: string };
      if (!res.ok) {
        setStatus("Save failed");
        return;
      }
      setStatus(
        data.regen
          ? `Saved pose.json. When pose looks right: ${data.regen} — then hard-refresh the scan.`
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
      <p style={{ fontSize: 11, opacity: 0.55, margin: "6px 0 8px", lineHeight: 1.4 }}>
        The main scan is still a baked point cloud. With <strong>auto mesh preview</strong>, sliders
        refresh fast front/side silhouettes below (~10–30s). When satisfied, save and run{" "}
        <code style={{ fontSize: 10 }}>pnpm bodies:generate &amp;&amp; pnpm bodies:sync</code>.
      </p>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={autoPreview}
          onChange={(e) => {
            setAutoPreview(e.target.checked);
            if (e.target.checked && bonesRef.current) schedulePreview(bonesRef.current);
          }}
        />
        Auto mesh preview on slider change
        {previewBusy ? <span style={{ opacity: 0.65 }}>— generating…</span> : null}
      </label>
      {(previewMale || previewFemale) && (
        <div style={{ marginBottom: 12 }}>
          {previewMale ? (
            <img
              src={previewMale}
              alt="Male pose mesh preview"
              style={{ width: "100%", borderRadius: 8, marginBottom: 8, display: "block" }}
            />
          ) : null}
          {previewFemale ? (
            <img
              src={previewFemale}
              alt="Female pose mesh preview"
              style={{ width: "100%", borderRadius: 8, display: "block" }}
            />
          ) : null}
        </div>
      )}
      <p style={{ fontSize: 11, opacity: 0.5, margin: "0 0 12px", lineHeight: 1.4 }}>
        Arms: tune <strong>upperarm01</strong> Z (down) and matching X on L/R; avoid large{" "}
        <strong>upperarm01 Y</strong>.
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
        disabled={previewBusy}
        onClick={() => void runPreview(bones)}
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
        {previewBusy ? "Preview…" : "Refresh mesh preview"}
      </button>
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
