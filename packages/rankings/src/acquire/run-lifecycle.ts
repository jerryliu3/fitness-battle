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

/** Preparation artifact patch. Set `releaseLease` when import SQL is not applied yet. */
export function buildPreparedRunPatch(
  input: {
    parserVersion: string;
    artifactDir: string;
    normalizedSha256: string;
    rawSha256: string;
    counts: Record<string, number>;
    warnings: string[];
  },
  options?: { releaseLease?: boolean },
): RunPatch {
  return {
    parser_version: input.parserVersion,
    artifact_dir: input.artifactDir,
    normalized_sha256: input.normalizedSha256,
    raw_sha256: input.rawSha256,
    counts: input.counts,
    warnings: input.warnings,
    publication_outcome: "prepared",
    ...(options?.releaseLease ? { status: "succeeded" as const } : {}),
  };
}

/** Same field names as `readStagedEditionBinding()` in acquire.mjs. */
export function buildStagedRunPatch(binding: { editionId: number; revision: number }): RunPatch {
  return {
    status: "succeeded",
    publication_outcome: "staged",
    staged_edition_id: binding.editionId,
    staged_revision: binding.revision,
  };
}

export function buildStageApplySql(
  runId: number,
  owner: string,
  mapping: { sourceSlug: string; externalEventId: string | null; editionYear: number },
  importSql: string,
): string {
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const externalEventId = mapping.externalEventId ?? "";
  return `begin;
${importSql.trim()}
select public.acquisition_bind_staged_run(
  ${runId},
  ${quote(owner)},
  ${quote(mapping.sourceSlug)},
  ${quote(externalEventId)},
  ${mapping.editionYear}
);
commit;
`;
}

export function buildFailedRunPatch(message: string): RunPatch {
  return {
    status: "failed",
    publication_outcome: "failed",
    error_summary: message,
  };
}
