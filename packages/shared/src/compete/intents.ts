import { isValidIanaTimeZone } from "../timezone";
import { dayKey } from "./sports";
import { SPORT_IDS, PROVIDER_IDS, sportById, type SportId } from "./sports";
import { HEALTH_METRIC_IDS, type HealthMetricId } from "./health";
import type { Action } from "./engine";
import type { CategoryFocus } from "./health";
import type { UnitSystem } from "./sports";
import type { ProviderId } from "./sports";
import { RANK_SYMBOLS, type RankSymbolId } from "../rank-symbols";
import type { CrewBoardPin } from "./sports";

export const PHASE_A_COMPETE_INTENT_TYPES = [
  "rename",
  "set-city",
  "set-avatar",
  "set-units",
  "set-timezone",
  "complete-onboarding",
  "declare-effort",
  "opt-in",
  "opt-out",
  "schedule-leave",
  "resume-renewal",
  "opt-in-health",
  "opt-out-health",
  "freeze",
  "unfreeze",
  "set-primary",
  "set-focus",
  "set-training-goal",
  "clear-training-goal",
  "set-disposition",
] as const satisfies readonly Action["type"][];

export const PHASE_B_COMPETE_INTENT_TYPES = [
  "log-manual",
  "log-sleep",
  "acknowledge-reveal",
  "set-rank-symbol",
  "set-crew-board",
  "clear-crew-board",
  "complete-lesson",
  "link",
  "unlink",
] as const satisfies readonly Action["type"][];

export const COMPETE_ACCOUNT_INTENT_TYPES = [
  ...PHASE_A_COMPETE_INTENT_TYPES,
  ...PHASE_B_COMPETE_INTENT_TYPES,
] as const satisfies readonly Action["type"][];

export const COMPETE_SYNC_ACTION_TYPES = [
  "apply-sync",
  "sync",
  "import-history",
] as const satisfies readonly Action["type"][];

export const COMPETE_BATCH_SAVE_TYPES = [
  ...COMPETE_ACCOUNT_INTENT_TYPES,
  ...COMPETE_SYNC_ACTION_TYPES,
] as const satisfies readonly Action["type"][];

/** Tracker batches plus actions that still need a full account document on save. */
export const COMPETE_DOCUMENT_SAVE_TYPES = [
  ...COMPETE_SYNC_ACTION_TYPES,
  "duel",
  "debug-close-week",
] as const satisfies readonly Action["type"][];

export type PhaseACompeteIntentType = (typeof PHASE_A_COMPETE_INTENT_TYPES)[number];
export type CompeteAccountIntentType = (typeof COMPETE_ACCOUNT_INTENT_TYPES)[number];
export type CompeteBatchSaveType = (typeof COMPETE_BATCH_SAVE_TYPES)[number];

const accountIntentSet = new Set<string>(COMPETE_ACCOUNT_INTENT_TYPES);
const batchSaveSet = new Set<string>(COMPETE_BATCH_SAVE_TYPES);
const phaseASet = new Set<string>(PHASE_A_COMPETE_INTENT_TYPES);
const rankSymbolSet = new Set<string>(RANK_SYMBOLS.map((row) => row.id));

export function isCompeteAccountIntentType(type: string): type is CompeteAccountIntentType {
  return accountIntentSet.has(type);
}

export function isCompeteBatchSaveType(type: string): type is CompeteBatchSaveType {
  return batchSaveSet.has(type);
}

export function isPhaseACompeteIntentType(type: string): type is PhaseACompeteIntentType {
  return phaseASet.has(type);
}

export function isCompeteAccountIntentAction(action: Pick<Action, "type">): boolean {
  return isCompeteAccountIntentType(action.type);
}

export function isPhaseACompeteIntentAction(action: Pick<Action, "type">): boolean {
  return isPhaseACompeteIntentType(action.type);
}

export function isCompeteDocumentSaveAction(action: Pick<Action, "type">): boolean {
  return (COMPETE_DOCUMENT_SAVE_TYPES as readonly string[]).includes(action.type);
}

