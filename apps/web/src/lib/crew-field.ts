import {
  DEFAULT_GROUP_CAPACITY,
  planCrewWeekField,
  type CrewBoardPin,
  type SportId,
} from "@fitness-battle/shared";

const SPORT_IDS = new Set(["running", "cycling", "walking", "strength"]);

export function asSportId(value: string): SportId | null {
  return SPORT_IDS.has(value) ? (value as SportId) : null;
}

export interface RosterRow {
  user_id: string;
  display_name: string;
  open_elo: number | string;
}

/** Build and optionally persist a shared individual field for one crew week. */
export function buildCrewBoardPin(input: {
  crewId: string;
  crewName: string;
  sport: SportId;
  roster: RosterRow[];
  now?: Date;
}): {
  pin: CrewBoardPin;
  waveStart: string;
  weekEnd: string;
  memberIds: string[];
  syntheticIds: string[];
  capacity: number;
} {
  const plan = planCrewWeekField({
    crewId: input.crewId,
    sport: input.sport,
    members: input.roster.map((row) => ({
      id: row.user_id,
      name: row.display_name || "Athlete",
      elo: Number(row.open_elo) || 1000,
    })),
    capacity: DEFAULT_GROUP_CAPACITY,
    now: input.now,
  });

  return {
    pin: {
      crewId: plan.crewId,
      crewName: input.crewName,
      sport: plan.sport,
      waveStart: plan.waveStart,
      weekEnd: plan.weekEnd,
      capacity: plan.capacity,
      memberIds: plan.memberIds,
      members: plan.members,
      syntheticIds: plan.syntheticIds,
    },
    waveStart: plan.waveStart,
    weekEnd: plan.weekEnd,
    memberIds: plan.memberIds,
    syntheticIds: plan.syntheticIds,
    capacity: plan.capacity,
  };
}
