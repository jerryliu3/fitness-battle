/** React Native's bundled AbortSignal has no static timeout() method. */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  milliseconds = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
