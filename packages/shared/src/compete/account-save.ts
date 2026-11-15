import type { Action } from "./engine";
import type { CompeteState } from "./sports";
import { MAX_SYNC_ACTIVITIES, MAX_SYNC_READINESS, MAX_SYNC_SLEEP } from "./sync-intents";

export const MAX_SAVE_ACTIONS = 32;

/** Enrollment intents run only after canonical settlement on the server save path. */
const ENROLLMENT_ACTIONS_AFTER_SETTLEMENT = new Set<Action["type"]>([
  "opt-in",
  "opt-out",
  "opt-in-health",
  "opt-out-health",
  "schedule-leave",
  "resume-renewal",
  "set-crew-board",
  "clear-crew-board",
  "freeze",
  "unfreeze",
]);

export function isEnrollmentActionAfterSettlement(type: Action["type"]): boolean {
  return ENROLLMENT_ACTIONS_AFTER_SETTLEMENT.has(type);
}

export function saveActionsNeedEnrollmentSettlement(actions: Action[]): boolean {
  return actions.some((action) => isEnrollmentActionAfterSettlement(action.type));
}

/** Drop disposition intents that only repeat the same later sync choice. */
export function coalesceSaveActions(actions: Action[]): Action[] {
  return actions.filter((action, index) => {
    if (action.type !== "set-disposition" || !action.activityId || !action.disposition) return true;
    for (let later = index + 1; later < actions.length; later += 1) {
      const candidate = actions[later]!;
      if (candidate.type === "set-disposition" && candidate.activityId === action.activityId) {
        return false;
      }
      if (candidate.type !== "apply-sync") continue;
      const row = (candidate.activities ?? []).find((activity) => activity.id === action.activityId);
      if (!row) continue;
      if (row.disposition === action.disposition) return false;
      return true;
    }
    return true;
  });
}

function syncPartCount(length: number, max: number): number {
  return length > 0 ? Math.ceil(length / max) : 0;
}

export function splitApplySyncAction(action: Action): Action[] {
  if (action.type !== "apply-sync") return [action];
  const activities = action.activities ?? [];
  const sleepNights = action.sleepNights ?? [];
  const readiness = action.readiness ?? [];
  const parts = Math.max(
    syncPartCount(activities.length, MAX_SYNC_ACTIVITIES),
    syncPartCount(sleepNights.length, MAX_SYNC_SLEEP),
    syncPartCount(readiness.length, MAX_SYNC_READINESS),
    1,
  );
  if (
    parts === 1 &&
    activities.length <= MAX_SYNC_ACTIVITIES &&
    sleepNights.length <= MAX_SYNC_SLEEP &&
    readiness.length <= MAX_SYNC_READINESS
  ) {
    return [action];
  }
  const chunks: Action[] = [];
  for (let index = 0; index < parts; index += 1) {
    chunks.push({
      ...action,
      activities: activities.slice(
        index * MAX_SYNC_ACTIVITIES,
        (index + 1) * MAX_SYNC_ACTIVITIES,
      ),
      sleepNights: sleepNights.slice(index * MAX_SYNC_SLEEP, (index + 1) * MAX_SYNC_SLEEP),
      readiness: readiness.slice(
        index * MAX_SYNC_READINESS,
        (index + 1) * MAX_SYNC_READINESS,
      ),
    });
  }
  return chunks;
}

export function expandSaveActions(pending: Action[]): Action[] {
  return coalesceSaveActions(pending).flatMap(splitApplySyncAction);
}

export function chunkSaveActions(actions: Action[], max = MAX_SAVE_ACTIONS): Action[][] {
  const chunks: Action[][] = [];
  let current: Action[] = [];
  for (const action of actions) {
    if (current.length >= max) {
      chunks.push(current);
      current = [];
    }
    current.push(action);
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function planSaveActionBatches(pending: Action[]): Action[][] {
  return chunkSaveActions(expandSaveActions(pending));
}

/** Remove acknowledged network steps from the original pending user queue. */
export function remainingPendingSaveActions(
  pending: Action[],
  steps: AccountSaveTarget[],
  completedStepCount: number,
): Action[] {
  const planned = steps.filter((step) => step.kind === "actions");
  const completedActionSteps = steps
    .slice(0, completedStepCount)
    .filter((step) => step.kind === "actions").length;
  const done = planned.slice(0, completedActionSteps).flatMap((step) => step.actions);
  const expanded = expandSaveActions(pending);
  if (!done.length) return [...pending];
  if (done.length >= expanded.length) return [];
  return expanded.slice(done.length);
}

export type AccountSaveTarget =
  | { kind: "actions"; actions: Action[] }
  | { kind: "document"; state: CompeteState };

export type CompeteSaveResult = {
  ok?: boolean;
  persisted?: boolean;
  updatedAt?: string;
  state?: CompeteState;
  error?: string;
};

export type AccountSaveRunResult = {
  response: Response | null;
  body: CompeteSaveResult | null;
  revision: string | null;
  completedStepCount: number;
  transportError: boolean;
};

/** One or more intent batches, then document PUT only for recovery or empty action saves. */
export function accountSavePlan(
  pendingActions: Action[],
  state: CompeteState,
  pendingDocument = false,
): AccountSaveTarget[] {
  const steps: AccountSaveTarget[] = [];
  for (const actions of planSaveActionBatches(pendingActions)) {
    if (actions.length) steps.push({ kind: "actions", actions });
  }
  if (pendingDocument || !pendingActions.length) {
    steps.push({ kind: "document", state });
  }
  return steps;
}

export function isUnsaveableBatchError(error: string | undefined): boolean {
  return error === "invalid_intent" || error === "sync_batch_too_large" || error === "invalid_sync";
}

export function competeSaveRequest(
  target: AccountSaveTarget,
  accountId: string,
  updatedAt: string | null,
) {
  switch (target.kind) {
    case "actions":
      return {
        url: "/api/compete/intents",
        method: "POST" as const,
        body: { accountId, updatedAt, actions: target.actions },
      };
    case "document":
      return {
        url: "/api/compete",
        method: "PUT" as const,
        body: { accountId, updatedAt, state: target.state },
      };
  }
}

export async function runAccountSaveSteps(
  accountId: string,
  updatedAt: string | null,
  steps: AccountSaveTarget[],
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
): Promise<AccountSaveRunResult> {
  if (!steps.length) throw new Error("nothing_to_save");
  let response: Response | null = null;
  let body: CompeteSaveResult | null = null;
  let revision: string | null = updatedAt;
  let completedStepCount = 0;
  for (const step of steps) {
    const request = competeSaveRequest(step, accountId, revision);
    try {
      response = await fetcher(request.url, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      body = (await response.json().catch(() => null)) as CompeteSaveResult | null;
    } catch {
      return {
        response: null,
        body: null,
        revision,
        completedStepCount,
        transportError: true,
      };
    }
    if (!response.ok) {
      return { response, body, revision, completedStepCount, transportError: false };
    }
    completedStepCount += 1;
    if (typeof body?.updatedAt === "string") revision = body.updatedAt;
  }
  return { response, body, revision, completedStepCount, transportError: false };
}

export function dequeueAccountSaveWork(
  steps: AccountSaveTarget[],
  completedStepCount: number,
  pendingActions: Action[],
  pendingDocument: boolean,
): { actions: Action[]; document: boolean } {
  const completed = steps.slice(0, completedStepCount);
  const documentDone = completed.some((step) => step.kind === "document");
  return {
    actions: remainingPendingSaveActions(pendingActions, steps, completedStepCount),
    document: pendingDocument && !documentDone,
  };
}