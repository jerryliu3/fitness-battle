export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function candidateDedupeKey(input: {
  eventName: string;
  editionYear: number | null;
  resultsUrls: string[];
}): string {
  const name = input.eventName.trim().toLowerCase().replace(/\s+/g, " ");
  const year = input.editionYear ?? 0;
  const primaryUrl = input.resultsUrls.map(normalizeUrl).sort()[0] ?? "";
  return `${name}|${year}|${primaryUrl}`;
}
