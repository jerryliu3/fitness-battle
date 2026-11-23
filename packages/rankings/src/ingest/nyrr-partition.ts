import { ISO3166_ALPHA3, US_STATE_PROVINCE_CODES } from "./nyrr-iso-countries";

/** NYRR caps unfiltered pagination; deeper pages require "advanced" filters. */
export const NYRR_PAGE_SIZE = 100;
/** Empirical cap: filtered NYRR queries reject pageIndex ≥ 6 (USA state slices). */
export const NYRR_MAX_PAGE_INDEX = 5;
export const NYRR_SLICE_ROW_LIMIT = NYRR_PAGE_SIZE * NYRR_MAX_PAGE_INDEX;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type NyrrQueryFilter = {
  gender?: "M" | "W" | "X";
  countryCode?: string;
  stateProvince?: string;
  /** Last-name prefix; only used after gender/country (and US state) are set. */
  searchString?: string;
};

/** Exclusive partitions when a slice exceeds NYRR_SLICE_ROW_LIMIT. */
export function nyrrChildFilters(parent: NyrrQueryFilter): NyrrQueryFilter[] {
  if (!parent.gender) return [{ gender: "M" }, { gender: "W" }, { gender: "X" }];
  if (!parent.countryCode) {
    return ISO3166_ALPHA3.map((countryCode) => ({ gender: parent.gender, countryCode }));
  }
  if (parent.countryCode === "USA" && !parent.stateProvince) {
    return US_STATE_PROVINCE_CODES.map((stateProvince) => ({
      gender: parent.gender,
      countryCode: parent.countryCode,
      stateProvince,
    }));
  }
  if (!parent.searchString) {
    return LETTERS.split("").map((letter) => ({ ...parent, searchString: letter }));
  }
  const prefix = parent.searchString;
  if (prefix.length >= 3) return [];
  return LETTERS.split("").map((letter) => ({ ...parent, searchString: `${prefix}${letter}` }));
}

export function nyrrNeedsSubdivision(totalItems: number): boolean {
  return totalItems > NYRR_SLICE_ROW_LIMIT;
}