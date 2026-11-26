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
  NYRR_MARATHON_2026,
  PUBLIC_LIST_REUSE,
  UNRESOLVED_MAJOR_EVENTS,
  type CatalogEvent,
} from "./ingest/catalog";
export { replayTimeZoneForEdition } from "./ingest/replay-time-zone";
export {
  CHECKPOINT_PROFILES,
  MARATHON_BOSTON,
  MARATHON_KM10,
  MARATHON_NYC,
  MARATHON_SF_MILES,
} from "./ingest/checkpoint-profiles";
export {
  CHRONOTRACK_CTLIVE_ORIGIN,
  chronotrackEntryUrl,
  chronotrackEntryResultFromHtml,
  chronotrackResultUrl,
  chronotrackResultsUrl,
  parseChronotrackResultsPage,
} from "./ingest/chronotrack";
export { chronotrackSplitsForProfile } from "./ingest/chronotrack-splits";
export { parseResultsCsv } from "./ingest/csv";
export { mikaListUrl, parseMikaTimingList } from "./ingest/mikatiming";
export { parseRaceDayTimingList, racedayTimingListUrl } from "./ingest/racedaytiming";
export {
  buildReplayCoursePoints,
  parseGpxTrkpts,
  parseMapMyRunRouteHtml,
  replayCourseFromGpx,
  replayCourseImportSql,
  REPLAY_DISTANCE_METRES,
  type ReplayCoursePoint,
} from "./ingest/replay-course";
export {
  mikaDetailUrl,
  mikaSplitsForProfile,
  parseMikaTimingDetailSplits,
  parseMikaTimingStartSeconds,
} from "./ingest/mikatiming-splits";
export {
  deriveNyrrStartAtIso,
  gunOffsetBackfillSql,
  localWallClockToIso,
  parseWallClockSeconds,
  performanceStartTimesUpdateSql,
  type GunOffsetBackfillTarget,
  type NyrrStartAtInput,
  type PerformanceStartTimeRow,
} from "./ingest/start-time";
export { splitImportSql, splitImportSqlForEdition, type SplitEditionTarget, type SplitImportRow } from "./ingest/splits-sql";
export { editionFromOpenTrack } from "./ingest/opentrack-import";
export { fetchRunSignupResults, parseRunSignupResults, runSignupResultsUrl, runSignupResultSetsUrl } from "./ingest/runsignup";
export { readResultPages } from "./ingest/pagination";
export { editionImportSql, snapshotIdentity, type EditionImportOptions } from "./ingest/sql";
export type { IngestedEdition, IngestedFinish } from "./ingest/types";
export { candidateDedupeKey, normalizeUrl } from "./acquire/dedupe";
export { buildAcquisitionPreview, type AcquisitionPreview } from "./acquire/preview";
export { assertPreviewAllowsApply } from "./acquire/validate";
export {
  buildFailedRunPatch,
  buildPreparedRunPatch,
  buildStageApplySql,
  buildStagedRunPatch,
  type RunPatch,
} from "./acquire/run-lifecycle";
export {
  upsertCandidateSql,
  upsertEditionMappingSql,
  upsertSourceDecisionSql,
} from "./acquire/sql";
export type {
  AcquisitionAdapter,
  CandidateInput,
  EditionMappingInput,
  SourceDecisionInput,
} from "./acquire/types";
export {
  NYRR_FINISHERS_API,
  assertNyrrPayloadNotChallenge,
  fetchNyrrFinishers,
  parseNyrrFinishersPage,
} from "./ingest/nyrr";
export {
  nyrrCompetitionClassFromFinisher,
  nyrrCompetitionClassFromResultDetails,
  NYRR_WHEELCHAIR_AGE_GRADE_MIN,
} from "./ingest/competition-class";
export type { CompetitionClass } from "./ingest/competition-class";
