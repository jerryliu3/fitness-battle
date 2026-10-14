import type { CrewBoardPin } from "../compete/sports";
import type { SportId } from "../compete/sports";
import { pickSynthetics } from "./synthetic-bank";
import type { PoolPlayer, WaveEnrollment } from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
import { waveWindowAt } from "./waves";

/** Stable seed so every crew mate draws the same synthetic fillers. */
export function crewFieldSeed(
  crewId: string,
  sport: SportId,
  waveStartIso: string,
): string {
  return `crew:${crewId}:${sport}:${waveStartIso}`;
}

export interface CrewFieldMember {
  id: string;
  name: string;
  elo: number;
  distanceM?: number;
  movingSec?: number;
}

export interface CrewWeekFieldPlan {
  crewId: string;
  sport: SportId;
  waveStart: string;
  weekEnd: string;
  capacity: number;
  /** All active members, stable-sorted, capped to capacity. */
  memberIds: string[];
  members: CrewFieldMember[];
  /** Shared synthetic fillers so every mate sees the same board size. */
  syntheticIds: string[];
}

/**
 * Plan one shared individual field for a crew this week.
 * Each member competes separately; seating is identical across mates.
 */
export function planCrewWeekField(input: {
  crewId: string;
  sport: SportId;
  members: readonly CrewFieldMember[];
  capacity?: number;
  now?: Date;
}): CrewWeekFieldPlan {
  const capacity = input.capacity ?? DEFAULT_GROUP_CAPACITY;
  const window = waveWindowAt(input.now ?? new Date());
  const waveStart = window.waveStart.toISOString();
  const weekEnd = window.weekEnd.toISOString();
  const seed = crewFieldSeed(input.crewId, input.sport, waveStart);

  const seated = [...input.members]
    .filter((member) => member.id.trim().length > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, capacity);
  const memberIds = seated.map((member) => member.id);
  const elos = seated.map((member) => member.elo).sort((a, b) => a - b);
  const medianElo =
    elos.length === 0 ? 1000 : elos[Math.floor((elos.length - 1) / 2)]!;

  const synthetics = pickSynthetics(
    input.sport,
    medianElo,
    Math.max(0, capacity - seated.length),
    memberIds,
    seed,
  );

  return {
    crewId: input.crewId,
    sport: input.sport,
    waveStart,
    weekEnd,
    capacity,
    memberIds,
    members: seated,
    syntheticIds: synthetics.map((rival) => rival.id),
  };
}

export function crewBoardPinFromPlan(
  plan: CrewWeekFieldPlan,
  crewName: string,
): CrewBoardPin {
  return {
    crewId: plan.crewId,
    crewName,
    sport: plan.sport,
    waveStart: plan.waveStart,
    weekEnd: plan.weekEnd,
    capacity: plan.capacity,
    memberIds: plan.memberIds,
    members: plan.members,
    syntheticIds: plan.syntheticIds,
  };
}

export function planFromCrewBoardPin(pin: CrewBoardPin): CrewWeekFieldPlan {
  return {
    crewId: pin.crewId,
    sport: pin.sport,
    waveStart: pin.waveStart,
    weekEnd: pin.weekEnd,
    capacity: pin.capacity,
    memberIds: pin.memberIds,
    members: pin.members,
    syntheticIds: pin.syntheticIds,
  };
}

/** Enrollment for one viewer from a shared crew field plan. */
export function enrollmentFromCrewPlan(
  plan: CrewWeekFieldPlan,
  viewerId: string,
  autoEnrollNext = true,
): WaveEnrollment {
  return {
    sport: plan.sport,
    waveStart: plan.waveStart,
    weekEnd: plan.weekEnd,
    capacity: plan.capacity,
    peerIds: plan.memberIds.filter((id) => id !== viewerId),
    syntheticIds: plan.syntheticIds,
    autoEnrollNext,
    crewId: plan.crewId,
  };
}

/** Pool rows for crew mates on the viewer's board (excluding the viewer). */
export function poolFromCrewPlan(
  plan: CrewWeekFieldPlan,
  viewerId: string,
): PoolPlayer[] {
  return plan.members
    .filter((member) => member.id !== viewerId)
    .map((member) => ({
      id: member.id,
      name: member.name,
      elo: member.elo,
      sport: plan.sport,
      waveStart: plan.waveStart,
      weekEnd: plan.weekEnd,
    }));
}
