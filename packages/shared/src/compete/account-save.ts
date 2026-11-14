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

/** Ordered client save steps: sync, intents, then full document when nothing else queued. */
export function accountSavePlan(
  pendingSync: Action | null,
  pendingIntents: Action[],
  state: CompeteState,
): AccountSaveTarget[] {
  const steps: AccountSaveTarget[] = [];
  if (pendingSync) steps.push({ kind: "sync", action: pendingSync });
  if (pendingIntents.length) steps.push({ kind: "intents", actions: pendingIntents });
  if (!pendingSync && !pendingIntents.length) steps.push({ kind: "document", state });
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
): Promise<{ response: Response; body: CompeteSaveResult | null }> {
  if (!steps.length) throw new Error("nothing_to_save");
  let response!: Response;
  let body: CompeteSaveResult | null = null;
  let revision = updatedAt;
  for (const step of steps) {
    const request = competeSaveRequest(step, accountId, revision);
    response = await fetcher(request.url, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
    });
    body = (await response.json().catch(() => null)) as CompeteSaveResult | null;
    if (!response.ok) return { response, body };
    if (typeof body?.updatedAt === "string") revision = body.updatedAt;
  }
  return { response, body };
}