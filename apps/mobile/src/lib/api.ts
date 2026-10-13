import { mobileEnv } from "./env";
import { supabase } from "./supabase";

export async function apiFetch(
  path: string,
  init: RequestInit & { userId?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${mobileEnv.apiUrl}${path}`, {
    ...init,
    headers,
  });
}
