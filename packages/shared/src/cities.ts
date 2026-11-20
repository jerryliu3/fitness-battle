import { countryFlagEmoji } from "./countries";

export interface CityOption {
  slug: string;
  name: string;
  countryCode: string;
  aliases?: readonly string[];
  lat: number;
  lng: number;
}

export const CITY_SLUG_RE = /^[a-z]{2}:[a-z0-9-]{2,60}$/;

export const CITY_OPTIONS: readonly CityOption[] = [
  { slug: "us:new-york", name: "New York", countryCode: "US", aliases: ["nyc", "manhattan", "brooklyn", "queens"], lat: 40.7128, lng: -74.006 },
  { slug: "us:los-angeles", name: "Los Angeles", countryCode: "US", aliases: ["la", "santa monica"], lat: 34.0522, lng: -118.2437 },
  { slug: "us:san-francisco", name: "San Francisco", countryCode: "US", aliases: ["sf", "bay area", "oakland"], lat: 37.7749, lng: -122.4194 },
  { slug: "us:chicago", name: "Chicago", countryCode: "US", aliases: ["chi"], lat: 41.8781, lng: -87.6298 },
  { slug: "us:boston", name: "Boston", countryCode: "US", aliases: ["cambridge"], lat: 42.3601, lng: -71.0589 },
  { slug: "us:seattle", name: "Seattle", countryCode: "US", lat: 47.6062, lng: -122.3321 },
  { slug: "us:austin", name: "Austin", countryCode: "US", aliases: ["atx"], lat: 30.2672, lng: -97.7431 },
  { slug: "us:denver", name: "Denver", countryCode: "US", aliases: ["boulder"], lat: 39.7392, lng: -104.9903 },
  { slug: "us:miami", name: "Miami", countryCode: "US", lat: 25.7617, lng: -80.1918 },
  { slug: "us:washington-dc", name: "Washington, DC", countryCode: "US", aliases: ["dc", "washington"], lat: 38.9072, lng: -77.0369 },
  { slug: "us:philadelphia", name: "Philadelphia", countryCode: "US", aliases: ["philly"], lat: 39.9526, lng: -75.1652 },
  { slug: "us:atlanta", name: "Atlanta", countryCode: "US", aliases: ["atl"], lat: 33.749, lng: -84.388 },
  { slug: "us:portland", name: "Portland", countryCode: "US", aliases: ["pdx"], lat: 45.5152, lng: -122.6784 },
  { slug: "us:san-diego", name: "San Diego", countryCode: "US", lat: 32.7157, lng: -117.1611 },
  { slug: "us:minneapolis", name: "Minneapolis", countryCode: "US", aliases: ["twin cities"], lat: 44.9778, lng: -93.265 },
  { slug: "us:dallas", name: "Dallas", countryCode: "US", aliases: ["dfw"], lat: 32.7767, lng: -96.797 },
  { slug: "us:houston", name: "Houston", countryCode: "US", lat: 29.7604, lng: -95.3698 },
  { slug: "ca:toronto", name: "Toronto", countryCode: "CA", lat: 43.6532, lng: -79.3832 },
  { slug: "ca:vancouver", name: "Vancouver", countryCode: "CA", lat: 49.2827, lng: -123.1207 },
  { slug: "ca:montreal", name: "Montreal", countryCode: "CA", lat: 45.5017, lng: -73.5673 },
  { slug: "gb:london", name: "London", countryCode: "GB", lat: 51.5072, lng: -0.1276 },
  { slug: "gb:manchester", name: "Manchester", countryCode: "GB", lat: 53.4808, lng: -2.2426 },
  { slug: "gb:edinburgh", name: "Edinburgh", countryCode: "GB", lat: 55.9533, lng: -3.1883 },
  { slug: "fr:paris", name: "Paris", countryCode: "FR", lat: 48.8566, lng: 2.3522 },
  { slug: "de:berlin", name: "Berlin", countryCode: "DE", lat: 52.52, lng: 13.405 },
  { slug: "de:munich", name: "Munich", countryCode: "DE", aliases: ["munchen"], lat: 48.1351, lng: 11.582 },
  { slug: "nl:amsterdam", name: "Amsterdam", countryCode: "NL", lat: 52.3676, lng: 4.9041 },
  { slug: "es:madrid", name: "Madrid", countryCode: "ES", lat: 40.4168, lng: -3.7038 },
  { slug: "es:barcelona", name: "Barcelona", countryCode: "ES", aliases: ["bcn"], lat: 41.3874, lng: 2.1686 },
  { slug: "it:milan", name: "Milan", countryCode: "IT", aliases: ["milano"], lat: 45.4642, lng: 9.19 },
  { slug: "it:rome", name: "Rome", countryCode: "IT", aliases: ["roma"], lat: 41.9028, lng: 12.4964 },
  { slug: "ch:zurich", name: "Zurich", countryCode: "CH", lat: 47.3769, lng: 8.5417 },
  { slug: "ie:dublin", name: "Dublin", countryCode: "IE", lat: 53.3498, lng: -6.2603 },
  { slug: "se:stockholm", name: "Stockholm", countryCode: "SE", lat: 59.3293, lng: 18.0686 },
  { slug: "dk:copenhagen", name: "Copenhagen", countryCode: "DK", lat: 55.6761, lng: 12.5683 },
  { slug: "pt:lisbon", name: "Lisbon", countryCode: "PT", aliases: ["lisboa"], lat: 38.7223, lng: -9.1393 },
  { slug: "jp:tokyo", name: "Tokyo", countryCode: "JP", lat: 35.6762, lng: 139.6503 },
  { slug: "sg:singapore", name: "Singapore", countryCode: "SG", lat: 1.3521, lng: 103.8198 },
  { slug: "kr:seoul", name: "Seoul", countryCode: "KR", lat: 37.5665, lng: 126.978 },
  { slug: "hk:hong-kong", name: "Hong Kong", countryCode: "HK", aliases: ["hk"], lat: 22.3193, lng: 114.1694 },
  { slug: "au:sydney", name: "Sydney", countryCode: "AU", lat: -33.8688, lng: 151.2093 },
  { slug: "au:melbourne", name: "Melbourne", countryCode: "AU", lat: -37.8136, lng: 144.9631 },
  { slug: "nz:auckland", name: "Auckland", countryCode: "NZ", lat: -36.8509, lng: 174.7645 },
  { slug: "br:sao-paulo", name: "Sao Paulo", countryCode: "BR", lat: -23.5505, lng: -46.6333 },
  { slug: "mx:mexico-city", name: "Mexico City", countryCode: "MX", aliases: ["cdmx"], lat: 19.4326, lng: -99.1332 },
  { slug: "in:bengaluru", name: "Bengaluru", countryCode: "IN", aliases: ["bangalore"], lat: 12.9716, lng: 77.5946 },
  { slug: "za:cape-town", name: "Cape Town", countryCode: "ZA", lat: -33.9249, lng: 18.4241 },
];

