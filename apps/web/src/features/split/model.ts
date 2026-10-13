/**
 * Re-export split board helpers from shared so web and mobile stay aligned.
 * Prefer importing from `@fitness-battle/shared` in new code.
 */
export {
  buildSplitBoard,
  laneAtCheckpoint,
  formatPts,
  deltaCopy,
  sourceFromLinks,
  type ComparisonMode,
  type TrackLane,
  type SplitBoardModel,
} from "@fitness-battle/shared";
