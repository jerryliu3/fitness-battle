import type { Action } from "./engine";
import type { CompeteState } from "./sports";
import { MAX_SYNC_ACTIVITIES } from "./sync-intents";

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

export function partitionEnrollmentSaveActions(actions: Action[]): {
  edits: Action[];
  enrollments: Action[];
} {
  const edits: Action[] = [];
  const enrollments: Action[] = [];
  for (const action of actions) {
    if (ENROLLMENT_ACTIONS_AFTER_SETTLEMENT.has(action.type)) enrollments.push(action);
    else edits.push(action);
  }
  return { edits, enrollments };
}

/** Drop disposition intents superseded by a later activity choice in the same batch. */
export function coalesceSaveActions(actions: Action[]): Action[] {
  const lastChoiceIndex = new Map<string, number>();
  actions.forEach((action, index) => {
    if (action.type === "set-disposition" && action.activityId) {
      lastChoiceIndex.set(action.activityId, index);
    }
    if (action.type === "apply-sync") {
      for (const row of action.activities ?? []) lastChoiceIndex.set(row.id, index);
    }
  });
  return actions.filter((action, index) => {
    if (action.type !== "set-disposition" || !action.activityId) return true;
    return lastChoiceIndex.get(action.activityId) === index;
  });
}

export function splitApplySyncAction(action: Action): Action[] {
  if (action.type !== "apply-sync") return [action];
  const activities = action.activities ?? [];
  if (activities.length <= MAX_SYNC_ACTIVITIES) return [action];
  const parts: Action[] = [];
  for (let index = 0; index < activities.length; index += MAX_SYNC_ACTIVITIES) {
    parts.push({ ...action, activities: activities.slice(index, index + MAX_SYNC_ACTIVITIES) });
  }
  return parts;
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