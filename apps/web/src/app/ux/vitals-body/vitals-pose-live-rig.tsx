"use client";

import {
  isTunableBone,
  childAttachLocal,
  POSE_RIG_BONES,
  RIG_SIDE_COLORS,
  RIG_SIDE_LABELS,
  rigLimbSegment,
  rigSide,
  rotvecDegComponents,
  segmentUnit,
  type RigBoneAxis,
  type RigSide,
} from "@/lib/vitals-pose-rig-layout";
import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";
import { useEffect, useRef } from "react";
import type { MeshStandardMaterial, Object3D } from "three";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;

const LEGEND: RigSide[] = ["torso", "left", "right"];

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
      const camera = new THREE.PerspectiveCamera(variant === "stage" ? 50 : 44, width / height, 0.04, 40);
      camera.position.set(0, 0.88, variant === "stage" ? 3.6 : 2.15);
      camera.lookAt(0, 0.88, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.62));
      const key = new THREE.DirectionalLight(0xffffff, 0.85);
      key.position.set(2, 3, 2);
      scene.add(key);

      const materials = new Map<RigSide, MeshStandardMaterial>();
      for (const side of LEGEND) {
        materials.set(
          side,
          new THREE.MeshStandardMaterial({
            color: RIG_SIDE_COLORS[side],
            metalness: side === "torso" ? 0.05 : 0.12,
            roughness: 0.38,
            emissive: side === "torso" ? 0x000000 : RIG_SIDE_COLORS[side],
            emissiveIntensity: side === "torso" ? 0 : 0.22,
          }),
        );
      }

      const rig = new THREE.Group();
      rig.scale.setScalar(variant === "stage" ? 1.05 : 1);
      rig.position.set(0, 0.02, 0);
      scene.add(rig);

      const bodyAxes = new THREE.AxesHelper(variant === "stage" ? 0.42 : 0.28);
      bodyAxes.position.set(0, 0.92, 0);
      rig.add(bodyAxes);

      const bodyGrid = new THREE.GridHelper(1.35, 12, 0x2fd2be, 0x1a2e2a);
      bodyGrid.position.y = 0.04;
      rig.add(bodyGrid);

      const segDir = (axis: RigBoneAxis) => {
        const [x, y, z] = segmentUnit(axis);
        return new THREE.Vector3(x, y, z);
      };

      const rotvecToQuat = (rot: VitalsPoseRot) => {
        const [x, y, z] = rotvecDegComponents(rot);
        const angleDeg = Math.hypot(x, y, z);
        if (angleDeg < 1e-6) return new THREE.Quaternion();
        const axis = new THREE.Vector3(x, y, z).multiplyScalar(1 / angleDeg);
        return new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(angleDeg));
      };

      const nodes = new Map<string, Object3D>();
      const defById = new Map(POSE_RIG_BONES.map((d) => [d.id, d]));
      const boneUp = new THREE.Vector3(0, 1, 0);
      const radiusHand = 0.014;

      for (const def of POSE_RIG_BONES) {
        const pivot = new THREE.Object3D();
        pivot.name = def.id;

        const visual = new THREE.Object3D();
        visual.name = `${def.id}/visual`;
        const dir = segDir(def.axis);
        visual.quaternion.setFromUnitVectors(boneUp, dir);
        pivot.add(visual);

        const parentDef = def.parent ? defById.get(def.parent) : undefined;
        if (parentDef) {
          const [tx, ty, tz] = childAttachLocal(parentDef, def.offset);
          pivot.position.set(tx, ty, tz);
        }

        if (def.length > 0) {
          const mat = materials.get(rigSide(def.region))!;
          const limb = rigLimbSegment(def.id);
          const radius =
            limb === "hand"
              ? radiusHand
              : limb === "forearm"
                ? variant === "stage"
                  ? 0.017
                  : 0.019
                : limb === "upperArm"
                  ? variant === "stage"
                    ? 0.026
                    : 0.029
                  : variant === "stage"
                    ? 0.02
                    : 0.024;
          const cap = new THREE.CapsuleGeometry(radius, Math.max(def.length - 0.05, 0.05), 6, 12);
          const seg = new THREE.Mesh(cap, mat);
          seg.position.y = def.length * 0.5;
          visual.add(seg);
        }

        if (def.id === "chest") {
          const torsoMat = materials.get("torso")!;
          const shoulderBar = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.016, 0.2, 4, 8),
            torsoMat,
          );
          shoulderBar.rotation.z = Math.PI / 2;
          shoulderBar.position.set(0, def.length, 0);
          visual.add(shoulderBar);
        }

        const isElbow = def.id === "lowerarm01.L" || def.id === "lowerarm01.R";
        const isHand = def.id === "hand.L" || def.id === "hand.R";
        const jointMat = materials.get(rigSide(def.region))!;
        const joint = isElbow
          ? new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.013, 8, 20), jointMat)
          : new THREE.Mesh(
              new THREE.SphereGeometry(isHand ? 0.028 : 0.032, 12, 12),
              jointMat,
            );
        if (isElbow) joint.rotation.x = Math.PI / 2;
        visual.add(joint);

        if (isHand && def.length > 0) {
          const mat = materials.get(rigSide(def.region))!;
          const palm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.032), mat);
          palm.position.y = def.length * 0.55;
          visual.add(palm);
        }

        const parent = def.parent ? nodes.get(def.parent) : null;
        if (parent) parent.add(pivot);
        else rig.add(pivot);
        nodes.set(def.id, pivot);
      }

      const hips = nodes.get("hips");
      if (hips) hips.position.set(0, 0.48, 0);

      const applyPose = () => {
        const identity = new THREE.Quaternion();
        for (const def of POSE_RIG_BONES) {
          const pivot = nodes.get(def.id);
          if (!pivot) continue;
          pivot.quaternion.copy(
            isTunableBone(def.id) ? rotvecToQuat(bonesRef.current[def.id]) : identity,
          );
        }
      };

      const orbitTarget = new THREE.Vector3(0, 0.88, 0);
      let orbitRadius = 3.4;
      let orbitTheta = 0.2;
      let orbitPhi = Math.PI * 0.44;
      let userOrbit = false;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;

      const updateCameraFromOrbit = () => {
        if (variant !== "stage") return;
        const sinPhi = Math.sin(orbitPhi);
        camera.position.set(
          orbitTarget.x + orbitRadius * sinPhi * Math.sin(orbitTheta),
          orbitTarget.y + orbitRadius * Math.cos(orbitPhi),
          orbitTarget.z + orbitRadius * sinPhi * Math.cos(orbitTheta),
        );
        camera.lookAt(orbitTarget);
      };

      const fitStageCamera = () => {
        if (variant !== "stage") return;
        const box = new THREE.Box3().setFromObject(rig);
        if (box.isEmpty()) return;
        const size = new THREE.Vector3();
        box.getCenter(orbitTarget);
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.35);
        const vFov = (camera.fov * Math.PI) / 180;
        if (!userOrbit) {
          orbitRadius = (maxDim * 0.5) / Math.tan(vFov / 2) * 1.05;
        }
        updateCameraFromOrbit();
      };

      const render = () => {
        if (disposed) return;
        applyPose();
        fitStageCamera();
        if (variant !== "stage") {
          camera.position.set(0, 0.88, 2.15);
          camera.lookAt(0, 0.88, 0);
        }
        renderer.render(scene, camera);
        animation = requestAnimationFrame(render);
      };
      render();

      const onPointerDown = (e: PointerEvent) => {
        if (variant !== "stage") return;
        dragging = true;
        userOrbit = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging || variant !== "stage") return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        orbitTheta -= dx * 0.008;
        orbitPhi = Math.max(0.15, Math.min(Math.PI - 0.15, orbitPhi + dy * 0.008));
        updateCameraFromOrbit();
      };
      const onPointerUp = (e: PointerEvent) => {
        dragging = false;
        try {
          renderer.domElement.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      };

      if (variant === "stage") {
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointercancel", onPointerUp);
      }

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
        if (variant === "stage") {
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        }
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
          height: 280,
          borderRadius: 8,
          border: "1px solid rgba(47,210,190,0.35)",
          background: "rgba(0,0,0,0.15)",
        };

  return (
    <div className={`vitals-pose-live-rig vitals-pose-live-rig--${variant}`}>
      {variant === "panel" ? (
        <>
          <p style={{ fontSize: 10, letterSpacing: "0.08em", margin: "0 0 6px", opacity: 0.75 }}>
            LIVE STICK RIG — same rotvec as mesh (bind shape on capsules, rotation on joints). Mesh PNG = sign-off.
          </p>
          <p style={{ fontSize: 9, margin: "0 0 6px", opacity: 0.72, lineHeight: 1.35 }}>
            Thick = upper arm (2 bones) · thin = forearm · ring = elbow · box = palm
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
            {LEGEND.map((side) => (
              <span key={side} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: legendSwatch(RIG_SIDE_COLORS[side]),
                    boxShadow: side !== "torso" ? `0 0 6px ${legendSwatch(RIG_SIDE_COLORS[side])}` : undefined,
                  }}
                />
                {RIG_SIDE_LABELS[side]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="vitals-pose-live-legend vitals-pose-live-legend--stage" aria-hidden>
          {LEGEND.map((side) => (
            <span key={side}>
              <i style={{ background: legendSwatch(RIG_SIDE_COLORS[side]) }} />
              {RIG_SIDE_LABELS[side]}
            </span>
          ))}
        </div>
      )}
      <div ref={hostRef} style={boxStyle} />
    </div>
  );
}
