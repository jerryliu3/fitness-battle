import type { CrewBoardPin, SportId } from "@fitness-battle/shared";

const SPORT_IDS = new Set<string>(["running", "cycling", "walking", "strength"]);

export function asSportId(value: string): SportId | null {
  return SPORT_IDS.has(value) ? (value as SportId) : null;
}

/** Read authorized Crew registration context; the account save queues the athlete. */
export async function seatCrewFieldPin(input: {
  crewId: string;
  sport?: SportId;
}): Promise<CrewBoardPin | null> {
  const response = await fetch("/api/crews/field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crewId: input.crewId }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { pin?: CrewBoardPin };
  const pin = body.pin ?? null;
  if (pin && input.sport && pin.sport !== input.sport) return null;
  return pin;
}

/** Refresh a pin already chosen for this week (no reseat write). */
export async function loadCrewFieldPin(
  crewId: string,
): Promise<CrewBoardPin | null> {
  const response = await fetch(
    `/api/crews/field?crewId=${encodeURIComponent(crewId)}`,
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { fields?: { pin: CrewBoardPin }[] };
  return body.fields?.[0]?.pin ?? null;
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
      crews: { id: string; name: string; sport: string } | null;
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
    const sport = asSportId(crew.sport);
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

function memberSignature(pin: CrewBoardPin): string {
  return [...pin.members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((member) =>
      [
        member.id,
        member.name,
        member.elo,
        member.distanceM ?? "",
        member.movingSec ?? "",
      ].join(":"),
    )
    .join("|");
}

export function pinsEqual(a: CrewBoardPin, b: CrewBoardPin): boolean {
  return (
    a.crewId === b.crewId &&
    a.waveStart === b.waveStart &&
    a.capacity === b.capacity &&
    a.memberIds.length === b.memberIds.length &&
    a.memberIds.every((id, index) => id === b.memberIds[index]) &&
    a.syntheticIds.length === b.syntheticIds.length &&
    a.syntheticIds.every((id, index) => id === b.syntheticIds[index]) &&
    memberSignature(a) === memberSignature(b)
  );
}
