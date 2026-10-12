import { createHash } from "node:crypto";

export const ROAD_DISTANCES = ["5k", "10k", "half_marathon", "marathon"] as const;
export const SEX_CATEGORIES = ["female", "male", "other", "unknown"] as const;

export type RoadDistance = (typeof ROAD_DISTANCES)[number];
export type SexCategory = (typeof SEX_CATEGORIES)[number];

export type FingerprintInput = {
  sourceId: number;
  eventEditionId: number;
  normalizedName: string;
  normalizedBib: string | null;
  categoryKey: string;
};

function prefixed(value: string): string {
  return `${Buffer.byteLength(value, "utf8")}:${value}`;
}

/** Collapse whitespace and case. Callers pass the result into the fingerprint. */
export function normalizeAthleteName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Empty bibs become null so they share one fingerprint path. */
export function normalizeBib(bib: string | null | undefined): string | null {
  if (bib == null) return null;
  const trimmed = bib.trim().toUpperCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function categoryKey(distance: RoadDistance, sex: SexCategory): string {
  return `${distance}:${sex}`;
}

/**
 * Stable source-row identity. Finish time is intentionally absent.
 * Keep the byte layout in sync with private.result_fingerprint.
 */
export function resultFingerprint(input: FingerprintInput): string {
  const bib = input.normalizedBib ?? "";
  const payload = [
    prefixed(String(input.sourceId)),
    prefixed(String(input.eventEditionId)),
    prefixed(input.normalizedName),
    prefixed(bib),
    prefixed(input.categoryKey),
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