function isCrewBoardPin(value: unknown): value is CrewBoardPin {
  if (!value || typeof value !== "object") return false;
  const pin = value as CrewBoardPin;
  return (
    typeof pin.crewId === "string" &&
    /^[0-9a-f-]{36}$/i.test(pin.crewId) &&
    typeof pin.crewName === "string" &&
    typeof pin.sport === "string" &&
    SPORT_IDS.includes(pin.sport as SportId) &&
    typeof pin.waveStart === "string" &&
    typeof pin.weekEnd === "string"
  );
}

/** Strip client payloads down to fields the server may apply for account intents. */
export function normalizeCompeteIntent(
  raw: Action,
  userId: string,
  nowIso: string,
): Action {
  if (!isCompeteAccountIntentType(raw.type)) throw new Error("invalid_intent");
  const now = new Date(nowIso);
  const base = { type: raw.type, accountId: userId, now: nowIso };
  switch (raw.type) {
    case "rename":
      if (typeof raw.name !== "string" || !raw.name.trim()) throw new Error("invalid_intent");
      return { ...base, name: raw.name.trim().slice(0, 80) };
    case "set-city":
      if (typeof raw.city !== "string") throw new Error("invalid_intent");
      return { ...base, city: raw.city.trim().slice(0, 80) };
    case "set-avatar":
      return {
        ...base,
        avatarUrl:
          raw.avatarUrl === null || typeof raw.avatarUrl === "string"
            ? raw.avatarUrl
            : null,
      };
    case "set-units":
      if (raw.units !== "metric" && raw.units !== "us") throw new Error("invalid_intent");
      return { ...base, units: raw.units as UnitSystem };
    case "set-timezone": {
      const tz = typeof raw.timezone === "string" ? raw.timezone.trim() : "";
      if (!tz || !isValidIanaTimeZone(tz)) throw new Error("invalid_intent");
      return { ...base, timezone: tz };
    }
    case "declare-effort":
      if(!raw.sport||!SPORT_IDS.includes(raw.sport)||typeof raw.declaredWeeklyVolume!=="number"||!Number.isFinite(raw.declaredWeeklyVolume)||raw.declaredWeeklyVolume<0)throw new Error("invalid_intent");
      return {...base,sport:raw.sport,declaredWeeklyVolume:raw.declaredWeeklyVolume};
    case "complete-onboarding":
      return base;
    case "set-primary":
      if (!raw.sport || !SPORT_IDS.includes(raw.sport)) throw new Error("invalid_intent");
      return { ...base, sport: raw.sport as SportId };
    case "set-focus":
      if (
        !raw.focus ||
        (raw.focus.family === "sport" && !SPORT_IDS.includes(raw.focus.id)) ||
        (raw.focus.family === "health" && !HEALTH_METRIC_IDS.includes(raw.focus.id))
      ) {
        throw new Error("invalid_intent");
      }
      return { ...base, focus: raw.focus as CategoryFocus };
    case "opt-in":
      if (!raw.sport || !SPORT_IDS.includes(raw.sport)) throw new Error("invalid_intent");
      return { ...base, sport: raw.sport as SportId, crewBoard: raw.crewBoard ?? null };
    case "opt-out":
      if (!raw.sport || !SPORT_IDS.includes(raw.sport)) throw new Error("invalid_intent");
      return { ...base, sport: raw.sport as SportId };
    case "schedule-leave":
    case "resume-renewal":
      if (raw.sport && SPORT_IDS.includes(raw.sport)) {
        return { ...base, sport: raw.sport as SportId };
      }
      if (raw.metric && HEALTH_METRIC_IDS.includes(raw.metric)) {
        return { ...base, metric: raw.metric as HealthMetricId };
      }
      throw new Error("invalid_intent");
    case "opt-in-health":
    case "opt-out-health":
      if (!raw.metric || !HEALTH_METRIC_IDS.includes(raw.metric)) throw new Error("invalid_intent");
      return { ...base, metric: raw.metric as HealthMetricId };
    case "freeze":
    case "unfreeze":
      return base;
    case "set-training-goal":
      if (
        !raw.goalDistance ||
        !["5k", "10k", "half", "marathon"].includes(raw.goalDistance)
      ) {
        throw new Error("invalid_intent");
      }
      return { ...base, goalDistance: raw.goalDistance, deadline: raw.deadline };
    case "clear-training-goal":
      return base;
    case "set-disposition":
      if (
        typeof raw.activityId !== "string" ||
        !raw.activityId ||
        (raw.disposition !== "counted" &&
          raw.disposition !== "pending" &&
          raw.disposition !== "excluded")
      ) {
        throw new Error("invalid_intent");
      }
      return {
        ...base,
        activityId: raw.activityId,
        disposition: raw.disposition,
        syncPresentation: raw.syncPresentation,
      };
    case "log-manual": {
      if (!raw.sport || !SPORT_IDS.includes(raw.sport)) throw new Error("invalid_intent");
      if (
        typeof raw.activityId !== "string" ||
        !raw.activityId.startsWith("manual-") ||
        raw.activityId.length > 240
      ) {
        throw new Error("invalid_intent");
      }
      const movingSec = raw.movingSec ?? NaN;
      const distanceM = sportById(raw.sport).gps ? raw.distanceM ?? NaN : 0;
      if (
        !Number.isFinite(movingSec) ||
        movingSec <= 0 ||
        movingSec > 86400 ||
        !Number.isFinite(distanceM) ||
        distanceM < 0 ||
        distanceM > 2_000_000
      ) {
        throw new Error("invalid_intent");
      }
      const startedAt = raw.startedAt ?? nowIso;
      const at = Date.parse(startedAt);
      if (
        !Number.isFinite(at) ||
        at > now.getTime() ||
        dayKey(new Date(at)) !== dayKey(now)
      ) {
        throw new Error("invalid_intent");
      }
      return {
        ...base,
        sport: raw.sport,
        activityId: raw.activityId,
        movingSec,
        distanceM,
        startedAt: new Date(at).toISOString(),
      };
    }
    case "log-sleep": {
      const durationMin = raw.durationMin ?? 7 * 60 + 20;
      if (!Number.isFinite(durationMin) || durationMin < 0 || durationMin > 1440) {
        throw new Error("invalid_intent");
      }
      const score = raw.score;
      if (score != null && (!Number.isFinite(score) || score < 0 || score > 100)) {
        throw new Error("invalid_intent");
      }
      return { ...base, durationMin, score };
    }
    case "acknowledge-reveal": {
      const revealIds = raw.revealIds?.filter((id): id is string => typeof id === "string" && id.length > 0);
      if (!revealIds?.length) throw new Error("invalid_intent");
      return { ...base, revealIds: revealIds.slice(0, 40) };
    }
    case "set-rank-symbol": {
      if (raw.rankSymbol != null && !rankSymbolSet.has(raw.rankSymbol)) {
        throw new Error("invalid_intent");
      }
      return { ...base, rankSymbol: raw.rankSymbol as RankSymbolId | null };
    }
    case "set-crew-board": {
      if (!isCrewBoardPin(raw.crewBoard)) throw new Error("invalid_intent");
      return { ...base, crewBoard: raw.crewBoard };
    }
    case "clear-crew-board":
      return base;
    case "complete-lesson":
      return base;
    case "link":
    case "unlink": {
      if (!raw.provider || !PROVIDER_IDS.includes(raw.provider as ProviderId)) {
        throw new Error("invalid_intent");
      }
      return { ...base, provider: raw.provider as ProviderId };
    }
    default:
      throw new Error("invalid_intent");
  }
}

export function serializeCompeteIntent(action: Action): Action {
  if (!isCompeteAccountIntentAction(action)) throw new Error("invalid_intent");
  const { accountId: _a, now: _n, ...rest } = action;
  void _a;
  void _n;
  return rest as Action;
}

/** @deprecated Use serializeCompeteIntent */
export const serializePhaseAIntent = serializeCompeteIntent;