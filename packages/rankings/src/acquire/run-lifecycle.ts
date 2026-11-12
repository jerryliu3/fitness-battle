export type RunPatch = {
  parser_version?: string;
  artifact_dir?: string;
  normalized_sha256?: string;
  raw_sha256?: string;
  counts?: Record<string, number>;
  warnings?: string[];
  publication_outcome?: string;
  error_summary?: string;
  staged_edition_id?: number;
  staged_revision?: number;
  status?: "succeeded" | "failed";
};

/** Preparation stays leased; terminal success happens only after optional SQL apply. */
export function buildPreparedRunPatch(input: {
  parserVersion: string;
  artifactDir: string;
  normalizedSha256: string;
  rawSha256: string;
  counts: Record<string, number>;
  warnings: string[];
}): RunPatch {
  return {
    parser_version: input.parserVersion,
    artifact_dir: input.artifactDir,
    normalized_sha256: input.normalizedSha256,
    raw_sha256: input.rawSha256,
    counts: input.counts,
    warnings: input.warnings,
    publication_outcome: "prepared",
  };
}

export function buildStagedRunPatch(input: {
  stagedEditionId: number;
  stagedRevision: number;
}): RunPatch {
  return {
    status: "succeeded",
    publication_outcome: "staged",
    staged_edition_id: input.stagedEditionId,
    staged_revision: input.stagedRevision,
  };
}

export function buildFailedRunPatch(message: string): RunPatch {
  return {
    status: "failed",
    publication_outcome: "failed",
    error_summary: message,
  };
}
