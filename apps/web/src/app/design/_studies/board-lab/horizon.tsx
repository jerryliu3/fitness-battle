"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { orderedArenaLanes, POLISHED_IDENTITY, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import { boardGap, boardTicks, formatBoardValue, type BoardUnit } from "./model";

export interface HorizonProps {
  lanes: ArenaSceneLane[];
  view: ArenaViewWindow;
  unit: Exclude<BoardUnit, "pts">;
  selected: string;
  showGhost: boolean;
  above: boolean;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
}
interface WorldLabel { id: string; name: string; text: string; x: number; y: number; you?: boolean }

/** A real, on-demand Three.js world. The course is illustrative, not a GPS map or live race. */
export function Horizon(props: HorizonProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const invalidate = useRef<(() => void) | null>(null);
  const [labels, setLabels] = useState<WorldLabel[]>([]);
  const [ready, setReady] = useState(false);
  const signature = props.lanes.map(l => l.id).sort().join("|");

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const el: HTMLDivElement = element;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { latest.current.onUnavailable(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f4f4eb");
    scene.fog = new THREE.Fog("#f4f4eb", 65, 170);
    scene.add(new THREE.HemisphereLight("#fffdf1", "#76896c", 2.8));
    const sun = new THREE.DirectionalLight("#fff0d1", 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 45, bottom: -50, near: 1, far: 100 });
    sun.shadow.normalBias = .04;
    scene.add(sun, sun.target);
    const camera = new THREE.PerspectiveCamera(47, 1, .1, 230);
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textures: THREE.Texture[] = [];
    const material = (color: string, roughness = .9) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); materials.push(m); return m; };
    const groundMat = material("#e6ecdc"), trackMat = material("#eeeee4"), lineMat = material("#c7cdbf"), edgeMat = material("#ffffff");
    const wood = material("#89765c"), stone = material("#c9cbbb");
    const leaves = ["#789475", "#8ca17d", "#a8b58f", "#bac49c"].map(c => material(c));
    function geo<T extends THREE.BufferGeometry>(g: T): T { geometries.push(g); return g; }
    const cube = geo(new THREE.BoxGeometry(1, 1, 1));
    const sphere = geo(new THREE.SphereGeometry(1, 10, 7));
    const trunk = geo(new THREE.CylinderGeometry(.13, .19, 1, 7));
    function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
      const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.receiveShadow = true; parent.add(m); return m;
    }
    const ordered = orderedArenaLanes(latest.current.lanes);
    const spacing = 2.45, trackWidth = Math.max(9.8, ordered.length * spacing + 1.4);
    const floor = mesh(scene, cube, groundMat, 0, -.28, 0, 160, .4, 370);
    const course = mesh(scene, cube, trackMat, 0, -.04, 0, trackWidth, .15, 350);
    const highlightMat = new THREE.MeshStandardMaterial({ color: "#e6c663", transparent: true, opacity: .18, roughness: .7 }); materials.push(highlightMat);
    const highlight = mesh(scene, cube, highlightMat, 0, .045, 0, 2.25, .012, 350);
    const rails: THREE.Mesh[] = [];
    for (let i = 0; i <= ordered.length; i++) rails.push(mesh(scene, cube, i === 0 || i === ordered.length ? edgeMat : lineMat, (i - ordered.length / 2) * spacing, .055, 0, .025, .015, 350));
    // Recycled slots are assigned absolute course coordinates and deterministic scenery.
    const trees = Array.from({ length: 66 }, (_, i) => {
      const g = new THREE.Group(); scene.add(g);
      mesh(g, trunk, wood, 0, 1.1, 0, 1, 2.2, 1).castShadow = true;
      mesh(g, sphere, leaves[i % leaves.length]!, 0, 3.7, 0, 1.6, 2.4, 1.5).castShadow = true;
      mesh(g, sphere, leaves[(i + 1) % leaves.length]!, .6, 4.6, -.1, 1.3, 1.65, 1.25).castShadow = true;
      return g;
    });
    const shrubs = Array.from({ length: 42 }, (_, i) => mesh(scene, sphere, leaves[i % 4]!, 0, .3, 0, .7, .45, .7));
    const benches = Array.from({ length: 10 }, () => {
      const g = new THREE.Group(); scene.add(g);
      mesh(g, cube, wood, 0, .65, 0, 1.7, .14, .65).castShadow = true;
      mesh(g, cube, wood, 0, 1, -.3, 1.7, .55, .1);
      for (const x of [-.6, .6]) mesh(g, cube, stone, x, .3, 0, .12, .6, .5);
      return g;
    });
    const groundMarks = Array.from({ length: 70 }, () => mesh(scene, cube, lineMat, 0, .065, 0, trackWidth, .01, .035));
    const signPosts = Array.from({ length: 12 }, () => {
      const g = new THREE.Group(); scene.add(g);
      mesh(g, cube, wood, 0, 1, 0, .08, 2, .08);
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }); materials.push(mat);
      const board = mesh(g, geo(new THREE.PlaneGeometry(2.7, 1.35)), mat, 0, 2.1, 0);
      return { group: g, canvas, texture, board, label: "" };
    });
    const capsuleGeometry = geo(new THREE.CapsuleGeometry(.34, .48, 8, 18));
    const racers = new Map<string, { group: THREE.Group; head: THREE.Mesh; ring: THREE.Mesh }>();
    const ringGeometry = geo(new THREE.TorusGeometry(.66, .025, 6, 40));
    const gold = POLISHED_IDENTITY.gold, platinum = POLISHED_IDENTITY.platinum;
    for (const lane of [...ordered, ...latest.current.lanes.filter(l => l.ghost)]) {
      const group = new THREE.Group(); scene.add(group);
      const mat = new THREE.MeshPhysicalMaterial({ color: lane.you ? gold : platinum, roughness: .17, metalness: .16, clearcoat: 1, clearcoatRoughness: .07, transparent: true, opacity: lane.ghost ? .2 : .9 }); materials.push(mat);
      const head = mesh(group, capsuleGeometry, mat, 0, .7, 0); head.rotation.x = .22; head.castShadow = true;
      const ring = mesh(group, ringGeometry, material(lane.you ? "#caa545" : "#8d9e97"), 0, .085, 0); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const echoMat = new THREE.MeshStandardMaterial({ color: lane.you ? gold : platinum, transparent: true, opacity: .15 - i * .03, roughness: .4 }); materials.push(echoMat);
        const echo = mesh(group, capsuleGeometry, echoMat, 0, .1, .85 + i * .44, 1, 1, .12); echo.rotation.x = Math.PI / 2;
      }
      racers.set(lane.id, { group, head, ring });
    }
    let disposed = false;
    const scaleFor = (unit: HorizonProps["unit"]) => unit === "mi" ? 18 * 1.609344 : 18;
    const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
    function render() {
      if (disposed || el.clientWidth === 0 || el.clientHeight === 0) return;
      const p = latest.current;
      const scale = scaleFor(p.unit), center = -p.view.center * scale;
      const lanes = orderedArenaLanes(p.lanes), you = lanes.find(l => l.you);
      const selfIndex = Math.max(0, lanes.findIndex(l => l.you));
      const selfX = (selfIndex - (lanes.length - 1) / 2) * spacing;
      floor.position.z = course.position.z = highlight.position.z = center;
      highlight.position.x = selfX;
      for (const rail of rails) rail.position.z = center;
      const firstTree = Math.floor(-center / 7) - 10;
      trees.forEach((g, i) => {
        const index = firstTree + Math.floor(i / 2), side = i % 2 ? 1 : -1;
        g.position.set(side * (trackWidth / 2 + 3 + random(index * 2 + i % 2) * 10), 0, -index * 7);
        const height = .7 + random(index * 3 + i % 2) * .65;
        g.scale.setScalar(height);
        (g.children[1] as THREE.Mesh).material = leaves[Math.floor(random(index * 7 + i % 2) * 4)]!;
        (g.children[2] as THREE.Mesh).material = leaves[Math.floor(random(index * 11 + i % 2) * 4)]!;
      });
      shrubs.forEach((m, i) => { const index = firstTree + Math.floor(i / 2); m.position.set((i % 2 ? 1 : -1) * (trackWidth / 2 + 1.1 + random(index + .2) * 2), .3, -index * 9 - 2); });
      benches.forEach((g, i) => { const index = Math.floor(-center / 25) - 3 + Math.floor(i / 2); g.position.set((i % 2 ? 1 : -1) * (trackWidth / 2 + 2), 0, -index * 25); });
      const ticks = boardTicks(p.view, 6);
      const subdivision = ticks.step * scale / 4;
      const quarter = Math.floor(p.view.center * scale / subdivision) - 12;
      groundMarks.forEach((m, i) => { const value = quarter + i; m.position.z = -value * subdivision; m.visible = value >= 0; m.material = value % 4 === 0 ? edgeMat : lineMat; m.scale.z = value % 4 === 0 ? .1 : .035; });
      signPosts.forEach((s, i) => {
        const value = ticks.values[i]; s.group.visible = value !== undefined;
        if (value === undefined) return;
        s.group.position.set(trackWidth / 2 + 1.5, 0, -value * scale);
        const label = `${Number(value.toFixed(2))} ${p.unit}`;
        if (s.label !== label) {
          const c = s.canvas.getContext("2d")!;
          c.fillStyle = "#fafaf4"; c.fillRect(0, 0, 256, 128);
          c.fillStyle = "#374333"; c.font = "500 42px sans-serif"; c.textAlign = "center"; c.fillText(label, 128, 78);
          s.label = label; s.texture.needsUpdate = true;
        }
      });
      const spanScale = Math.max(.7, p.view.span * scale / 108);
      const worldSpan = p.view.span * scale;
      const overheadHeight = Math.max(worldSpan, trackWidth / (el.clientWidth / el.clientHeight)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.14;
      camera.position.set(selfX + (p.above ? 0 : 1), p.above ? overheadHeight : 8.5 * Math.sqrt(spanScale), center + (p.above ? .01 : 18 * spanScale));
      camera.lookAt(selfX, 0, center - (p.above ? 0 : 17 * spanScale));
      camera.far = Math.max(230, overheadHeight + worldSpan * 2);
      scene.fog = new THREE.Fog("#f4f4eb", p.above ? overheadHeight * .95 : 65, p.above ? overheadHeight + worldSpan * 2 : 170);
      floor.scale.z = Math.max(370, worldSpan * 2.5); course.scale.z = highlight.scale.z = Math.max(350, worldSpan * 2.5);
      for (const rail of rails) rail.scale.z = course.scale.z;
      sun.position.set(-20, 35, center + 12); sun.target.position.set(0, 0, center - 12);
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      const nextLabels: WorldLabel[] = [];
      for (const lane of p.lanes) {
        const racer = racers.get(lane.id); if (!racer) continue;
        const i = lane.ghost ? selfIndex : lanes.findIndex(l => l.id === lane.id);
        racer.group.position.set((i - (lanes.length - 1) / 2) * spacing + (lane.ghost ? .7 : 0), 0, -lane.value * scale);
        racer.group.visible = !lane.ghost || p.showGhost;
        racer.ring.visible = lane.id === p.selected || Boolean(lane.you);
        if (!racer.group.visible || lane.ghost) continue;
        const anchor = racer.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)).project(camera);
        if (anchor.z < 1 && anchor.z > -1 && Math.abs(anchor.x) < .93 && Math.abs(anchor.y) < .85) nextLabels.push({ id: lane.id, name: lane.you ? "You" : lane.name.split(" ")[0]!, text: lane.you ? `${formatBoardValue(lane.value, p.unit)} ${p.unit}` : boardGap(lane.value, you?.value ?? 0, p.unit), x: (anchor.x + 1) / 2 * el.clientWidth, y: (1 - anchor.y) / 2 * el.clientHeight, you: lane.you });
      }
      // Keep labels separated vertically; all athletes remain selectable in the exact field list.
      nextLabels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < nextLabels.length; i++) if (Math.abs(nextLabels[i]!.x - nextLabels[i - 1]!.x) < 128 && nextLabels[i]!.y - nextLabels[i - 1]!.y < 48) nextLabels[i]!.y = nextLabels[i - 1]!.y + 48;
      setLabels(nextLabels.filter(l => l.y < el.clientHeight - 50));
      renderer.render(scene, camera);
    }
    invalidate.current = render;
    const observer = new ResizeObserver(render); observer.observe(el);
    const contextLost = (event: Event) => { event.preventDefault(); latest.current.onUnavailable(); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    render(); setReady(true);
    return () => {
      disposed = true; invalidate.current = null; observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  // The scene is rebuilt only if lane identities change; values/camera updates render on demand.
  }, [signature]);
  useEffect(() => { invalidate.current?.(); }, [props]);
  return <div className="bl-horizon" ref={host} aria-label="Illustrative 3D distance course, not live GPS. Exact totals are available below.">
    {!ready && <div className="bl-world-loading">Preparing the field…</div>}
    {labels.map(label => <button key={label.id} type="button" className={`bl-world-label ${label.you ? "is-you" : ""}`} style={{ left: label.x, top: label.y }} aria-pressed={props.selected === label.id} onClick={() => props.onSelect(label.id)}><strong>{label.name}</strong><span>{label.text}</span></button>)}
    <div className="bl-world-caption"><span className="bl-sun-dot"/> A shared course · distance, not live location</div>
  </div>;
}
