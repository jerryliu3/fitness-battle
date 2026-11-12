import type { IngestedEdition } from "../ingest/types";

export type AcquisitionPreview = {
  extractedCount: number;
  skippedYouth: number;
  skippedUnparsed: number;
  expectedTotal: number | null;
  complete: boolean;
  bySex: Record<string, number>;
  byStatus: Record<string, number>;
  duplicateExternalIds: number;
  sampleRows: Array<{ name: string; bib: string | null; sex: string; timeMs: number | null }>;
  warnings: string[];
};

export function buildAcquisitionPreview(
  edition: IngestedEdition,
  options?: { expectedTotal?: number | null; authoritativeTotal?: number | null },
): AcquisitionPreview {
  const warnings: string[] = [];
  const bySex: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const seen = new Set<string>();
  let duplicateExternalIds = 0;

  for (const row of edition.results) {
    bySex[row.sex] = (bySex[row.sex] ?? 0) + 1;
    byStatus[row.finishStatus] = (byStatus[row.finishStatus] ?? 0) + 1;
    const key = row.externalResultId ?? `${row.normalizedName}:${row.normalizedBib ?? ""}`;
    if (seen.has(key)) duplicateExternalIds += 1;
    seen.add(key);
  }

  const expectedTotal = options?.expectedTotal ?? options?.authoritativeTotal ?? null;
  const extractedCount = edition.results.length;
  let complete = false;
  if (expectedTotal != null) {
    const accounted = extractedCount + edition.skippedYouth + edition.skippedUnparsed;
    complete = accounted === expectedTotal;
    if (!complete) {
      warnings.push(`Accounted ${accounted} rows vs expected ${expectedTotal}.`);
    }
  }

  if (duplicateExternalIds > 0) {
    warnings.push(`${duplicateExternalIds} duplicate external identities in extracted rows.`);
  }

  const sampleRows = edition.results.slice(0, 5).map((row) => ({
    name: row.athleteName,
    bib: row.normalizedBib,
    sex: row.sex,
    timeMs: row.chipTimeMs ?? row.gunTimeMs,
  }));

  return {
    extractedCount,
    skippedYouth: edition.skippedYouth,
    skippedUnparsed: edition.skippedUnparsed,
    expectedTotal,
    complete,
    bySex,
    byStatus,
    duplicateExternalIds,
    sampleRows,
    warnings,
  };
}
