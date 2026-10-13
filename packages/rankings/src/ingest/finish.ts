import { categoryKey, normalizeAthleteName, normalizeBib } from "../fingerprint";
import { parseRaceTimeMs } from "../time";
import type { RoadDistance, SexCategory } from "../fingerprint";
import type { FinishStatus, IngestedFinish, IngestSkip } from "./types";

export function sexCode(value: string | null | undefined): SexCategory {
  const code = (value ?? "").trim().toUpperCase();
  if (!code) return "unknown";
  if (code === "F" || code === "W" || code.startsWith("FEM") || code === "WOMAN" || code === "WOMEN") {
    return "female";
  }
  if (code === "M" || code.startsWith("MALE") || code === "MAN" || code === "MEN") return "male";
  if (code === "X" || code === "NB" || code === "N" || code.includes("NON")) return "other";
  return "unknown";
}

export function finishStatusFromClock(clock: string): FinishStatus | null {
  const token = clock.trim().toUpperCase();
  if (token === "DNF") return "dnf";
  if (token === "DNS") return "dns";
  if (token === "DQ" || token === "DSQ" || token === "DISQ") return "dq";
  return null;
}

export function buildFinish(input: {
  externalResultId: string | null;
  athleteName: string;
  bib: string | null;
  sex: SexCategory;
  distance: RoadDistance;
  ageYears: number | null;
  chipTimeMs: number | null;
  gunTimeMs: number | null;
  finishStatus: FinishStatus;
  sourceUrl: string;
}): { finish: IngestedFinish } | { skip: IngestSkip } {
  if (input.ageYears != null && input.ageYears < 18) return { skip: "youth" };
  const name = input.athleteName.trim();
  if (!name) return { skip: "unparsed" };
  const hasTime =
    (input.chipTimeMs != null && input.chipTimeMs > 0) ||
    (input.gunTimeMs != null && input.gunTimeMs > 0);
  if (input.finishStatus === "finished" && !hasTime) return { skip: "unparsed" };
  return {
    finish: {
      externalResultId: input.externalResultId,
      athleteName: name,
      normalizedName: normalizeAthleteName(name),
      normalizedBib: normalizeBib(input.bib),
      sex: input.sex,
      distance: input.distance,
      ageYears: input.ageYears != null && input.ageYears >= 18 ? input.ageYears : null,
      chipTimeMs: input.chipTimeMs,
      gunTimeMs: input.gunTimeMs,
      finishStatus: input.finishStatus,
      categoryKey: categoryKey(input.distance, input.sex),
      sourceUrl: input.sourceUrl,
    },
  };
}

export function clocksFromText(chip: string | null, gun: string | null): {
  chipTimeMs: number | null;
  gunTimeMs: number | null;
  finishStatus: FinishStatus;
} | { skip: IngestSkip } {
  const chipStatus = chip ? finishStatusFromClock(chip) : null;
  const gunStatus = gun ? finishStatusFromClock(gun) : null;
  const finishStatus = chipStatus ?? gunStatus ?? "finished";
  const chipTimeMs = chip && !chipStatus ? parseRaceTimeMs(chip) : null;
  const gunTimeMs = gun && !gunStatus ? parseRaceTimeMs(gun) : null;
  if (finishStatus === "finished" && chipTimeMs == null && gunTimeMs == null) {
    return { skip: "unparsed" };
  }
  return { chipTimeMs, gunTimeMs, finishStatus };
}
