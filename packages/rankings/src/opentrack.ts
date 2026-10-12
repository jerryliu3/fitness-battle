import { categoryKey, normalizeAthleteName, normalizeBib } from "./fingerprint";
import { parseRaceTimeMs } from "./time";
import type { RoadDistance, SexCategory } from "./fingerprint";

type OpenTrackResult = {
  bib?: string;
  performance?: string;
  place?: number;
};

type OpenTrackUnit = {
  status?: string;
  results?: OpenTrackResult[];
};

type OpenTrackEvent = {
  eventId?: string;
  eventCode?: string;
  name?: string;
  genders?: string;
  units?: OpenTrackUnit[];
};

type OpenTrackCompetitor = {
  competitorId?: string;
  ageGroup?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: string;
  otAthleteId?: string;
  teamName?: string;
  nationality?: string;
};

export type OpenTrackCompetition = {
  id?: string;
  fullName?: string;
  shortName?: string;
  slug?: string;
  date?: string;
  country?: string;
  events?: OpenTrackEvent[];
  competitors?: OpenTrackCompetitor[];
};

export type ImportableResult = {
  externalResultId: string;
  athleteName: string;
  normalizedName: string;
  normalizedBib: string | null;
  sex: SexCategory;
  distance: RoadDistance;
  ageGroup: string | null;
  gunTimeMs: number;
  categoryKey: string;
  sourceUrl: string;
};

export type OpenTrackImport = {
  competitionId: string;
  eventName: string;
  editionYear: number;
  startsOn: string;
  sourceUrl: string;
  results: ImportableResult[];
  skippedYouth: number;
  skippedUnparsed: number;
};

const DISTANCE_BY_CODE: Record<string, RoadDistance> = {
  "5K": "5k",
  "10K": "10k",
  HM: "half_marathon",
  HMAR: "half_marathon",
  MAR: "marathon",
  MARATHON: "marathon",
};

/** Age groups whose entire band is under 18. U20 stays, because it includes 18- and 19-year-olds. */
export function isUnder18AgeGroup(ageGroup: string | null | undefined): boolean {
  if (!ageGroup) return false;
  const match = /^U(\d+)$/i.exec(ageGroup.trim());
  return match != null && Number(match[1]) <= 18;
}

function sexFromCodes(gender: string | undefined, eventGenders: string | undefined): SexCategory {
  const code = (gender || eventGenders || "").toUpperCase();
  if (code.startsWith("F") || code === "W" || code.startsWith("N")) return "female";
  if (code.startsWith("M")) return "male";
  if (code === "X" || code.includes("NB")) return "other";
  return "unknown";
}

export function competitionSourceUrl(competition: OpenTrackCompetition): string {
  const country = competition.country || "GBR";
  const year = (competition.date || "").slice(0, 4) || "2025";
  const slug = competition.slug || "";
  return `https://data.opentrack.run/en-gb/x/${year}/${country}/${slug}/`;
}

export function parseOpenTrackCompetition(
  competition: OpenTrackCompetition,
  options?: { sourceUrl?: string },
): OpenTrackImport {
  const competitionId = competition.id;
  if (!competitionId) throw new Error("OpenTrack competition is missing id");
  const startsOn = competition.date;
  if (!startsOn) throw new Error("OpenTrack competition is missing date");
  const editionYear = Number(startsOn.slice(0, 4));
  const eventName = competition.fullName || competition.shortName || competition.slug || "Road race";
  const sourceUrl = options?.sourceUrl ?? competitionSourceUrl(competition);
  const competitors = new Map(
    (competition.competitors ?? []).map((competitor) => [competitor.competitorId, competitor]),
  );

  const results: ImportableResult[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;

  for (const event of competition.events ?? []) {
    const distance = event.eventCode ? DISTANCE_BY_CODE[event.eventCode.toUpperCase()] : undefined;
    if (!distance || !event.eventId) continue;
    for (const unit of event.units ?? []) {
      for (const result of unit.results ?? []) {
        const bib = result.bib?.trim();
        if (!bib) {
          skippedUnparsed += 1;
          continue;
        }
        const competitor = competitors.get(bib);
        if (isUnder18AgeGroup(competitor?.ageGroup)) {
          skippedYouth += 1;
          continue;
        }
        const gunTimeMs = result.performance ? parseRaceTimeMs(result.performance) : null;
        if (gunTimeMs == null || gunTimeMs <= 0) {
          skippedUnparsed += 1;
          continue;
        }
        const sex = sexFromCodes(competitor?.gender, event.genders);
        const athleteName =
          competitor?.fullName?.trim() ||
          [competitor?.firstName, competitor?.lastName].filter(Boolean).join(" ").trim() ||
          `Bib ${bib}`;
        results.push({
          externalResultId: `${competitionId}:${event.eventId}:${bib}`,
          athleteName,
          normalizedName: normalizeAthleteName(athleteName),
          normalizedBib: normalizeBib(bib),
          sex,
          distance,
          ageGroup: competitor?.ageGroup ?? null,
          gunTimeMs,
          categoryKey: categoryKey(distance, sex),
          sourceUrl,
        });
      }
    }
  }

  return {
    competitionId,
    eventName,
    editionYear,
    startsOn,
    sourceUrl,
    results,
    skippedYouth,
    skippedUnparsed,
  };
}
