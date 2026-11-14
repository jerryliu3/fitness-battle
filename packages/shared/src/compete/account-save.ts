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
  response: Response;
  body: CompeteSaveResult | null;
  revision: string | null;
  completedStepCount: number;
};

/** Ordered client save steps: each sync action, then intent batch, then document fallback. */
export function accountSavePlan(
  pendingSync: Action[],
  pendingIntents: Action[],
  state: CompeteState,
): AccountSaveTarget[] {
  const steps: AccountSaveTarget[] = pendingSync.map((action) => ({
    kind: "sync",
    action,
  }));
  if (pendingIntents.length) steps.push({ kind: "intents", actions: pendingIntents });
  if (!pendingSync.length && !pendingIntents.length) {
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
  let response!: Response;
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
        response: new Response(null, { status: 0, statusText: "network_error" }),
        body: null,
        revision,
        completedStepCount,
      };
    }
    if (!response.ok) return { response, body, revision, completedStepCount };
    completedStepCount += 1;
    if (typeof body?.updatedAt === "string") revision = body.updatedAt;
  }
  return { response, body, revision, completedStepCount };
}

/** Drop acknowledged sync/intent work after a partial or full successful run. */
export function dequeueAccountSaveWork(
  steps: AccountSaveTarget[],
  completedStepCount: number,
  pendingSync: Action[],
  pendingIntents: Action[],
): { sync: Action[]; intents: Action[] } {
  const completedSync = steps
    .slice(0, completedStepCount)
    .filter((step) => step.kind === "sync").length;
  const intentsDone = steps
    .slice(0, completedStepCount)
    .some((step) => step.kind === "intents");
  return {
    sync: pendingSync.slice(completedSync),
    intents: intentsDone ? [] : [...pendingIntents],
  };
}