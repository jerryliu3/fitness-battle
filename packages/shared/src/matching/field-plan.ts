import type { CrewBoardMember, CrewBoardPin, SportId } from "../compete/sports";
import type { WaveEnrollment } from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
import { pickSynthetics } from "./synthetic-bank";

export interface WeekFieldPlanInput {
  sport: SportId;
  waveStart: string;
  weekEnd: string;
  capacity?: number;
  crewId?: string | null;
  crewName?: string;
  members: readonly CrewBoardMember[];
  seed?: string;
}

/**
 * Plan a unified week field for either solo or crew play.
 * Real members occupy seats; synthetic rivals fill gaps up to capacity.
 */
export function planWeekField(input: WeekFieldPlanInput): CrewBoardPin {
  const capacity = input.capacity ?? DEFAULT_GROUP_CAPACITY;
  const isCrew = Boolean(input.crewId && input.crewId !== "solo" && !input.crewId.startsWith("field:"));
  const crewId = input.crewId ?? "solo";
  const crewName = input.crewName ?? (isCrew ? "Crew Field" : "Open Field");
  const seed = input.seed ?? `${crewId}:${input.sport}:${input.waveStart}`;

  const seated = [...input.members]
    .filter((m) => m.id.trim().length > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, capacity);
  const memberIds = seated.map((m) => m.id);
  const elos = seated.map((m) => m.elo).sort((a, b) => a - b);
  const medianElo = elos.length === 0 ? 1000 : elos[Math.floor((elos.length - 1) / 2)]!;

  const synthetics = pickSynthetics(
    input.sport,
    medianElo,
    Math.max(0, capacity - seated.length),
    memberIds,
    seed,
  );

  return {
    crewId,
    crewName,
    sport: input.sport,
    waveStart: input.waveStart,
    weekEnd: input.weekEnd,
    capacity,
    memberIds,
    members: seated,
    syntheticIds: synthetics.map((s) => s.id),
  };
}

/**
 * Check if a field pin applies to an enrollment.
 * Crew enrollments require the matching crewId.
 * Solo enrollments match open solo fields.
 */
export function fieldPinMatchesEnrollment(
  pin: CrewBoardPin | null | undefined,
  enrollment: WaveEnrollment,
): boolean {
  if (!pin) return false;
  if (pin.sport !== enrollment.sport) return false;
  if (pin.waveStart && enrollment.waveStart && pin.waveStart !== enrollment.waveStart) {
    return false;
  }
  if (enrollment.crewId) {
    return pin.crewId === enrollment.crewId;
  }
  // Solo enrollment: matches open fields (crewId is 'solo', null, or field:*)
  return (
    !pin.crewId ||
    pin.crewId === "solo" ||
    pin.crewName === "Open Field" ||
    pin.crewId.startsWith("field:")
  );
}