const BY_SLUG = new Map(CITY_OPTIONS.map((c) => [c.slug, c]));

export function cityBySlug(slug?: string | null): CityOption | undefined {
  return slug ? BY_SLUG.get(slug.trim().toLowerCase()) : undefined;
}

export function cityLabel(slug?: string | null): string | null {
  if (!slug) return null;
  const norm = slug.trim().toLowerCase();
  const hit = BY_SLUG.get(norm);
  if (hit) {
    const flag = countryFlagEmoji(hit.countryCode);
    return `${flag ? `${flag} ` : ""}${hit.name}`;
  }
  const [cc, rest] = norm.split(":");
  if (!cc || !rest) return slug;
  const flag = countryFlagEmoji(cc);
  const name = rest.split("-").map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : "")).join(" ");
  return `${flag ? `${flag} ` : ""}${name}`;
}

export function filterCities(query: string, selectedSlug?: string | null): readonly CityOption[] {
  const q = query.trim().toLowerCase();
  const list = !q
    ? CITY_OPTIONS
    : CITY_OPTIONS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.includes(q) ||
          c.countryCode.toLowerCase() === q ||
          Boolean(c.aliases?.some((a) => a.includes(q))),
      );
  const selected = !q && selectedSlug ? cityBySlug(selectedSlug) : undefined;
  return selected ? [selected, ...list.filter((c) => c.slug !== selected.slug)] : list;
}

export function inferCitySlug(cityText?: string | null, countryCode?: string | null): string {
  const raw = (cityText ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (BY_SLUG.has(raw)) return raw;
  const base = raw.split(",")[0]!.trim();
  const cc = (countryCode ?? "").trim().toUpperCase();
  const match = (list: readonly CityOption[]) =>
    list.find((c) => c.name.toLowerCase() === base || Boolean(c.aliases?.includes(base)));
  const hit = (cc ? match(CITY_OPTIONS.filter((c) => c.countryCode === cc)) : undefined) ?? match(CITY_OPTIONS);
  return hit?.slug ?? "";
}
