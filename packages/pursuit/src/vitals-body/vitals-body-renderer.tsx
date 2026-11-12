"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { assetUrl, loadVbody } from "./load-vbody";
import { applyHighlight, createParticleMaterial } from "./particle-material";
import type {
  AppearanceMode,
  BodySex,
  HealthSystem,
  QualityPreset,
  ViewPreset,
  VitalsBodyTuning,
  VizMode,
  ZoomPreset,
} from "./types";
import { DEFAULT_TUNING as defaultTuning } from "./types";

export interface VitalsBodyRendererProps {
  assetBase?: string;
  sex: BodySex;
  mode: VizMode;
  quality?: QualityPreset;
  view: ViewPreset;
  zoom: ZoomPreset;
  system: HealthSystem;
  appearance?: AppearanceMode;
  tuning?: VitalsBodyTuning;
  autoRotate?: boolean;
  className?: string;
}

function cameraFor(view: ViewPreset, zoom: ZoomPreset): {
  position: THREE.Vector3;
  target: THREE.Vector3;
} {
  const targetY =
    zoom === "upper" ? 1.25 : zoom === "lower" ? 0.55 : 0.92;
  const dist = zoom === "full" ? 3.1 : 2.55;
  const target = new THREE.Vector3(0, targetY, 0);
  const dirs: Record<ViewPreset, THREE.Vector3> = {
    front: new THREE.Vector3(0, targetY, dist),
    side: new THREE.Vector3(dist, targetY, 0),
    back: new THREE.Vector3(0, targetY, -dist),
    free: new THREE.Vector3(0.4, targetY + 0.1, dist),
  };
  return { position: dirs[view], target };
}

function buildGeometry(asset: Awaited<ReturnType<typeof loadVbody>>) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(asset.positions, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(asset.normals, 3));
  geom.setAttribute(
    "aRegion",
    new THREE.BufferAttribute(new Float32Array(asset.regions), 1),
  );
  geom.setAttribute(
    "aClass",
    new THREE.BufferAttribute(new Float32Array(asset.classes), 1),
  );
  return geom;
}

export function VitalsBodyRenderer({
  assetBase = "/bodies",
  sex,
  mode,
  quality = "medium",
  view,
  zoom,
  system,
  appearance = "dark",
  tuning = defaultTuning,
  autoRotate = false,
  className,
}: VitalsBodyRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    view,
    zoom,
    system,
    mode,
    appearance,
    tuning,
    autoRotate,
  });
  stateRef.current = { view, zoom, system, mode, appearance, tuning, autoRotate };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let geom: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let points: THREE.Points | null = null;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      appearance === "dark" ? "#0a1418" : "#eef6f5",
      appearance === "dark" ? 0.14 : 0.06,
    );

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = appearance === "dark" ? 1.15 : 1.05;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 5.5;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const resize = () => {
      const w = host.clientWidth || 320;
      const h = host.clientHeight || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const ground = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.58, 64),
      new THREE.MeshBasicMaterial({
        color: appearance === "dark" ? "#3fd6c5" : "#2aa89a",
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.002;
    scene.add(ground);

    const load = async () => {
      const url = assetUrl(assetBase, sex, mode, quality);
      const asset = await loadVbody(url);
      if (disposed) return;
      geom = buildGeometry(asset);
      material = createParticleMaterial(appearance, mode);
      points = new THREE.Points(geom, material);
      scene.add(points);
    };
    void load();

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - start) / 1000;
      const s = stateRef.current;
      const cam = cameraFor(s.view, s.zoom);
      if (s.view !== "free") {
        camera.position.lerp(cam.position, 0.12);
        controls.target.lerp(cam.target, 0.12);
      }
      controls.autoRotate =
        s.autoRotate && !reducedMotion && s.view === "free";
      controls.autoRotateSpeed = 0.35;
      controls.update();

      if (material) {
        material.uniforms.uTime!.value = t;
        material.uniforms.uOpacity!.value = s.tuning.opacity;
        material.uniforms.uBrightness!.value = s.tuning.brightness;
        material.uniforms.uGlow!.value = s.tuning.glow;
        material.uniforms.uEdge!.value = s.tuning.edgeLight;
        material.uniforms.uSize!.value = 2.6 * s.tuning.particleScale;
        applyHighlight(material, s.system, s.mode);
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      geom?.dispose();
      material?.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [assetBase, sex, mode, quality, appearance]);

  return (
    <div
      ref={hostRef}
      className={className}
      role="img"
      aria-label={`${sex} body ${mode} particle scan`}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    />
  );
}
