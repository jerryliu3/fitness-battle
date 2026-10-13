import type { RoadDistance, SexCategory } from "../fingerprint";

export type FinishStatus = "finished" | "dnf" | "dns" | "dq" | "unknown";

/** One finisher ready for the rankings ledger. */
export type IngestedFinish = {
  externalResultId: string | null;
  athleteName: string;
  normalizedName: string;
  normalizedBib: string | null;
  sex: SexCategory;
  distance: RoadDistance;
  ageYears: number | null;
  chipTimeMs: number | null;
  gunTimeMs: number | null;
  finishStatus: FinishStatus;
  categoryKey: string;
  sourceUrl: string;
};

export type IngestedEdition = {
  sourceSlug: string;
  sourceName: string;
  accessMethod: string;
  reuseNotes: string;
  attribution: string;
  displayAllowed: boolean;
  externalEventId: string;
  eventName: string;
  editionYear: number;
  startsOn: string | null;
  sourceUrl: string;
  results: IngestedFinish[];
  skippedYouth: number;
  skippedUnparsed: number;
};

export type IngestSkip = "youth" | "unparsed";
