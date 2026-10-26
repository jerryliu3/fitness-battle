import { crewRelayScene } from "./crew-relay-scene";
import {
  crewRelayIsEmpty,
  crewRelayRosterFootnote,
  type CrewRelayModel,
  type crewWeekRelay,
} from "./compete/crew-relay";
import { formatVolume } from "./compete/engine";
import type { SportId, UnitSystem } from "./compete/sports";

export type CrewWeekRelayView = ReturnType<typeof crewWeekRelay>;

export function crewRelaySegmentKey(model: CrewRelayModel): string {
  return model.segments.map((segment) => segment.id).join(",");
}

export function formatCrewRelayVolume(
  sessions: boolean,
  sport: SportId,
  value: number,
  units?: UnitSystem,
): string {
  return sessions
    ? `${value} sessions`
    : formatVolume(sport, value, 0, units);
}

export function crewRelaySelectedMember(
  model: CrewRelayModel,
  selected: string,
  userId?: string,
) {
  return (
    model.segments.find((segment) => segment.id === (selected || userId)) ??
    model.segments[0]
  );
}

export function crewRelayTrackWidth(
  containerWidth: number,
  model: CrewRelayModel,
): number {
  const laneMembers = Math.max(1, model.segments.length);
  return Math.max(containerWidth, laneMembers * 64 + 32);
}

export function buildCrewRelayViewState(
  relay: CrewWeekRelayView,
  options: {
    selected: string;
    userId?: string;
    containerWidth: number;
    scenePrefix: string;
    sport: SportId;
    units?: UnitSystem;
  },
) {
  const { model, sessions, kind, target, label, inactiveCount, rosterSize } =
    relay;
  const width = crewRelayTrackWidth(options.containerWidth, model);
  return {
    model,
    sessions,
    kind,
    target,
    label,
    empty: crewRelayIsEmpty(model),
    rosterFootnote: crewRelayRosterFootnote(
      sessions,
      inactiveCount,
      rosterSize,
    ),
    segmentKey: crewRelaySegmentKey(model),
    width,
    scene: crewRelayScene(model, width, options.scenePrefix),
    member: crewRelaySelectedMember(
      model,
      options.selected,
      options.userId,
    ),
    volume: (value: number) =>
      formatCrewRelayVolume(sessions, options.sport, value, options.units),
  };
}
