import { parseOpenTrackCompetition, type OpenTrackCompetition } from "../opentrack";
import type { IngestedEdition, IngestedFinish } from "./types";

const OPENTRACK_REUSE =
  "OpenTrack asks organizers to publish under the Open Database License. This import uses that public download, which does not include dates of birth. Age groups that are entirely under 18 are not stored. Policy: https://opentrack.run/philosophy/opendata.html";

export function editionFromOpenTrack(
  competition: OpenTrackCompetition,
  options?: { sourceUrl?: string; storagePath?: string },
): IngestedEdition {
  const parsed = parseOpenTrackCompetition(competition, { sourceUrl: options?.sourceUrl });
  const results: IngestedFinish[] = parsed.results.map((row) => ({
    externalResultId: row.externalResultId,
    athleteName: row.athleteName,
    normalizedName: row.normalizedName,
    normalizedBib: row.normalizedBib,
    sex: row.sex,
    distance: row.distance,
    ageYears: null,
    chipTimeMs: null,
    gunTimeMs: row.gunTimeMs,
    finishStatus: "finished",
    categoryKey: row.categoryKey,
    sourceUrl: row.sourceUrl,
  }));
  return {
    sourceSlug: "opentrack",
    sourceName: "OpenTrack",
    accessMethod: "Public JSON download from the competition page",
    reuseNotes: OPENTRACK_REUSE,
    attribution:
      "© OpenTrack contributors. Open Database License: https://www.opendatacommons.org/licenses/odbl/",
    displayAllowed: true,
    externalEventId: parsed.competitionId,
    eventName: parsed.eventName,
    editionYear: parsed.editionYear,
    startsOn: parsed.startsOn,
    sourceUrl: parsed.sourceUrl,
    results,
    skippedYouth: parsed.skippedYouth,
    skippedUnparsed: parsed.skippedUnparsed,
  };
}
