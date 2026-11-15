import type { Action } from "./engine";
import type { CompeteState } from "./sports";

/** Drop set-disposition rows that an apply-sync in the same batch already encodes. */
export function coalesceSaveActions(actions: Action[]): Action[] {
  const syncActivityIds = new Set<string>();
  for (const action of actions) {
    if (action.type !== "apply-sync") continue;
    for (const row of action.activities ?? []) syncActivityIds.add(row.id);
  }
  if (!syncActivityIds.size) return actions;
  return actions.filter(
    (action) =>
      action.type !== "set-disposition" ||
      !action.activityId ||
      !syncActivityIds.has(action.activityId),
  );
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

/** One intent batch when possible; document PUT only for recovery or empty action saves. */
export function accountSavePlan(
  pendingActions: Action[],
  state: CompeteState,
  pendingDocument = false,
): AccountSaveTarget[] {
  const steps: AccountSaveTarget[] = [];
  const actions = coalesceSaveActions(pendingActions);
  if (actions.length) steps.push({ kind: "actions", actions });
  if (pendingDocument || !pendingActions.length) {
    steps.push({ kind: "document", state });
  }
  return steps;
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
  const actionsDone = completed.some((step) => step.kind === "actions");
  const documentDone = completed.some((step) => step.kind === "document");
  return {
    actions: actionsDone ? [] : [...pendingActions],
    document: pendingDocument && !documentDone,
  };
}