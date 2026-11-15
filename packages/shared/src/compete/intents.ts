import { SPORT_IDS, type SportId } from "./sports";
import { HEALTH_METRIC_IDS, type HealthMetricId } from "./health";
import type { Action } from "./engine";
import type { CategoryFocus } from "./health";
import type { UnitSystem } from "./sports";

export const PHASE_A_COMPETE_INTENT_TYPES = [
  "rename",
  "set-city",
  "set-avatar",
  "set-units",
  "complete-onboarding",
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

export type PhaseACompeteIntentType = (typeof PHASE_A_COMPETE_INTENT_TYPES)[number];

const phaseASet = new Set<string>(PHASE_A_COMPETE_INTENT_TYPES);

export function isPhaseACompeteIntentType(type: string): type is PhaseACompeteIntentType {
  return phaseASet.has(type);
}

export function isPhaseACompeteIntentAction(action: Pick<Action, "type">): boolean {
  return isPhaseACompeteIntentType(action.type);
}

/** Strip client payloads down to fields the server may apply for Phase A intents. */
export function normalizeCompeteIntent(
  raw: Action,
  userId: string,
  nowIso: string,
): Action {
  if (!isPhaseACompeteIntentType(raw.type)) throw new Error("invalid_intent");
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
    default:
      throw new Error("invalid_intent");
  }
}

export function serializePhaseAIntent(action: Action): Action {
  if (!isPhaseACompeteIntentAction(action)) throw new Error("invalid_intent");
  const { accountId: _a, now: _n, ...rest } = action;
  void _a;
  void _n;
  return rest as Action;
}
