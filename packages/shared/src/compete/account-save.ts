import type { Action } from "./engine";
import type { CompeteState } from "./sports";

export type AccountSaveTarget =
  | { kind: "sync"; action: Action }
  | { kind: "intents"; actions: Action[] }
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

/** Ordered client save steps: sync actions, intent batch, then document when required. */
export function accountSavePlan(
  pendingSync: Action[],
  pendingIntents: Action[],
  state: CompeteState,
  pendingDocument = false,
): AccountSaveTarget[] {
  const steps: AccountSaveTarget[] = pendingSync.map((action) => ({
    kind: "sync",
    action,
  }));
  if (pendingIntents.length) steps.push({ kind: "intents", actions: pendingIntents });
  if (pendingDocument || (!pendingSync.length && !pendingIntents.length)) {
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
    case "sync":
      return {
        url: "/api/compete/sync",
        method: "POST" as const,
        body: { accountId, updatedAt, action: target.action },
      };
    case "intents":
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

/** Drop acknowledged sync/intent/document work after a partial or full successful run. */
export function dequeueAccountSaveWork(
  steps: AccountSaveTarget[],
  completedStepCount: number,
  pendingSync: Action[],
  pendingIntents: Action[],
  pendingDocument: boolean,
): { sync: Action[]; intents: Action[]; document: boolean } {
  const completed = steps.slice(0, completedStepCount);
  const completedSync = completed.filter((step) => step.kind === "sync").length;
  const intentsDone = completed.some((step) => step.kind === "intents");
  const documentDone = completed.some((step) => step.kind === "document");
  return {
    sync: pendingSync.slice(completedSync),
    intents: intentsDone ? [] : [...pendingIntents],
    document: pendingDocument && !documentDone,
  };
}