/** MikaTiming prints "Last, First (USA)". Keep the person, drop the country code. */
export function personNameFromList(raw: string): string {
  const decoded = decodeHtml(raw).replace(/\s+/g, " ").trim();
  const withoutCountry = decoded.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
  const comma = withoutCountry.indexOf(",");
  if (comma === -1) return withoutCountry;
  const last = withoutCountry.slice(0, comma).trim();
  const first = withoutCountry.slice(comma + 1).trim();
  if (!first || !last) return withoutCountry;
  return `${first} ${last}`;
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/**
 * Divisions that cannot include an 18-year-old. Open bands such as 15-19 stay,
 * because they include adults, and no single age is stored.
 */
export function divisionIsUnder18(division: string | null | undefined): boolean {
  if (!division) return false;
  const text = division.trim();
  const under = /^U(\d+)$/i.exec(text);
  if (under) return Number(under[1]) <= 18;
  const range = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/.exec(text);
  if (!range) return false;
  return Number(range[2]) < 18;
}
