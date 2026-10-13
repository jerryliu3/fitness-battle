export interface FitnessHttp {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

export function encodeForm(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString();
}

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`invalid_json:${response.status}`);
  }
}
