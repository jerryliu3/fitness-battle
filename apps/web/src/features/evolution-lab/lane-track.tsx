"use client";

import { LaneTrack as FieldLanes } from "../field/components/lane-track";
import type { SceneRunner } from "../field/geometry";
import { ghost } from "../spatial-lab/model";
import { laneRunners } from "./model";
import "../field/field.css";

export interface SceneProps {
  time: number;
  extraKm: number;
  selected: string;
  showGhost: boolean;
  onSelect: (id: string) => void;
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

/** Design-lab lanes. The product track is the only scene implementation. */
export function LaneTrack(props: SceneProps) {
  return (
    <FieldLanes
      runners={laneRunners.map(toScene)}
      ghost={toScene({ ...ghost, you: false })}
      time={props.time}
      extra={props.extraKm}
      selected={props.selected}
      showGhost={props.showGhost}
      unit="km"
      onSelect={props.onSelect}
    />
  );
}
