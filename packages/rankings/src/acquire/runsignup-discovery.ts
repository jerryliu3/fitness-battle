import type { CandidateInput } from "./types";

export function discoveryDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function providerDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: |$)/.exec(value);
  return match ? discoveryDate(`${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`) : null;
}

export function runSignupCandidates(payload: unknown, from: string, through: string): CandidateInput[] {
  const races = (payload as { races?: unknown } | null)?.races;
  if (!Array.isArray(races)) throw new Error("RunSignup discovery response is missing the races array.");
  return races.flatMap(entry => {
    const race = entry?.race;
    if (!Number.isSafeInteger(race?.race_id) || race.race_id < 1 ||
        typeof race.name !== "string" || !race.name.trim() || !Array.isArray(race.race_event_days)) {
      throw new Error("RunSignup discovery response contains an invalid race.");
    }
    const days = new Set<string>();
    for (const day of race.race_event_days) {
      const start = providerDate(day?.start_date);
      const end = providerDate(day?.end_date);
      if (!start || !end || end < start) throw new Error(`Invalid event dates for RunSignup race ${race.race_id}.`);
      if (start >= from && end <= through) days.add(start);
    }
    return [...days].map(startsOn => ({
      eventName: race.name.trim(),
      discoveryKey: `runsignup:${race.race_id}:${startsOn}`,
      startsOn,
      editionYear: Number(startsOn.slice(0, 4)),
      locationText: [race.address?.city, race.address?.state, race.address?.country_code]
        .filter(part => typeof part === "string" && part.trim()).join(", ") || null,
      resultsUrls: [],
      discoverySource: `https://api.runsignup.com/rest/race/${race.race_id}`,
      unresolvedFields: ["edition_mapping", "distance", "final_result_set", "source_permission"],
    }));
  });
}
