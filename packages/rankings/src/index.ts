export {
  ROAD_DISTANCES,
  SEX_CATEGORIES,
  categoryKey,
  normalizeAthleteName,
  normalizeBib,
  resultFingerprint,
  type FingerprintInput,
  type RoadDistance,
  type SexCategory,
} from "./fingerprint";
export {
  competitionSourceUrl,
  isUnder18AgeGroup,
  parseOpenTrackCompetition,
  type ImportableResult,
  type OpenTrackCompetition,
  type OpenTrackImport,
} from "./opentrack";
export { formatRaceTime, parseRaceTimeMs } from "./time";
export {
  MAJOR_EVENTS,
  PUBLIC_LIST_REUSE,
  UNRESOLVED_MAJOR_EVENTS,
  type CatalogEvent,
} from "./ingest/catalog";
export { parseResultsCsv } from "./ingest/csv";
export { mikaListUrl, parseMikaTimingList } from "./ingest/mikatiming";
export { editionFromOpenTrack } from "./ingest/opentrack-import";
export { fetchRunSignupResults, parseRunSignupResults, runSignupResultsUrl, runSignupResultSetsUrl } from "./ingest/runsignup";
export { readResultPages } from "./ingest/pagination";
export { editionImportSql, snapshotIdentity } from "./ingest/sql";
export type { IngestedEdition, IngestedFinish } from "./ingest/types";
