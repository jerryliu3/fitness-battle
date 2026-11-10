import type { IngestedFinish } from "./types";

export type ResultsPage = {
  results: IngestedFinish[];
  /** Upstream rows before age/status/parse filtering. */
  inputCount: number;
  /** Identity of every upstream row, including excluded rows. */
  rowKeys: string[];
  skippedYouth: number;
  skippedUnparsed: number;
};

/** Only an empty upstream page proves exhaustion; providers may cap page sizes. */
export async function readResultPages<T extends ResultsPage>(
  fetchPage: (page: number) => Promise<T>,
  maxPages = 800,
): Promise<T[]> {
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error("Invalid page limit.");
  const pages: T[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= maxPages; page += 1) {
    const parsed = await fetchPage(page);
    if (parsed.inputCount !== parsed.rowKeys.length) throw new Error("Incomplete page accounting.");
    if (parsed.inputCount === 0) return pages;
    if (parsed.skippedUnparsed > 0) throw new Error(`Unparsed results on page ${page}; import held.`);
    for (const key of parsed.rowKeys) {
      if (seen.has(key)) throw new Error(`Repeated result on page ${page}; import held.`);
      seen.add(key);
    }
    pages.push(parsed);
  }
  throw new Error(`Page limit (${maxPages}) reached without an empty page; import held.`);
}
