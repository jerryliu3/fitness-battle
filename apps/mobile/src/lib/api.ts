import { fetchWithTimeout } from "./fetch-with-timeout";
import { apiReadScope, cachedApiRead, invalidateApiReads } from "./api-read-cache";
/** Bearer-authenticated transport shared by native account and crew flows. */
export async function requestApi<T = Record<string, unknown>>(
  apiUrl: string,
  token: string | null,
  path: string,
  options: { method?: string; body?: unknown; allowUnpersisted?: boolean; cacheMs?: number } = {},
): Promise<T> {
  if (!token) throw new Error("A live signed-in account is required.");
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const scope = apiReadScope(apiUrl, token);
  if (method === "GET" && options.cacheMs !== undefined)
    return cachedApiRead(scope, path, options.cacheMs, () =>
      requestApi<T>(apiUrl, token, path, { ...options, cacheMs: undefined }));
  const response = await fetchWithTimeout(
    `${apiUrl.replace(/\/$/, "")}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || (body?.persisted === false && !options.allowUnpersisted))
    throw new Error(
      body?.message ?? body?.error ?? "Could not reach Overtaek. Please try again.",
    );
  if (!body)
    throw new Error("Received an incomplete response. Please try again.");
  if (method !== "GET") invalidateApiReads(scope);
  return body as T;
}
