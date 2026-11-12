export type CandidateReviewStatus = "pending" | "approved" | "rejected" | "blocked";
export type SourceDecision = "pending" | "permitted" | "blocked";
export type AcquisitionAdapter = "nyrr" | "mikatiming" | "csv" | "runsignup" | "opentrack";
export type AcquisitionRunStatus = "queued" | "leased" | "succeeded" | "failed" | "blocked" | "cancelled";

export type CandidateInput = {
  eventName: string;
  officialWebsite?: string | null;
  editionYear?: number | null;
  startsOn?: string | null;
  locationText?: string | null;
  distances?: string[];
  resultsUrls: string[];
  discoverySource?: string;
  discoveredAt?: string;
  unresolvedFields?: string[];
};

export type EditionMappingInput = {
  candidateId: number;
  sourceDecisionId: number;
  adapter: AcquisitionAdapter;
  populationKey: string;
  externalEventId?: string | null;
  distanceSlug: "5k" | "10k" | "half_marathon" | "marathon";
  editionYear: number;
  eventName: string;
  startsOn?: string | null;
  sourceUrl: string;
  adapterConfig?: Record<string, unknown>;
  approvedBy?: string | null;
};

export type SourceDecisionInput = {
  candidateId?: number | null;
  sourceSlug: string;
  decision: SourceDecision;
  accessMethod?: string;
  storageAllowed?: boolean;
  displayAllowed?: boolean;
  attribution?: string;
  reuseNotes?: string;
  evidenceUrl?: string | null;
  reviewer?: string | null;
  notes?: string;
};
