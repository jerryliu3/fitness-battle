"use client";

import {
  eulerRad,
  isTunableBone,
  POSE_RIG_BONES,
  RIG_REGION_COLORS,
  RIG_REGION_LABELS,
  type RigRegion,
} from "@/lib/vitals-pose-rig-layout";
import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";
import { useEffect, useRef } from "react";
import type { MeshStandardMaterial, Object3D } from "three";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;

const LEGEND: RigRegion[] = ["torso", "armL", "armR", "legL", "legR"];

function legendSwatch(color: number) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgb(${r},${g},${b})`;
}

export function VitalsPoseLiveRig({
  bones,
  variant = "panel",
}: {
  bones: PoseState;
  variant?: "panel" | "stage";
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const bonesRef = useRef(bones);
  bonesRef.current = bones;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let animation = 0;
    let cleanupResize: (() => void) | null = null;

    const run = async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      const height = variant === "stage" ? host.clientHeight || 480 : 200;
      const width = host.clientWidth || 240;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, width / height, 0.04, 24);
      camera.position.set(0.05, 0.92, 2.15);
      camera.lookAt(0, 0.88, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.62));
      const key = new THREE.DirectionalLight(0xffffff, 0.85);
      key.position.set(2, 3, 2);
      scene.add(key);

      const materials = new Map<RigRegion, MeshStandardMaterial>();
      for (const region of LEGEND) {
        materials.set(
          region,
          new THREE.MeshStandardMaterial({
            color: RIG_REGION_COLORS[region],
            metalness: 0.08,
            roughness: 0.42,
          }),
        );
      }

      const rig = new THREE.Group();
      rig.position.set(0, 0.02, 0);
      scene.add(rig);

      const nodes = new Map<string, Object3D>();
      const defById = new Map(POSE_RIG_BONES.map((d) => [d.id, d]));

      for (const def of POSE_RIG_BONES) {
        const pivot = new THREE.Object3D();
        pivot.name = def.id;

        const parentId = def.parent;
        const parentDef = parentId ? defById.get(parentId) : undefined;
        const [ox, oy, oz] = def.offset;
        if (parentDef) {
          const tipY = parentDef.axis === "up" ? parentDef.length : -parentDef.length;
          pivot.position.set(ox, tipY + oy, oz);
        }

        if (def.length > 0) {
          const mat = materials.get(def.region)!;
          const cap = new THREE.CapsuleGeometry(0.028, Math.max(def.length - 0.05, 0.06), 6, 12);
          const seg = new THREE.Mesh(cap, mat);
          const mid = def.length * 0.5;
          seg.position.y = def.axis === "up" ? mid : -mid;
          pivot.add(seg);
        }

        const joint = new THREE.Mesh(
          new THREE.SphereGeometry(0.034, 12, 12),
          materials.get(def.region)!,
        );
        pivot.add(joint);

        const parent = def.parent ? nodes.get(def.parent) : null;
        if (parent) parent.add(pivot);
        else rig.add(pivot);
        nodes.set(def.id, pivot);
      }

      const hips = nodes.get("hips");
      if (hips) hips.position.set(0, 0.48, 0);

      const applyPose = () => {
        for (const def of POSE_RIG_BONES) {
          const pivot = nodes.get(def.id);
          if (!pivot) continue;
          pivot.rotation.set(0, 0, 0);
          if (isTunableBone(def.id)) {
            const [rx, ry, rz] = eulerRad(bonesRef.current[def.id]);
            pivot.rotation.set(rx, ry, rz, "XYZ");
          }
        }
      };

      const render = () => {
        if (disposed) return;
        applyPose();
        renderer.render(scene, camera);
        animation = requestAnimationFrame(render);
      };
      render();

      const onResize = () => {
        const w = host.clientWidth || 240;
        const h = variant === "stage" ? host.clientHeight || 480 : 200;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);
      cleanupResize = () => window.removeEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animation);
        renderer.dispose();
        materials.forEach((m) => m.dispose());
        if (renderer.domElement.parentElement === host) {
          host.removeChild(renderer.domElement);
        }
      };
    };

    let teardownScene: (() => void) | null = null;
    void run().then((teardown) => {
      teardownScene = teardown ?? null;
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      cleanupResize?.();
      teardownScene?.();
    };
  }, [variant]);

  const boxStyle =
    variant === "stage"
      ? { width: "100%", height: "100%", minHeight: 280 }
      : {
          width: "100%",
          height: 200,
          borderRadius: 8,
          border: "1px solid rgba(47,210,190,0.35)",
          background: "rgba(0,0,0,0.15)",
        };

  return (
    <div className={`vitals-pose-live-rig vitals-pose-live-rig--${variant}`}>
      {variant === "panel" ? (
        <>
          <p style={{ fontSize: 10, letterSpacing: "0.08em", margin: "0 0 6px", opacity: 0.75 }}>
            LIVE STICK RIG — instant feedback (approximate, not the scan)
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 10px",
              fontSize: 9,
              marginBottom: 6,
              opacity: 0.85,
            }}
          >
            {LEGEND.map((region) => (
              <span key={region} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: legendSwatch(RIG_REGION_COLORS[region]),
                  }}
                />
                {RIG_REGION_LABELS[region]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="vitals-pose-live-legend" aria-hidden>
          {LEGEND.map((region) => (
            <span key={region}>
              <i style={{ background: legendSwatch(RIG_REGION_COLORS[region]) }} />
              {RIG_REGION_LABELS[region]}
            </span>
          ))}
        </div>
      )}
      <div ref={hostRef} style={boxStyle} />
    </div>
  );
}
