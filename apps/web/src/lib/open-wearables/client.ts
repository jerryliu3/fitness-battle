import { serverEnv } from "@/lib/env";

export interface OwUser {
  id: string;
  email?: string | null;
}

export interface OwConnection {
  provider: string;
  status: string;
  last_synced_at?: string | null;
}

export interface OwAuthorizeResponse {
  authorization_url: string;
  state?: string;
}

type Query = Record<string, string | number | undefined | null>;

function configured(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = serverEnv.openWearablesApiUrl?.replace(/\/$/, "");
  const apiKey = serverEnv.openWearablesApiKey;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

export function openWearablesConfigured(): boolean {
  return configured() != null;
}

export function openWearablesWhoopPilotEnabled(): boolean {
  return openWearablesConfigured() && serverEnv.openWearablesWhoop;
}

async function owFetch<T>(
  path: string,
  init: RequestInit & { query?: Query } = {},
): Promise<T> {
  const cfg = configured();
  if (!cfg) throw new Error("open_wearables_not_configured");
  const url = new URL(`${cfg.baseUrl}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers = new Headers(init.headers);
  headers.set("X-Open-Wearables-API-Key", cfg.apiKey);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`open_wearables_${response.status}:${text.slice(0, 200)}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createOwUser(email?: string | null): Promise<OwUser> {
  return owFetch<OwUser>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(email ? { email } : {}),
  });
}

export async function getOwAuthorizeUrl(
  provider: string,
  owUserId: string,
  redirectUri: string,
): Promise<OwAuthorizeResponse> {
  return owFetch<OwAuthorizeResponse>(`/api/v1/oauth/${provider}/authorize`, {
    query: { user_id: owUserId, redirect_uri: redirectUri },
  });
}

export async function listOwConnections(owUserId: string): Promise<OwConnection[]> {
  const body = await owFetch<OwConnection[] | { items?: OwConnection[]; data?: OwConnection[] }>(
    `/api/v1/users/${owUserId}/connections`,
  );
  if (Array.isArray(body)) return body;
  return body.items ?? body.data ?? [];
}

export async function revokeOwConnection(owUserId: string, provider: string): Promise<void> {
  await owFetch<void>(`/api/v1/users/${owUserId}/connections/${provider}`, {
    method: "DELETE",
  });
}

export async function triggerOwSync(
  provider: string,
  owUserId: string,
  dataType: "workouts" | "247" | "all" = "all",
): Promise<unknown> {
  return owFetch(`/api/v1/providers/${provider}/users/${owUserId}/sync`, {
    method: "POST",
    query: { data_type: dataType },
  });
}

interface Paginated<T> {
  data: T[];
  pagination?: { has_more?: boolean; next_cursor?: string | null };
}

export async function listOwWorkouts(
  owUserId: string,
  startDate: string,
  endDate: string,
  provider?: string,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const body = await owFetch<Paginated<unknown>>(`/api/v1/users/${owUserId}/events/workouts`, {
      query: {
        start_date: startDate,
        end_date: endDate,
        provider,
        cursor,
        limit: 100,
      },
    });
    items.push(...(body.data ?? []));
    if (!body.pagination?.has_more || !body.pagination.next_cursor) break;
    cursor = body.pagination.next_cursor;
  }
  return items;
}

export async function listOwHealthScores(
  owUserId: string,
  startDate: string,
  endDate: string,
  provider?: string,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    try {
      const body = await owFetch<Paginated<unknown> | { data?: unknown[]; items?: unknown[] }>(
        `/api/v1/users/${owUserId}/health-scores`,
        {
          query: {
            start_date: startDate,
            end_date: endDate,
            provider,
            cursor,
            limit: 100,
          },
        },
      );
      const pageItems = Array.isArray(body)
        ? body
        : ((body as Paginated<unknown>).data ??
          (body as { items?: unknown[] }).items ??
          []);
      items.push(...pageItems);
      const pagination = (body as Paginated<unknown>).pagination;
      if (!pagination?.has_more || !pagination.next_cursor) break;
      cursor = pagination.next_cursor;
    } catch {
      break;
    }
  }
  return items;
}
