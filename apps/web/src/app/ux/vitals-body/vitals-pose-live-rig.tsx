"use client";

import { eulerRad, isTunableBone, POSE_RIG_BONES } from "@/lib/vitals-pose-rig-layout";
import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";
import { useEffect, useRef } from "react";
import type { Object3D } from "three";

type PoseState = Record<VitalsPoseBoneLabel, VitalsPoseRot>;

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
      camera.position.set(1.35, 1.15, 1.55);
      camera.lookAt(0, 0.75, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0x3fd6c5, 0.9);
      key.position.set(2.5, 3, 1.5);
      scene.add(key);

      const limbMat = new THREE.MeshStandardMaterial({ color: 0xb8e5df, roughness: 0.55 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x2fd2be, roughness: 0.4 });
      const nodes = new Map<string, Object3D>();

      for (const def of POSE_RIG_BONES) {
        const pivot = new THREE.Object3D();
        pivot.name = def.id;
        const [ox, oy, oz] = def.offset;
        pivot.position.set(ox, oy, oz);

        if (def.length > 0) {
          const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, Math.max(def.length - 0.04, 0.05), 5, 10), limbMat);
          seg.position.y = -def.length * 0.5;
          pivot.add(seg);
        }
        pivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), jointMat));

        const parent = def.parent ? nodes.get(def.parent) : null;
        if (parent) parent.add(pivot);
        else scene.add(pivot);
        nodes.set(def.id, pivot);
      }

      const root = nodes.get("hips");
      if (root) root.position.set(0, 0.35, 0);

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
        renderer.setSize(w, height);
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);
      cleanupResize = () => window.removeEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animation);
        renderer.dispose();
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
        <p style={{ fontSize: 10, letterSpacing: "0.08em", margin: "0 0 6px", opacity: 0.75 }}>
          LIVE STICK RIG — updates instantly as you slide (approximate)
        </p>
      ) : null}
      <div ref={hostRef} style={boxStyle} />
    </div>
  );
}
