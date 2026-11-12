import type { CrewBoardMember, CrewBoardPin, SportId } from "../compete/sports";
import type { WaveEnrollment } from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
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
 * Only the supplied accounts are seated.
 */
export function planWeekField(input: WeekFieldPlanInput): CrewBoardPin {
  const capacity = input.capacity ?? DEFAULT_GROUP_CAPACITY;
  const isCrew = Boolean(input.crewId && input.crewId !== "solo" && !input.crewId.startsWith("field:"));
  const crewId = input.crewId ?? "solo";
  const crewName = input.crewName ?? (isCrew ? "Crew Field" : "Open Field");

  const seated = [...input.members]
    .filter((m) => m.id.trim().length > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, capacity);
  const memberIds = seated.map((m) => m.id);

  return {
    crewId,
    crewName,
    sport: input.sport,
    waveStart: input.waveStart,
    weekEnd: input.weekEnd,
    capacity,
    memberIds,
    members: seated,
    syntheticIds: [],
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
  if (
    pin.waveStart &&
    enrollment.waveStart &&
    new Date(pin.waveStart).getTime() !== new Date(enrollment.waveStart).getTime()
  ) {
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
