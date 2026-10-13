"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createAvatar, type AvatarLook, type RunnerAvatar } from "../avatar";
import { stableLanes, valueAt, worldZ, type SceneRunner } from "../geometry";

export type CameraMode = "follow" | "above" | "avatar";

export interface PursuitProps {
  runners: SceneRunner[];
  ghost: SceneRunner | null;
  time: number;
  extra: number;
  selected: string;
  showGhost: boolean;
  camera: CameraMode;
  look: AvatarLook;
  unit: string;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
}
interface Label {
  id: string;
  name: string;
  gap: string;
  x: number;
  y: number;
}

function gapText(
  runner: SceneRunner,
  you: SceneRunner,
  time: number,
  extra: number,
  unit: string,
): string {
  const gap =
    Math.round((valueAt(runner, time, extra) - valueAt(you, time, extra)) * 1000) /
    1000;
  if (runner.you) return `${valueAt(you, time, extra).toFixed(1)} ${unit} from start`;
  if (Math.abs(gap) < 0.001) return "Level with you";
  return `${Math.abs(gap).toFixed(Math.abs(gap) < 1 ? 2 : 1)} ${unit} ${gap > 0 ? "ahead" : "behind"}`;
}

export function LivePursuit(props: PursuitProps) {
  const hostRef = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    updater = useRef<(() => void) | null>(null);
  latest.current = props;
  const [ready, setReady] = useState(false),
    [labels, setLabels] = useState<Label[]>([]);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const host: HTMLDivElement = el;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#d5d6d3");
    scene.fog = new THREE.Fog("#d5d6d3", 42, 180);
    scene.add(new THREE.HemisphereLight("#f6f8ff", "#6c718d", 2.3));
    const sun = new THREE.DirectionalLight("#ffe3c2", 3.2);
    sun.position.set(-14, 26, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(sun.target);
    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 350),
      controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.48;
    renderer.domElement.style.touchAction = "pan-y";
    const mat = (color: string) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const roadMat = mat("#404346"),
      grassMat = mat("#c8c9c4"),
      stripeMat = mat("#ecece8"),
      woodMat = mat("#2a2c2e"),
      leafMat = mat("#8e918c"),
      whiteMat = mat("#f4f4f1");
    const mesh = (
      parent: THREE.Scene | THREE.Group,
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    // Fixed world origin. The floor is recycled ahead of the moving camera, not the start.
    const floor = mesh(
      scene,
      new THREE.PlaneGeometry(150, 440),
      grassMat,
      0,
      -0.12,
      0,
    );
    floor.rotation.x = -Math.PI / 2;
    const road = mesh(
      scene,
      new THREE.BoxGeometry(22, 0.12, 420),
      roadMat,
      0,
      -0.015,
      0,
    );
    const stripes = Array.from({ length: 10 }, (_, i) =>
      mesh(
        scene,
        new THREE.BoxGeometry(0.045, 0.025, 420),
        stripeMat,
        (i - 4.5) * 2.4,
        0.06,
        0,
      ),
    );
    const start = new THREE.Group();
    scene.add(start);
    for (let i = 0; i < 18; i++)
      for (let row = 0; row < 2; row++)
        mesh(
          start,
          new THREE.BoxGeometry(22 / 18, 0.027, 0.7),
          (i + row) % 2 ? woodMat : whiteMat,
          -11 + ((i + 0.5) * 22) / 18,
          0.08,
          (row - 0.5) * 0.7,
        );
    for (const x of [-11.7, 11.7])
      mesh(
        start,
        new THREE.CylinderGeometry(0.14, 0.14, 6.5, 8),
        woodMat,
        x,
        3.25,
        0.0,
      ).castShadow = true;
    function textMaterial(text: string) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#25344a";
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = "#f2f5fa";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, 256, 85);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
    }
    mesh(start, new THREE.BoxGeometry(23.8, 0.18, 0.14), woodMat, 0, 6.5, 0);
    mesh(
      start,
      new THREE.PlaneGeometry(8, 1.4),
      textMaterial("START"),
      0,
      5.8,
      0,
    );
    const markers = Array.from({ length: 22 }, () => {
      const group = new THREE.Group();
      scene.add(group);
      mesh(
        group,
        new THREE.BoxGeometry(22, 0.025, 0.04),
        stripeMat,
        0,
        0.08,
        0,
      );
      mesh(
        group,
        new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6),
        woodMat,
        12.5,
        1.2,
        0,
      );
      const sign = mesh(
        group,
        new THREE.PlaneGeometry(2.2, 0.65),
        textMaterial("0 KM"),
        12.5,
        2.65,
        0,
      );
      return { group, sign, km: -1 };
    });
    const trees = Array.from({ length: 24 }, (_, i) => {
      const group = new THREE.Group();
      scene.add(group);
      mesh(
        group,
        new THREE.CylinderGeometry(0.12, 0.22, 3, 7),
        woodMat,
        0,
        1.5,
        0,
      );
      for (const [j, size] of [1.4, 1.1, 0.8].entries()) {
        const canopy = mesh(
          group,
          new THREE.IcosahedronGeometry(size, 1),
          leafMat,
          j % 2 ? 0.4 : -0.2,
          3.3 + j * 0.8,
          0,
        );
        canopy.castShadow = true;
      }
      return group;
    });
    const buildings = Array.from({ length: 12 }, (_, i) => {
      const building = mesh(
        scene,
        new THREE.BoxGeometry(8 + (i % 3) * 4, 10 + (i % 4) * 7, 12),
        mat(["#b0b7cb", "#bac4d6", "#9dabca"][i % 3]!),
        i % 2 ? -37 : 35,
        5 + (i % 4) * 3,
        0,
      );
      return building;
    });
    const avatars = new Map<string, RunnerAvatar>();
    const lanes = stableLanes(latest.current.runners);
    lanes.forEach((r, i) => {
      const avatar = createAvatar(
        r.you
          ? latest.current.look
          : {
              skin: i % 3 === 0 ? "umber" : i % 3 === 1 ? "rose" : "amber",
              kit: i % 3 === 0 ? "midnight" : "coral",
              hair: i % 3 === 0 ? "bun" : i % 3 === 1 ? "cap" : "crop",
            },
        i,
      );
      avatar.group.userData.runnerId = r.id;
      scene.add(avatar.group);
      avatars.set(r.id, avatar);
    });
    const yourAvatar = [...avatars.values()].find((avatar) =>
      lanes.find((runner) => runner.you && avatar.group.userData.runnerId === runner.id),
    );
    const ghostAvatar = createAvatar(
      { skin: "rose", kit: "midnight", hair: "crop" },
      4,
    );
    ghostAvatar.group.userData.runnerId = "ghost";
    scene.add(ghostAvatar.group);
    ghostAvatar.group.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        const material = object.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = 0.33;
        material.depthWrite = false;
      }
    });
    const halo = mesh(
      scene,
      new THREE.TorusGeometry(0.57, 0.035, 6, 48),
      mat("#f97b47"),
      0,
      0.1,
      0,
    );
    halo.rotation.x = Math.PI / 2;
    let cameraMode: CameraMode | null = null,
      lastYouZ = 0;
    function render() {
      renderer.render(scene, camera);
      const p = latest.current,
        visible: Label[] = [];
      const youRunner = stableLanes(p.runners).find((runner) => runner.you);
      const labelIds = [
        p.selected,
        youRunner?.id,
        ...(p.showGhost && p.ghost ? [p.ghost.id] : []),
      ].filter((id): id is string => Boolean(id));
      for (const id of labelIds) {
        if (visible.some((l) => l.id === id)) continue;
        const r =
          id === p.ghost?.id
            ? p.ghost
            : stableLanes(p.runners).find((a) => a.id === id);
        if (!r || !youRunner) continue;
        const avatar = id === p.ghost?.id ? ghostAvatar : avatars.get(id);
        if (!avatar) continue;
        const point = avatar.group.position
          .clone()
          .add(new THREE.Vector3(0, 2.9, 0))
          .project(camera);
        if (
          point.z < -1 ||
          point.z > 1 ||
          Math.abs(point.x) > 0.92 ||
          Math.abs(point.y) > 0.9
        )
          continue;
        const label = {
          id,
          name: r.you ? "YOU" : r.ghost ? "PAST YOU" : r.name.split(" ")[0]!,
          gap: gapText(r, youRunner, p.time, p.extra, p.unit),
          x: Math.max(
            78,
            Math.min(
              host.clientWidth - 78,
              (point.x * 0.5 + 0.5) * host.clientWidth,
            ),
          ),
          y: Math.max(62, (-point.y * 0.5 + 0.5) * host.clientHeight),
        };
        if (
          visible.some(
            (l) =>
              Math.abs(l.x - label.x) < 112 && Math.abs(l.y - label.y) < 56,
          )
        )
          continue;
        visible.push(label);
      }
      setLabels(visible);
    }
    function update() {
      const p = latest.current;
      const lanesNow = stableLanes(p.runners);
      const youNow = lanesNow.find((runner) => runner.you) ?? lanesNow[0];
      if (!youNow) return;
      const total = valueAt(youNow, p.time, p.extra);
      const yourZ = worldZ(total);
      const center = (lanesNow.length - 1) / 2;
      for (const [i, r] of lanesNow.entries()) {
        const avatar = avatars.get(r.id);
        if (!avatar) continue;
        const km = valueAt(r, p.time, p.extra);
        avatar.group.position.set((i - center) * 2.4, 0, worldZ(km));
        avatar.pose(km);
        if (r.you) avatar.dress(p.look);
      }
      ghostAvatar.group.visible = Boolean(p.showGhost && p.ghost);
      if (p.ghost) {
        ghostAvatar.group.position.set(
          -0.85,
          0,
          worldZ(valueAt(p.ghost, p.time, 0)),
        );
        ghostAvatar.pose(valueAt(p.ghost, p.time, 0));
      }
      halo.position.z = yourZ;
      floor.position.z = yourZ - 60;
      road.position.z = yourZ - 55;
      stripes.forEach((s) => {
        s.position.z = yourZ - 55;
      });
      const first = Math.max(0, Math.floor(total) - 5);
      markers.forEach((marker, i) => {
        const km = first + i;
        marker.group.position.z = worldZ(km);
        marker.group.visible = km > 0;
        if (marker.km !== km) {
          const old = marker.sign.material as THREE.MeshBasicMaterial;
          old.map?.dispose();
          old.dispose();
          marker.sign.material = textMaterial(
            `${km} ${latest.current.unit.toUpperCase()}`,
          );
          marker.km = km;
        }
      });
      trees.forEach((tree, i) => {
        const km =
          Math.max(0, Math.floor(total / 2) - 3) + Math.floor(i / 2) * 2;
        tree.position.set(i % 2 ? 15.5 : -15.5, 0, worldZ(km) - 2);
      });
      buildings.forEach((building, i) => {
        building.position.z = worldZ(total) - 30 - i * 18;
      });
      // Move the follow camera through absolute world space. Free orbit keeps its offset.
      if (p.camera !== cameraMode) {
        cameraMode = p.camera;
        if (p.camera === "follow") {
          camera.position.set(2.5, 4.4, yourZ + 10);
          controls.target.set(0, 1.45, yourZ - 12);
        } else if (p.camera === "above") {
          camera.position.set(0, 33, yourZ + 8);
          controls.target.set(0, 0, yourZ - 15);
        } else {
          camera.position.set(0.7, 2.1, yourZ - 4.4);
          controls.target.set(0, 1.35, yourZ);
        }
      } else {
        const delta = yourZ - lastYouZ;
        camera.position.z += delta;
        controls.target.z += delta;
      }
      lastYouZ = yourZ;
      sun.position.set(-14, 26, yourZ + 15);
      sun.target.position.set(0, 0, yourZ - 8);
      if (yourAvatar) yourAvatar.group.visible = true;
      halo.visible = p.camera !== "avatar";
      controls.update();
      render();
      host.dataset.worldZ = String(yourZ);
      host.dataset.cameraZ = String(camera.position.z);
    }
    updater.current = update;
    const observer = new ResizeObserver(() => {
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      render();
    });
    observer.observe(host);
    controls.addEventListener("change", render);
    const raycaster = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const press = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const release = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        [...avatars.values()].map((a) => a.group),
        true,
      )[0];
      if (!hit) return;
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.runnerId) object = object.parent;
      if (object) latest.current.onSelect(object.userData.runnerId as string);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      latest.current.onUnavailable();
    };
    renderer.domElement.addEventListener("pointerdown", press);
    renderer.domElement.addEventListener("pointerup", release);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    update();
    setReady(true);
    return () => {
      updater.current = null;
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", press);
      renderer.domElement.removeEventListener("pointerup", release);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
            const texture = (material as THREE.MeshBasicMaterial).map;
            if (texture) textures.add(texture);
          }
        }
      });
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    updater.current?.();
  }, [
    props.time,
    props.extra,
    props.runners,
    props.ghost,
    props.unit,
    props.camera,
    props.selected,
    props.look,
    props.showGhost,
  ]);
  return (
    <div
      className="fd-live-world"
      ref={hostRef}
      data-ready={ready}
      aria-label="Third-person synthetic weekly-distance world, with an articulated runner and fixed starting line. Select runners with labels or the field list."
    >
      {labels.map((label) => (
        <button
          key={label.id}
          className={`fd-world-label${label.id === props.selected ? " is-selected" : ""}`}
          style={{ left: label.x, top: label.y }}
          onClick={() => props.onSelect(label.id)}
        >
          <strong>{label.name}</strong>
          <small>{label.gap}</small>
        </button>
      ))}
    </div>
  );
}
