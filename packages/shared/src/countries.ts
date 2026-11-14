/** ISO 3166-1 alpha-2 list for profile country (English names). */
export const COUNTRY_OPTIONS: readonly { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "ZA", name: "South Africa" },
  { code: "AE", name: "United Arab Emirates" },
] as const;

export function countryName(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  return COUNTRY_OPTIONS.find((row) => row.code === code.toUpperCase())?.name ?? null;
}

export function countryFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...upper].map((char) => base + char.charCodeAt(0) - 65),
  );
}

export function filterCountries(query: string): { code: string; name: string }[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...COUNTRY_OPTIONS];
  return COUNTRY_OPTIONS.filter(
    (row) =>
      row.name.toLowerCase().includes(needle) ||
      row.code.toLowerCase().includes(needle),
  );
}

/** Athlete card location: city text plus optional flag (country only when city missing). */
export function athleteLocationLine(
  city: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  const trimmed = city?.trim();
  const flag = countryFlagEmoji(countryCode);
  if (trimmed && flag) return `${trimmed} ${flag}`;
  if (trimmed) return trimmed;
  if (flag) return `${countryName(countryCode) ?? countryCode ?? ""} ${flag}`.trim();
  return "—";
}