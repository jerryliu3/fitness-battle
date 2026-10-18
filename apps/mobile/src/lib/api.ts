import { fetchWithTimeout } from "./fetch-with-timeout";
/** Bearer-authenticated transport shared by native account and crew flows. */
export async function requestApi<T = Record<string, unknown>>(
  apiUrl: string,
  token: string | null,
  path: string,
  options: { method?: string; body?: unknown; allowUnpersisted?: boolean } = {},
): Promise<T> {
  if (!token) throw new Error("A live signed-in account is required.");
  const response = await fetchWithTimeout(
    `${apiUrl.replace(/\/$/, "")}${path}`,
    {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
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
      body?.error ?? "Could not reach Overtaek. Please try again.",
    );
  if (!body)
    throw new Error("Received an incomplete response. Please try again.");
  return body as T;
}
