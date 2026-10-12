"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  distanceAt,
  formatGapLabel,
  type FieldRunner,
  type PursuitFacing,
} from "../model";

interface Label {
  id: string;
  name: string;
  detail: string;
  x: number;
  y: number;
  you: boolean;
}

export function PursuitScene({
  runners,
  you,
  ghost,
  checkpoint,
  selectedId,
  facing,
  zoom,
  unitLabel,
  showGhost,
  onSelect,
  onUnavailable,
}: {
  runners: FieldRunner[];
  you: FieldRunner;
  ghost: FieldRunner | null;
  checkpoint: number;
  selectedId: string;
  facing: PursuitFacing;
  /** 0 = close, 1 = far back. */
  zoom: number;
  unitLabel: string;
  showGhost: boolean;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef({
    runners,
    you,
    ghost,
    checkpoint,
    selectedId,
    facing,
    zoom,
    unitLabel,
    showGhost,
    onSelect,
  });
  latest.current = {
    runners,
    you,
    ghost,
    checkpoint,
    selectedId,
    facing,
    zoom,
    unitLabel,
    showGhost,
    onSelect,
  };
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
      onUnavailable();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#12161c");
    scene.fog = new THREE.Fog("#12161c", 20, 140);
    scene.add(new THREE.HemisphereLight("#e8f0ea", "#243040", 2.2));
    const sun = new THREE.DirectionalLight("#fff1d6", 2.6);
    sun.position.set(10, 24, 12);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    const materials: THREE.Material[] = [];
    const material = (color: string, roughness = 0.82) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness });
      materials.push(mat);
      return mat;
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

    const earth = material("#1d2830");
    const road = material("#2a3540");
    const line = material("#7f9d85");
    mesh(new THREE.PlaneGeometry(140, 360), earth, 0, -0.12, -40).rotation.x =
      -Math.PI / 2;
    mesh(new THREE.BoxGeometry(8, 0.08, 320), road, 0, 0, -40);
    for (let i = 0; i < 28; i += 1) {
      mesh(new THREE.BoxGeometry(0.18, 0.04, 3.2), line, 0, 0.05, -6 - i * 10);
    }
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const trunk = material("#3a2d22");
      const canopy = material(i % 3 === 0 ? "#3f6b45" : "#2f5a3c");
      mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 2.2, 5),
        trunk,
        side * (7 + (i % 4)),
        1.1,
        -10 - i * 12,
      );
      mesh(
        new THREE.SphereGeometry(1.3 + (i % 3) * 0.15, 10, 10),
        canopy,
        side * (7 + (i % 4)),
        2.6,
        -10 - i * 12,
      );
    }

    const objects = new Map<string, THREE.Group>();
    const bodyMaterials = new Map<string, THREE.MeshStandardMaterial>();

    function createRunner(person: FieldRunner) {
      const group = new THREE.Group();
      group.userData.id = person.id;
      const body = new THREE.MeshStandardMaterial({
        color: person.you ? "#b7f255" : "#6f8f82",
        roughness: 0.55,
      });
      materials.push(body);
      bodyMaterials.set(person.id, body);
      const torso = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
        body,
      );
      torso.position.y = 1.15;
      group.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), body);
      head.position.y = 1.85;
      group.add(head);
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 18),
        new THREE.MeshBasicMaterial({
          color: "#0b1016",
          transparent: true,
          opacity: 0.25,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);
      scene.add(group);
      objects.set(person.id, group);
    }

    function syncCast() {
      const people = [
        ...latest.current.runners,
        ...(latest.current.ghost && latest.current.showGhost
          ? [latest.current.ghost]
          : []),
      ];
      for (const person of people) {
        if (!objects.has(person.id)) createRunner(person);
      }
      for (const id of [...objects.keys()]) {
        if (!people.some((person) => person.id === id)) {
          const object = objects.get(id)!;
          scene.remove(object);
          objects.delete(id);
          bodyMaterials.delete(id);
        }
      }
    }

    function applyCamera() {
      const { facing, zoom: z } = latest.current;
      const near = facing === "forward" ? 0.7 : -0.7;
      const far = facing === "forward" ? 9 : -9;
      const look = facing === "forward" ? -48 : 48;
      const eyeZ = near + (far - near) * z;
      const eyeY = 1.7 + z * 1.8;
      camera.position.set(0, eyeY, eyeZ);
      camera.lookAt(0, 1.45, look);
    }

    function renderLabels() {
      const p = latest.current;
      const width = host.clientWidth;
      const height = host.clientHeight;
      const allowed = new Set([
        "you",
        p.you.id,
        p.selectedId,
        ...(p.showGhost && p.ghost ? [p.ghost.id] : []),
      ]);
      // Always label a few nearest rivals for context.
      const withDist = p.runners
        .filter((runner) => !runner.you)
        .map((runner) => ({
          runner,
          gap: Math.abs(
            distanceAt(runner, p.checkpoint) - distanceAt(p.you, p.checkpoint),
          ),
        }))
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 3);
      for (const item of withDist) allowed.add(item.runner.id);

      const candidates: Label[] = [];
      for (const person of [
        ...p.runners,
        ...(p.ghost && p.showGhost ? [p.ghost] : []),
      ]) {
        const object = objects.get(person.id);
        if (!object || !object.visible || !allowed.has(person.id)) continue;
        const projected = object.position
          .clone()
          .add(new THREE.Vector3(0, 2.3, 0))
          .project(camera);
        if (
          projected.z > 1 ||
          projected.z < -1 ||
          projected.x < -0.95 ||
          projected.x > 0.95 ||
          projected.y < -0.95 ||
          projected.y > 0.95
        ) {
          continue;
        }
        candidates.push({
          id: person.id,
          name: person.you ? "You" : person.name,
          detail: formatGapLabel(
            person,
            p.you,
            p.checkpoint,
            p.unitLabel,
          ),
          x: Math.max(
            70,
            Math.min(width - 70, (projected.x * 0.5 + 0.5) * width),
          ),
          y: Math.max(
            50,
            Math.min(height - 12, (-0.5 * projected.y + 0.5) * height),
          ),
          you: Boolean(person.you),
        });
      }
      candidates.sort(
        (a, b) =>
          Number(b.id === p.selectedId) - Number(a.id === p.selectedId) ||
          Number(b.you) - Number(a.you),
      );
      const placed: Label[] = [];
      for (const label of candidates) {
        if (
          placed.some(
            (other) =>
              Math.abs(other.x - label.x) < 110 &&
              Math.abs(other.y - label.y) < 44,
          )
        ) {
          continue;
        }
        placed.push(label);
      }
      setLabels(placed);
    }

    function update() {
      const p = latest.current;
      syncCast();
      const youKm = distanceAt(p.you, p.checkpoint);
      const cast = [
        ...p.runners,
        ...(p.ghost && p.showGhost ? [p.ghost] : []),
      ];
      cast.forEach((person, index) => {
        const object = objects.get(person.id);
        if (!object) return;
        const km = distanceAt(person, p.checkpoint);
        // Camera is you in POV — hide the self avatar.
        object.visible = !person.you;
        if (person.ghost) object.visible = p.showGhost;
        object.position.set(
          person.you ? 0 : person.ghost ? -1.6 : ((index % 3) - 1) * 2.4,
          0,
          -(km - youKm) * 9,
        );
        const mat = bodyMaterials.get(person.id);
        if (mat) {
          mat.color.set(
            person.you
              ? "#b7f255"
              : person.ghost
                ? "#9aa3c7"
                : person.id === p.selectedId
                  ? "#f4b183"
                  : "#6f8f82",
          );
          mat.transparent = Boolean(person.ghost);
          mat.opacity = person.ghost ? 0.7 : 1;
        }
      });
      applyCamera();
      renderer.render(scene, camera);
      renderLabels();
    }

    updater.current = update;

    const resize = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      update();
    });
    resize.observe(host);

    const raycaster = new THREE.Raycaster();
    const onClick = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(
        [...objects.values()].filter((object) => object.visible),
        true,
      )[0];
      if (!hit) return;
      let current: THREE.Object3D | null = hit.object;
      while (current && !current.userData.id) current = current.parent;
      const id = current?.userData.id as string | undefined;
      if (id) latest.current.onSelect(id);
    };
    renderer.domElement.addEventListener("pointerup", onClick);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    setReady(true);
    update();

    return () => {
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerup", onClick);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      updater.current = null;
      materials.forEach((mat) => mat.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [onUnavailable]);

  useEffect(() => {
    updater.current?.();
  }, [
    runners,
    you,
    ghost,
    checkpoint,
    selectedId,
    facing,
    zoom,
    unitLabel,
    showGhost,
  ]);

  return (
    <div className="fd-pursuit" ref={container}>
      {!ready ? (
        <div className="fd-loading">
          <span />
          Building your distance field…
        </div>
      ) : null}
      {labels.map((label) => (
        <button
          key={label.id}
          type="button"
          className={`fd-world-label${label.you ? " you" : ""}${label.id === selectedId ? " selected" : ""}`}
          style={{ left: label.x, top: label.y }}
          onClick={() => onSelect(label.id)}
        >
          <strong>{label.name}</strong>
          <span>{label.detail}</span>
        </button>
      ))}
    </div>
  );
}
