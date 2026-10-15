"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  distanceAt,
  formatDistance,
  formatGap,
  ghost,
  lapKm,
  referenceKm,
  runners,
  type CameraView,
  type DistanceUnit,
  type Runner,
} from "./model";

export type WorldMode = "pursuit" | "circuit" | "switchback";
export interface CameraRequest {
  view: CameraView;
  revision: number;
  targetId: string;
}
interface WorldProps {
  mode: WorldMode;
  time: number;
  extraKm: number;
  selected: string;
  showGhost: boolean;
  unit: DistanceUnit;
  cameraRequest: CameraRequest;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
}
interface Label {
  id: string;
  name: string;
  detail: string;
  x: number;
  y: number;
  you: boolean;
  ghost: boolean;
}

export function DistanceWorld(props: WorldProps) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const updater = useRef<(() => void) | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const host: HTMLDivElement = element;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const dark = props.mode === "pursuit";
    scene.background = new THREE.Color(dark ? "#11241e" : "#e6ede4");
    scene.fog = new THREE.Fog(
      dark ? "#11241e" : "#e6ede4",
      dark ? 25 : 45,
      dark ? 160 : 130,
    );
    scene.add(
      new THREE.HemisphereLight("#e7f2ee", dark ? "#243b30" : "#a2b498", 2.5),
    );
    const sun = new THREE.DirectionalLight("#fff2d8", 3);
    sun.position.set(12, 28, 15);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = true;
    controls.minDistance = 3;
    controls.maxDistance = 70;
    controls.minPolarAngle = 0.06;
    controls.maxPolarAngle = Math.PI * 0.48;
    renderer.domElement.style.touchAction = "pan-y";
    const materials: THREE.Material[] = [];
    const material = (color: string, roughness = 0.8) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness });
      materials.push(m);
      return m;
    };
    const mesh = (
      geometry: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const object = new THREE.Mesh(geometry, mat);
      object.position.set(x, y, z);
      scene.add(object);
      return object;
    };
    const earth = material(dark ? "#234534" : "#bbccb0"),
      road = material(dark ? "#273830" : "#91a887"),
      line = material(dark ? "#7f9d85" : "#eff2de");
    const floor = mesh(
      new THREE.PlaneGeometry(dark ? 170 : 100, dark ? 400 : 100),
      earth,
      0,
      -0.12,
      dark ? -60 : 0,
    );
    floor.rotation.x = -Math.PI / 2;
    let curve: THREE.CatmullRomCurve3 | null = null;
    if (props.mode === "pursuit") {
      mesh(new THREE.BoxGeometry(13, 0.09, 330), road, 0, -0.03, -45);
      for (const x of [-6.2, 6.2])
        mesh(new THREE.BoxGeometry(0.09, 0.025, 330), line, x, 0.03, -45);
      for (let z = -195; z < 110; z += 9)
        mesh(new THREE.BoxGeometry(0.09, 0.025, 2), line, 0, 0.04, z);
      const hill = material("#41634a"),
        tree = material("#345c42"),
        trunk = material("#655c43");
      for (let i = 0; i < 17; i++)
        for (const side of [-1, 1]) {
          const z = 20 - i * 15,
            x = side * (10 + (i % 4) * 2);
          mesh(
            new THREE.CylinderGeometry(0.16, 0.22, 1.3, 5),
            trunk,
            x,
            0.65,
            z,
          );
          mesh(new THREE.ConeGeometry(1.5, 4.4, 5), tree, x, 2.9, z);
        }
      for (let i = 0; i < 7; i++)
        mesh(
          new THREE.ConeGeometry(14, 12 + (i % 3) * 7, 5),
          hill,
          (i - 3) * 20,
          5,
          -175 - (i % 2) * 10,
        );
      const sunDisc = new THREE.MeshBasicMaterial({
        color: "#e7d49d",
        fog: false,
      });
      materials.push(sunDisc);
      mesh(new THREE.SphereGeometry(11, 24, 12), sunDisc, 43, 29, -125);
    } else if (props.mode === "circuit") {
      mesh(
        new THREE.CylinderGeometry(8.8, 9.2, 0.5, 80),
        material("#b3c5a6"),
        0,
        -0.3,
        0,
      );
      const ring = mesh(new THREE.RingGeometry(5, 7.05, 96), road, 0, 0.015, 0);
      ring.rotation.x = -Math.PI / 2;
      for (const radius of [5.1, 5.65, 6.2, 6.95]) {
        const stripe = mesh(
          new THREE.TorusGeometry(radius, 0.025, 4, 96),
          line,
          0,
          0.04,
          0,
        );
        stripe.rotation.x = Math.PI / 2;
      }
      mesh(
        new THREE.BoxGeometry(2.1, 0.035, 0.13),
        material("#d6ff54"),
        0,
        0.065,
        -6,
      );
      const lawn = material("#87a57b");
      mesh(new THREE.CylinderGeometry(4.85, 4.85, 0.03, 64), lawn, 0, 0.01, 0);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        mesh(
          new THREE.BoxGeometry(0.7, 0.4, 0.45),
          material(i % 2 ? "#73906a" : "#d2d9b7"),
          Math.cos(angle) * 8,
          0.35,
          Math.sin(angle) * 8,
        );
      }
      const flag = material("#355c46");
      for (const x of [-8, 8]) {
        mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6), line, x, 1.6, -7);
        mesh(new THREE.BoxGeometry(1.2, 0.6, 0.04), flag, x + 0.6, 3, -7);
      }
    } else {
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-11, 0.2, 9),
        new THREE.Vector3(8, 1.6, 9),
        new THREE.Vector3(9, 3, 1),
        new THREE.Vector3(-9, 4.5, 1),
        new THREE.Vector3(-10, 6.5, -8),
        new THREE.Vector3(8, 8, -8),
        new THREE.Vector3(10, 10, -16),
        new THREE.Vector3(-8, 12, -16),
        new THREE.Vector3(-10, 14, -23),
        new THREE.Vector3(0, 15, -28),
      ]);
      mesh(
        new THREE.TubeGeometry(curve, 180, 0.36, 8, false),
        material("#d8ddba"),
        0,
        0,
        0,
      );
      for (let i = 0; i < 5; i++) {
        mesh(
          new THREE.BoxGeometry(25 - i * 2, 3, 8),
          material(i % 2 ? "#9bb588" : "#aec39b"),
          0,
          i * 3 - 1.6,
          7 - i * 8,
        );
      }
      const marker = material("#3d674c");
      for (let km = 0; km <= referenceKm; km += 5) {
        const p = curve.getPointAt(km / referenceKm);
        mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 1.3, 5),
          marker,
          p.x + 0.6,
          p.y + 0.6,
          p.z,
        );
        mesh(
          new THREE.BoxGeometry(0.7, 0.3, 0.08),
          line,
          p.x + 0.6,
          p.y + 1.3,
          p.z,
        );
      }
      for (let i = 0; i < 15; i++) {
        const x = i % 2 ? -14 : 14,
          z = 10 - i * 2.6;
        mesh(
          new THREE.ConeGeometry(1.1, 2.5 + (i % 3), 5),
          marker,
          x,
          0.8 + (10 - z) / 3,
          z,
        );
      }
    }
    const objects = new Map<string, THREE.Group>();
    const bodyMaterials = new Map<string, THREE.MeshStandardMaterial>();
    function createRunner(person: Runner) {
      const group = new THREE.Group();
      group.userData.runnerId = person.id;
      const body = material(
        person.you ? "#d6ff54" : person.ghost ? "#b9a9d9" : "#77a395",
      ) as THREE.MeshStandardMaterial;
      bodyMaterials.set(person.id, body);
      const part = (
        geometry: THREE.BufferGeometry,
        x: number,
        y: number,
        z: number,
        rotation = 0,
      ) => {
        const object = new THREE.Mesh(geometry, body);
        object.position.set(x, y, z);
        object.rotation.z = rotation;
        group.add(object);
        return object;
      };
      part(new THREE.CapsuleGeometry(0.23, 0.62, 4, 8), 0, 1.05, 0);
      part(new THREE.SphereGeometry(0.24, 10, 8), 0, 1.78, 0);
      const legA = part(
        new THREE.CylinderGeometry(0.075, 0.09, 0.75, 6),
        -0.13,
        0.42,
        0.08,
        -0.16,
      );
      legA.rotation.x = 0.28;
      const legB = part(
        new THREE.CylinderGeometry(0.075, 0.09, 0.75, 6),
        0.13,
        0.42,
        -0.08,
        0.16,
      );
      legB.rotation.x = -0.28;
      part(
        new THREE.CylinderGeometry(0.065, 0.08, 0.63, 6),
        -0.34,
        1.08,
        -0.05,
        -0.3,
      );
      part(
        new THREE.CylinderGeometry(0.065, 0.08, 0.63, 6),
        0.34,
        1.08,
        0.08,
        0.3,
      );
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 20),
        new THREE.MeshBasicMaterial({
          color: "#172d24",
          transparent: true,
          opacity: 0.2,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);
      if (person.you) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.5, 0.045, 5, 40),
          body,
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.05;
        group.add(halo);
      }
      scene.add(group);
      objects.set(person.id, group);
    }
    [...runners, ghost].forEach(createRunner);
    let cameraRevision = -1;
    function applyCamera() {
      const p = latest.current,
        request = p.cameraRequest;
      if (request.revision === cameraRevision) return;
      cameraRevision = request.revision;
      const point =
        request.targetId === "all"
          ? new THREE.Vector3(
              0,
              props.mode === "switchback" ? 6 : 0,
              props.mode === "switchback" ? -8 : 0,
            )
          : (objects.get(request.targetId)?.position.clone() ??
            new THREE.Vector3());
      if (props.mode === "pursuit") {
        if (request.targetId !== "all") {
          const offset =
            request.view === "above"
              ? new THREE.Vector3(8, 16, 10)
              : request.view === "behind"
                ? new THREE.Vector3(0, 3, -6)
                : new THREE.Vector3(0, 3, 6);
          camera.position.copy(point).add(offset);
          controls.target.copy(point).add(new THREE.Vector3(0, 1, 0));
        } else if (request.view === "follow") {
          camera.position.set(0, 2.0, 1.5);
          controls.target.set(0, 1.6, -42);
        } else if (request.view === "behind") {
          camera.position.set(0, 2.0, -1.5);
          controls.target.set(0, 1.6, 42);
        } else {
          camera.position.set(18, 27, 18);
          controls.target.set(0, 0, -17);
        }
      } else if (props.mode === "circuit") {
        const focused = request.targetId !== "all";
        const offset =
          request.view === "above"
            ? new THREE.Vector3(0, focused ? 15 : 26, 0.1)
            : request.view === "behind"
              ? new THREE.Vector3(-14, 12, -17)
              : new THREE.Vector3(15, 13, 19);
        camera.position.copy(point).add(offset);
        controls.target.copy(point);
      } else {
        const focused = request.targetId !== "all";
        const offset =
          request.view === "above"
            ? new THREE.Vector3(0, focused ? 20 : 48, 0.1)
            : request.view === "behind"
              ? new THREE.Vector3(-30, 21, -27)
              : new THREE.Vector3(
                  focused ? 12 : 30,
                  focused ? 12 : 25,
                  focused ? 14 : 35,
                );
        camera.position.copy(point).add(offset);
        controls.target.copy(point);
      }
      controls.update();
    }
    function render() {
      if (!host.isConnected) return;
      const p = latest.current;
      renderer.render(scene, camera);
      const width = host.clientWidth,
        height = host.clientHeight;
      const allowed = new Set([
        "you",
        p.selected,
        "maya",
        "leo",
        ...(props.mode === "pursuit" ? ["mina", "theo"] : []),
        ...(p.showGhost ? ["ghost"] : []),
      ]);
      const candidates: Label[] = [];
      for (const person of [...runners, ghost]) {
        const object = objects.get(person.id)!;
        if (!object.visible || !allowed.has(person.id)) continue;
        const v = object.position
          .clone()
          .add(new THREE.Vector3(0, 2.45, 0))
          .project(camera);
        if (
          v.z > 1 ||
          v.z < -1 ||
          v.x < -0.95 ||
          v.x > 0.95 ||
          v.y < -0.95 ||
          v.y > 0.95
        )
          continue;
        const detail =
          props.mode === "circuit"
            ? `${Math.floor(distanceAt(person, p.time, p.extraKm) / lapKm)} laps · ${formatDistance(distanceAt(person, p.time, p.extraKm), p.unit)} ${p.unit}`
            : formatGap(person, p.time, p.extraKm, p.unit);
        candidates.push({
          id: person.id,
          name: person.name,
          detail,
          x: Math.max(80, Math.min(width - 80, (v.x * 0.5 + 0.5) * width)),
          y: Math.max(66, Math.min(height - 10, (-0.5 * v.y + 0.5) * height)),
          you: !!person.you,
          ghost: !!person.ghost,
        });
      }
      candidates.sort(
        (a, b) =>
          Number(b.id === p.selected) - Number(a.id === p.selected) ||
          Number(b.you) - Number(a.you),
      );
      const placed: Label[] = [];
      for (const label of candidates) {
        if (
          placed.some(
            (other) =>
              Math.abs(other.x - label.x) < 115 &&
              Math.abs(other.y - label.y) < 48,
          )
        )
          continue;
        placed.push(label);
      }
      setLabels(placed);
    }
    function update() {
      const p = latest.current,
        youKm = distanceAt(runners[3]!, p.time, p.extraKm);
      for (const [i, person] of [...runners, ghost].entries()) {
        const object = objects.get(person.id)!,
          distance = distanceAt(person, p.time, p.extraKm);
        object.visible =
          (!person.ghost || p.showGhost) &&
          !(
            props.mode === "pursuit" &&
            person.you &&
            p.cameraRequest.view !== "above"
          );
        if (props.mode === "pursuit") {
          object.position.set(
            person.you ? 0 : person.ghost ? -1.7 : ((i % 3) - 1) * 2.65,
            0,
            -(distance - youKm) * 9,
          );
          object.rotation.y = 0;
        } else if (props.mode === "circuit") {
          const angle = (distance / lapKm) * Math.PI * 2 - Math.PI / 2,
            radius = 6 + ((i % 3) - 1) * 0.43;
          object.position.set(
            Math.cos(angle) * radius,
            0.08,
            Math.sin(angle) * radius,
          );
          object.rotation.y = -angle;
        } else if (curve) {
          const t = Math.min(0.9999, distance / referenceKm),
            point = curve.getPointAt(t),
            tangent = curve.getTangentAt(t);
          object.position.copy(point);
          object.position.y += 0.12;
          object.rotation.y = Math.atan2(tangent.x, tangent.z);
        }
        const mat = bodyMaterials.get(person.id)!;
        mat.color.set(
          person.you
            ? "#d6ff54"
            : person.ghost
              ? "#b9a9d9"
              : person.id === p.selected
                ? "#fba668"
                : "#668c7c",
        );
        mat.transparent = !!person.ghost;
        mat.opacity = person.ghost ? 0.65 : 1;
      }
      applyCamera();
      render();
    }
    updater.current = update;
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth,
        height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    });
    resize.observe(host);
    controls.addEventListener("change", render);
    const raycaster = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const pointerDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        [...objects.values()].filter((o) => o.visible),
        true,
      )[0];
      if (!hit) return;
      let target: THREE.Object3D | null = hit.object;
      while (target && !target.userData.runnerId) target = target.parent;
      if (target?.userData.runnerId)
        latest.current.onSelect(target.userData.runnerId as string);
    };
    const lost = (e: Event) => {
      e.preventDefault();
      latest.current.onUnavailable();
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    update();
    setReady(true);
    return () => {
      updater.current = null;
      resize.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        allMaterials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];
          mats.forEach((m) => allMaterials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [props.mode]);
  useEffect(() => {
    updater.current?.();
  }, [
    props.time,
    props.extraKm,
    props.selected,
    props.showGhost,
    props.unit,
    props.cameraRequest,
  ]);
  return (
    <div
      ref={container}
      className={`distance-world world-${props.mode}`}
      data-ready={ready}
      aria-label="Interactive synthetic 3D weekly-distance scene. Use camera controls and the runner list for keyboard access."
    >
      {labels.map((label) => (
        <button
          key={label.id}
          className={`world-label ${label.you ? "label-you" : ""} ${label.ghost ? "label-ghost" : ""} ${props.selected === label.id ? "label-selected" : ""}`}
          style={{ left: `${label.x}px`, top: `${label.y}px` }}
          onClick={() => props.onSelect(label.id)}
        >
          <strong>{label.name}</strong>
          <small>{label.detail}</small>
        </button>
      ))}
    </div>
  );
}
