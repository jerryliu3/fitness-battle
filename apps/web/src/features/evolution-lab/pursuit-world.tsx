"use client";

import { LivePursuit } from "../field/components/live-pursuit";
import type { SceneRunner } from "../field/geometry";
import { ghost } from "../spatial-lab/model";
import { laneRunners, type AvatarLook, type CameraMode } from "./model";
import type { SceneProps } from "./lane-track";
import "../field/field.css";

interface Props extends SceneProps {
  camera: CameraMode;
  look: AvatarLook;
  onUnavailable: () => void;
}

function toScene(runner: {
  id: string;
  name: string;
  initials: string;
  you?: boolean;
  km: [number, number, number];
}): SceneRunner {
  return {
    id: runner.id,
    name: runner.name,
    initials: runner.initials,
    you: Boolean(runner.you),
    series: [0, ...runner.km],
  };
}

/** Design-lab pursuit. Shares the product world instead of a second copy. */
export function PursuitWorld(props: Props) {
  return (
    <LivePursuit
      runners={laneRunners.map(toScene)}
      ghost={toScene({ ...ghost, you: false })}
      time={props.time}
      extra={props.extraKm}
      selected={props.selected}
      showGhost={props.showGhost}
      camera={props.camera}
      look={props.look}
      unit="km"
      onSelect={props.onSelect}
      onUnavailable={props.onUnavailable}
    />
  );
}
