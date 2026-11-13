"use client";

import { createPoseRig, rigSide, RIG_SIDE_COLORS, type AnnyPoseRig } from "@/lib/vitals-pose-rig-layout";
import type { VitalsPoseFile } from "@/lib/vitals-pose";
import type { ViewPreset, ZoomPreset } from "@fitness-battle/pursuit/vitals-body";
import { useEffect, useRef, useState } from "react";

export function VitalsPoseLiveRig({ bones, sex, selectedBone, revision, view, zoom }: {
  bones: VitalsPoseFile;
  selectedBone: string;
  revision: number;
  view: ViewPreset;
  zoom: ZoomPreset;
  sex: "male" | "female";
}) {
  const cameraRef = useRef({ view, zoom });
  cameraRef.current = { view, zoom };
  const selectedRef = useRef(selectedBone);
  selectedRef.current = selectedBone;
  const hostRef = useRef<HTMLDivElement>(null);
  const bonesRef = useRef(bones);
  bonesRef.current = bones;
  const [status, setStatus] = useState("Loading Anny mesh and skeleton…");
  const [showMesh, setShowMesh] = useState(true);
  const showMeshRef = useRef(showMesh);
  showMeshRef.current = showMesh;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const abort = new AbortController();
    let disposed = false;
    let teardown: (() => void) | undefined;
    setStatus("Loading Anny mesh and skeleton…");
    async function start() {
      const [THREE, { OrbitControls }, response] = await Promise.all([
        import("three"), import("three/examples/jsm/controls/OrbitControls.js"),
        fetch(`/api/dev/vitals-pose/rig?sex=${sex}`, { signal: abort.signal }),
      ]);
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Could not load Anny rig");
      }
      const data = await response.json() as AnnyPoseRig;
      if (disposed || !host) return;
      const rig = createPoseRig(data);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 30);
      // Native face is -Y; Z-up → Y-up maps it to +Z.
      camera.position.set(0, 0.9, 3.1);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.9, 0);
      controls.enableDamping = true;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x657080, 2));
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(-2, 3, 3);
      scene.add(key);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(rig.positions, 3));
      geometry.setIndex(data.faces.flat());
      const material = new THREE.MeshStandardMaterial({
        color: 0x91a8b5, transparent: true, opacity: 0.45, roughness: 0.8,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      const edges = data.parents.flatMap((parent, i) => parent < 0 ? [] : [[parent, i]]);
      const lines = new Float32Array(edges.length * 6);
      const colors = edges.flatMap(([, child]) => {
        const c = new THREE.Color(RIG_SIDE_COLORS[rigSide(data.labels[child])]);
        return [...c.toArray(), ...c.toArray()];
      });
      const stickGeometry = new THREE.BufferGeometry();
      stickGeometry.setAttribute("position", new THREE.BufferAttribute(lines, 3));
      stickGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const stickMaterial = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true });
      const stick = new THREE.LineSegments(stickGeometry, stickMaterial);
      stick.renderOrder = 2;
      scene.add(stick);
      const jointsGeometry = new THREE.BufferGeometry();
      const joints = new Float32Array(data.labels.length * 3);
      jointsGeometry.setAttribute("position", new THREE.BufferAttribute(joints, 3));
      jointsGeometry.setAttribute("color", new THREE.Float32BufferAttribute(data.labels.flatMap((label) =>
        new THREE.Color(RIG_SIDE_COLORS[rigSide(label)]).toArray()), 3));
      const jointsMaterial = new THREE.PointsMaterial({ size: 0.014, vertexColors: true, depthTest: false, transparent: true });
      const points = new THREE.Points(jointsGeometry, jointsMaterial);
      points.renderOrder = 3;
      scene.add(points);
      const highlightGeometry = new THREE.SphereGeometry(0.018, 12, 12);
      const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffde59, depthTest: false, transparent: true });
      const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      highlight.renderOrder = 4;
      scene.add(highlight);
      const grid = new THREE.GridHelper(2, 20, 0x54726a, 0x263631);
      scene.add(grid);
      const resize = new ResizeObserver(() => {
        const width = host.clientWidth || 300, height = host.clientHeight || 480;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      });
      resize.observe(host);
      let previous: VitalsPoseFile | undefined;
      let frame = 0;
      let previousView: string | undefined;
      let previousZoom: string | undefined;
      const render = () => {
        if (previous !== bonesRef.current) {
          rig.update(bonesRef.current);
          edges.forEach(([parent, child], i) => {
            rig.heads[parent].toArray(lines, i * 6);
            rig.heads[child].toArray(lines, i * 6 + 3);
          });
          rig.heads.forEach((head, i) => head.toArray(joints, i * 3));
          geometry.attributes.position.needsUpdate = true;
          geometry.computeVertexNormals();
          geometry.computeBoundingSphere();
          stickGeometry.attributes.position.needsUpdate = true;
          stickGeometry.computeBoundingSphere();
          jointsGeometry.attributes.position.needsUpdate = true;
          jointsGeometry.computeBoundingSphere();
          previous = bonesRef.current;
        }
        const selected = data.labels.indexOf(selectedRef.current);
        highlight.visible = selected >= 0;
        if (selected >= 0) highlight.position.copy(rig.heads[selected]);
        mesh.visible = showMeshRef.current;
        const { view, zoom } = cameraRef.current;
        if (view !== previousView || zoom !== previousZoom) {
          const y = zoom === "upper" ? 1.25 : zoom === "lower" ? 0.55 : 0.9;
          const distance = zoom === "full" ? 3.1 : 2.1;
          camera.position.set(view === "side" ? distance : view === "free" ? 0.4 : 0, y, view === "side" ? 0 : view === "back" ? -distance : distance);
          controls.target.set(0, y, 0);
          controls.autoRotate = view === "free";
          previousView = view; previousZoom = zoom;
        }
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      teardown = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        controls.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) object.geometry.dispose();
        });
        material.dispose(); stickMaterial.dispose(); jointsMaterial.dispose(); highlightMaterial.dispose();
        (grid.material as import("three").Material).dispose();
        renderer.dispose(); renderer.domElement.remove();
      };
      setStatus("");
      render();
    }
    void start().catch((error) => {
      if (!disposed) setStatus(`${error.message}. Run pnpm bodies:venv from the repository root.`);
    });
    return () => { disposed = true; abort.abort(); teardown?.(); };
  }, [sex, revision]);

  return <div className="vitals-pose-live-rig">
    <label style={{ fontSize: 12 }}><input type="checkbox" checked={showMesh} onChange={(event) => setShowMesh(event.target.checked)} /> Show live mesh · pink left · blue right</label>
    {status && <p role="status">{status}</p>}
    <div ref={hostRef} style={{ width: "100%", height: "100%", minHeight: 280, touchAction: "none" }} />
  </div>;
}
