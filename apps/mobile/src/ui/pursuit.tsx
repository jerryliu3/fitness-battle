import { stableFieldLanes, type ArenaLane } from "@fitness-battle/shared";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

export type CameraMode = "follow" | "above" | "avatar";

type Body = {
  id: string;
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
};

function mat(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
}

function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  parent.add(object);
  return object;
}

function limb(parent: THREE.Object3D, x: number, y: number, color: string) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  mesh(pivot, new THREE.CapsuleGeometry(0.07, 0.36, 4, 6), mat(color), 0, -0.24, 0);
  parent.add(pivot);
  return pivot;
}

function createRunner(id: string, you: boolean, index: number): Body {
  const group = new THREE.Group();
  const kit = you ? "#f6f253" : ["#40234e", "#726377", "#2f6f4e"][index % 3]!;
  const skin = ["#c28a61", "#68432f", "#e0ad92"][index % 3]!;
  mesh(group, new THREE.CapsuleGeometry(0.22, 0.42, 4, 8), mat(kit), 0, 1.15, 0);
  mesh(group, new THREE.SphereGeometry(0.16, 12, 10), mat(skin), 0, 1.72, 0);
  return {
    id,
    group,
    leftLeg: limb(group, -0.1, 0.82, you ? "#40234e" : "#2a1634"),
    rightLeg: limb(group, 0.1, 0.82, you ? "#40234e" : "#2a1634"),
    leftArm: limb(group, -0.28, 1.28, skin),
    rightArm: limb(group, 0.28, 1.28, skin),
  };
}

function pose(body: Body, distance: number) {
  const swing = Math.sin(distance * 7) * 0.7;
  body.leftLeg.rotation.x = swing;
  body.rightLeg.rotation.x = -swing;
  body.leftArm.rotation.x = -swing * 0.8;
  body.rightArm.rotation.x = swing * 0.8;
}

function worldZ(value: number): number {
  return value === 0 ? 0 : -value * 9;
}

export function Pursuit({
  lanes,
  index,
  showGhost,
  camera,
  onUnavailable,
}: {
  lanes: ArenaLane[];
  index: number;
  showGhost: boolean;
  camera: CameraMode;
  onUnavailable: () => void;
}) {
  const latest = useRef({ lanes, index, showGhost, camera, onUnavailable });
  latest.current = { lanes, index, showGhost, camera, onUnavailable };
  const stop = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const started = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current?.();
      stop.current = null;
    };
  }, []);

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    if (!mounted.current || started.current) return;
    started.current = true;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        clientWidth: gl.drawingBufferWidth,
        clientHeight: gl.drawingBufferHeight,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl as unknown as WebGL2RenderingContext,
        antialias: true,
        alpha: false,
      });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor("#efe4cf");
    } catch {
      started.current = false;
      latest.current.onUnavailable();
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#efe4cf");
    scene.fog = new THREE.Fog("#efe4cf", 36, 150);
    scene.add(new THREE.HemisphereLight("#fff9e9", "#726377", 2.2));
    const sun = new THREE.DirectionalLight("#ffe3c2", 2.6);
    sun.position.set(-14, 26, 15);
    scene.add(sun);
    scene.add(sun.target);

    const grass = mat("#e7d8bc");
    const roadMat = mat("#403246");
    const stripe = mat("#fffdf7");
    const ink = mat("#40234e");
    const floor = mesh(scene, new THREE.PlaneGeometry(80, 360), grass, 0, -0.12, 0);
    floor.rotation.x = -Math.PI / 2;
    const road = mesh(scene, new THREE.BoxGeometry(22, 0.12, 340), roadMat, 0, -0.02, 0);
    const stripes = Array.from({ length: 8 }, (_, stripeIndex) =>
      mesh(
        scene,
        new THREE.BoxGeometry(0.04, 0.02, 340),
        stripe,
        (stripeIndex - 3.5) * 2.4,
        0.05,
        0,
      ),
    );
    const start = new THREE.Group();
    scene.add(start);
    for (let mark = 0; mark < 16; mark += 1) {
      mesh(
        start,
        new THREE.BoxGeometry(22 / 16, 0.03, 0.7),
        mark % 2 ? ink : stripe,
        -11 + ((mark + 0.5) * 22) / 16,
        0.06,
        0,
      );
    }

    const field = stableFieldLanes(latest.current.lanes);
    const bodies = field.map((lane, laneIndex) => {
      const body = createRunner(lane.id, lane.you, laneIndex);
      scene.add(body.group);
      return body;
    });
    const ghostBody = createRunner("ghost", false, 1);
    ghostBody.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = 0.35;
        material.depthWrite = false;
      }
    });
    scene.add(ghostBody.group);

    const camera3 = new THREE.PerspectiveCamera(
      54,
      gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight),
      0.1,
      350,
    );
    let cameraMode: CameraMode | null = null;
    let lastYouZ = 0;
    let alive = true;
    let frame = 0;

    function update() {
      const props = latest.current;
      const lanesNow = stableFieldLanes(props.lanes);
      const you = lanesNow.find((lane) => lane.you) ?? lanesNow[0];
      if (!you) return;
      const yourZ = worldZ(you.values[props.index] ?? 0);
      const center = (lanesNow.length - 1) / 2;
      lanesNow.forEach((lane, laneIndex) => {
        const body = bodies.find((item) => item.id === lane.id);
        if (!body) return;
        const value = lane.values[props.index] ?? 0;
        body.group.position.set((laneIndex - center) * 2.4, 0, worldZ(value));
        pose(body, value);
      });
      const ghost = props.lanes.find((lane) => lane.ghost);
      ghostBody.group.visible = Boolean(props.showGhost && ghost);
      if (ghost) {
        const value = ghost.values[props.index] ?? 0;
        ghostBody.group.position.set(-0.85, 0, worldZ(value));
        pose(ghostBody, value);
      }
      floor.position.z = yourZ - 40;
      road.position.z = yourZ - 36;
      stripes.forEach((item) => {
        item.position.z = yourZ - 36;
      });
      if (props.camera !== cameraMode) {
        cameraMode = props.camera;
        if (props.camera === "follow") {
          camera3.position.set(2.4, 4.2, yourZ + 10);
          camera3.lookAt(0, 1.3, yourZ - 12);
        } else if (props.camera === "above") {
          camera3.position.set(0, 28, yourZ + 6);
          camera3.lookAt(0, 0, yourZ - 14);
        } else {
          camera3.position.set(0.7, 2.1, yourZ - 4.4);
          camera3.lookAt(0, 1.35, yourZ);
        }
      } else {
        camera3.position.z += yourZ - lastYouZ;
      }
      lastYouZ = yourZ;
      sun.position.set(-14, 26, yourZ + 15);
      sun.target.position.set(0, 0, yourZ - 8);
    }

    function loop() {
      if (!alive) return;
      frame = requestAnimationFrame(loop);
      try {
        update();
        renderer.render(scene, camera3);
        gl.endFrameEXP();
      } catch {
        alive = false;
        latest.current.onUnavailable();
      }
    }
    loop();

    stop.current = () => {
      alive = false;
      cancelAnimationFrame(frame);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => materials.add(item));
          else materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    };
    if (!mounted.current) stop.current();
  }

  return (
    <View style={styles.host}>
      <GLView msaaSamples={4} style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { height: 360, borderRadius: 16, overflow: "hidden" },
  gl: { flex: 1 },
});
