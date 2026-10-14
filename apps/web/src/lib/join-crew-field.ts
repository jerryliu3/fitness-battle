import type { CrewBoardPin, SportId } from "@fitness-battle/shared";

const SPORTS = new Set(["running", "cycling", "walking", "strength"]);

function asSport(value: string): SportId | null {
  return SPORTS.has(value) ? (value as SportId) : null;
}

/** Seat (or refresh) a crew week field and return the pin for this account. */
export async function fetchCrewFieldPin(input: {
  crewId?: string;
  sport?: SportId;
}): Promise<CrewBoardPin | null> {
  const response = await fetch("/api/crews/field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.crewId ? { crewId: input.crewId } : {}),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    fields?: { pin: CrewBoardPin }[];
  };
  const pins = body.fields?.map((row) => row.pin) ?? [];
  if (input.sport) {
    return pins.find((pin) => pin.sport === input.sport) ?? null;
  }
  return pins[0] ?? null;
}

export interface CrewJoinOption {
  id: string;
  name: string;
  sport: SportId;
  memberCount: number;
}

/** Active crews the signed-in user can optionally join a field with. */
export async function loadCrewJoinOptions(): Promise<CrewJoinOption[]> {
  const response = await fetch("/api/crews");
  if (!response.ok) return [];
  const body = (await response.json()) as {
    crews?: {
      crew_id: string;
      crews: {
        id: string;
        name: string;
        sport: string;
      } | null;
    }[];
    members?: { crew_id: string; user_id: string; status?: string }[];
  };
  const memberCount = new Map<string, number>();
  for (const row of body.members ?? []) {
    if (row.status && row.status !== "active") continue;
    memberCount.set(row.crew_id, (memberCount.get(row.crew_id) ?? 0) + 1);
  }
  return (body.crews ?? []).flatMap((row) => {
    const crew = row.crews;
    if (!crew) return [];
    const sport = asSport(crew.sport);
    if (!sport) return [];
    return [
      {
        id: crew.id,
        name: crew.name,
        sport,
        memberCount: memberCount.get(crew.id) ?? 1,
      },
    ];
  });
}
