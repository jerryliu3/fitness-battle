"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { assetUrl, loadVbody } from "./load-vbody";
import {
  applyHighlight,
  createParticleMaterial,
  setAppearance,
} from "./particle-material";
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
  onLoadError?: (message: string) => void;
  onLoadSuccess?: () => void;
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
  onLoadError,
  onLoadSuccess,
}: VitalsBodyRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<{
    schedule: () => void;
    resize: () => void;
    material: THREE.ShaderMaterial | null;
    scene: THREE.Scene | null;
    fog: THREE.FogExp2 | null;
    groundMat: THREE.MeshBasicMaterial | null;
    renderer: THREE.WebGLRenderer | null;
  } | null>(null);
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

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [ctxReady, setCtxReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let material: THREE.ShaderMaterial | null = null;
    let points: THREE.Points | null = null;
    let dampFrames = 0;
    let viewSnap = "";
    let raf = 0;

    const scene = new THREE.Scene();
    const fog = new THREE.FogExp2(
      appearance === "dark" ? "#0a1418" : "#eef6f5",
      appearance === "dark" ? 0.14 : 0.06,
    );
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      // Static render-on-demand still needs a retained buffer (Safari / many browsers).
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = appearance === "dark" ? 1.15 : 1.05;
    const canvas = renderer.domElement;
    Object.assign(canvas.style, {
      display: "block",
      width: "100%",
      height: "100%",
      position: "absolute",
      inset: "0",
    });
    host.style.position = "absolute";
    host.style.inset = "0";
    host.appendChild(canvas);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 5.5;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    material = createParticleMaterial(appearance, reducedMotion);

    const groundMat = new THREE.MeshBasicMaterial({
      color: appearance === "dark" ? "#3fd6c5" : "#2aa89a",
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.58, 64),
      groundMat,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.002;
    scene.add(ground);

    const snapCamera = (v: ViewPreset, z: ZoomPreset) => {
      const cam = cameraFor(v, z);
      camera.position.copy(cam.position);
      controls.target.copy(cam.target);
    };
    snapCamera(view, zoom);
    viewSnap = `${view}:${zoom}`;

    const start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      const s = stateRef.current;
      const camKey = `${s.view}:${s.zoom}`;
      if (camKey !== viewSnap) {
        if (s.view !== "free") {
          snapCamera(s.view, s.zoom);
        } else if (viewSnap.split(":")[0] !== "free") {
          snapCamera("free", s.zoom);
        }
        viewSnap = camKey;
        dampFrames = 45;
      }
      const cam = cameraFor(s.view, s.zoom);
      if (s.view !== "free") {
        camera.position.lerp(cam.position, 0.18);
        controls.target.lerp(cam.target, 0.18);
        dampFrames = Math.max(dampFrames, 8);
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
        material.uniforms.uSize!.value = 0.85 * s.tuning.particleScale;
        applyHighlight(material, s.system, s.mode);
      }
      renderer.render(scene, camera);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        draw();
        const s = stateRef.current;
        const spin = s.autoRotate && !reducedMotion && s.view === "free";
        if (spin || dampFrames > 0) {
          if (dampFrames > 0) dampFrames -= 1;
          schedule();
        }
      });
    };

    const resize = () => {
      const box = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(box.width)) || 320;
      const h = Math.max(1, Math.round(box.height)) || 480;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      schedule();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const bumpDamping = () => {
      dampFrames = 90;
      schedule();
    };
    controls.addEventListener("change", bumpDamping);

    ctxRef.current = {
      schedule,
      resize,
      material,
      scene,
      fog,
      groundMat,
      renderer,
    };
    setCtxReady(true);
    schedule();

    return () => {
      disposed = true;
      setCtxReady(false);
      ctxRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener("change", bumpDamping);
      controls.dispose();
      material?.dispose();
      ground.geometry.dispose();
      groundMat.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
    // WebGL context is created once; theme is updated in the appearance effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctxReady || !ctx?.material || !ctx.renderer || !ctx.fog || !ctx.groundMat) {
      return;
    }
    setAppearance(ctx.material, appearance, ctx.renderer);
    ctx.fog.color.set(appearance === "dark" ? "#0a1418" : "#ddeae8");
    ctx.fog.density = appearance === "dark" ? 0.11 : 0.035;
    ctx.groundMat.color.set(appearance === "dark" ? "#3fd6c5" : "#1f7f72");
    ctx.groundMat.opacity = appearance === "dark" ? 0.22 : 0.32;
    ctx.schedule();
  }, [appearance, ctxReady]);

  useEffect(() => {
    if (!ctxReady) return;
    const ctx = ctxRef.current;
    const scene = ctx?.scene;
    if (!scene || !ctx?.material) return;

    let cancelled = false;
    let geom: THREE.BufferGeometry | null = null;
    let points: THREE.Points | null = null;

    setLoadState("loading");
    const url = assetUrl(assetBase, sex, mode, quality);

    void (async () => {
      try {
        const asset = await loadVbody(url);
        if (cancelled) return;
        const existing = scene.getObjectByName("vitals-particles");
        if (existing) {
          scene.remove(existing);
          (existing as THREE.Points).geometry.dispose();
        }
        geom = buildGeometry(asset);
        const mat = ctx.material;
        if (!mat) return;
        points = new THREE.Points(geom, mat);
        points.name = "vitals-particles";
        scene.add(points);
        setLoadState("ready");
        onLoadSuccess?.();
        ctx.resize();
        ctx.schedule();
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load body scan";
        console.error("VitalsBodyRenderer:", message);
        setLoadState("error");
        onLoadError?.(message);
        ctx.schedule();
      }
    })();

    return () => {
      cancelled = true;
      if (points) {
        scene.remove(points);
        geom?.dispose();
      }
    };
  }, [assetBase, sex, mode, quality, ctxReady, onLoadError, onLoadSuccess]);

  useEffect(() => {
    ctxRef.current?.schedule();
  }, [view, zoom, system, mode, tuning]);

  return (
    <div
      ref={hostRef}
      className={className}
      role="img"
      aria-label={`${sex} body ${mode} particle scan`}
      aria-busy={loadState === "loading"}
      style={{ width: "100%", height: "100%", touchAction: "none", position: "relative" }}
    >
      {loadState === "error" ? (
        <div
          className="vitals-body-load-error"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            textAlign: "center",
            fontSize: 14,
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          Body scan assets could not be loaded. Run{" "}
          <code style={{ fontSize: 12 }}>pnpm bodies:sync</code> after generation.
        </div>
      ) : null}
    </div>
  );
}
