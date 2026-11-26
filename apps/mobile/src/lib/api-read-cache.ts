import AsyncStorage from "@react-native-async-storage/async-storage";

// Memory cache + optional durable AsyncStorage persistence keyed by userId (never by JWT).
const MAX_ENTRIES = 40;
const PERSIST_PREFIX = "fb-api-cache-v1";
type Entry = { scope: string; value?: unknown; storedAt: number; flight?: Promise<unknown> };
const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<(path?: string) => void>>();
const readKey = (scope: string, path: string) => JSON.stringify([scope, path]);

function persistKey(apiUrl: string, userId: string, path: string) {
  return `${PERSIST_PREFIX}:${apiUrl.replace(/\/$/, "")}:${userId}:${path}`;
}

export async function hydratePersistedApiRead<T>(
  apiUrl: string,
  userId: string,
  scope: string,
  path: string,
): Promise<T | undefined> {
  const existing = peekApiRead<T>(scope, path);
  if (existing !== undefined) return existing;
  try {
    const raw = await AsyncStorage.getItem(persistKey(apiUrl, userId, path));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { value?: T };
    if (parsed?.value === undefined) return undefined;
    const key = readKey(scope, path);
    const current = entries.get(key);
    if (current?.value !== undefined) return current.value as T;
    // Seed with storedAt: 0 so cached data renders immediately while background revalidation runs.
    entries.set(key, { scope, value: parsed.value, storedAt: 0, flight: current?.flight });
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    listeners.get(scope)?.forEach(listener => listener(path));
    return parsed.value;
  } catch {
    return undefined;
  }
}

export function writePersistedApiRead(apiUrl: string, userId: string, path: string, value: unknown) {
  void AsyncStorage.setItem(
    persistKey(apiUrl, userId, path),
    JSON.stringify({ value, storedAt: Date.now() }),
  ).catch(() => {});
}

export function apiReadScope(apiUrl: string, token: string) {
  return JSON.stringify([apiUrl.replace(/\/$/, ""), token]);
}

export function peekApiRead<T>(scope: string, path: string): T | undefined {
  return entries.get(readKey(scope, path))?.value as T | undefined;
}

export function subscribeApiReads(scope: string, listener: (path?: string) => void) {
  const group = listeners.get(scope) ?? new Set();
  group.add(listener);
  listeners.set(scope, group);
  return () => {
    group.delete(listener);
    if (!group.size) listeners.delete(scope);
  };
}

export function invalidateApiReads(scope: string) {
  // Removing entries also prevents pre-mutation requests from repopulating them.
  for (const [key, entry] of entries) if (entry.scope === scope) entries.delete(key);
  listeners.get(scope)?.forEach(listener => listener());
}

export function clearApiReads() {
  entries.clear();
}

export function cachedApiRead<T>(scope: string, path: string, maxAge: number, load: () => Promise<T>): Promise<T> {
  const key = readKey(scope, path);
  const existing = entries.get(key);
  if (existing?.flight) return existing.flight as Promise<T>;
  if (existing?.value !== undefined && Date.now() - existing.storedAt < maxAge)
    return Promise.resolve(existing.value as T);
  const entry: Entry = existing ?? { scope, storedAt: 0 };
  entries.set(key, entry);
  const flight = load().then(value => {
    // Invalidation/replacement wins even when an older request finishes later.
    if (entries.get(key) === entry) {
      entry.value = value;
      entry.storedAt = Date.now();
      listeners.get(scope)?.forEach(listener => listener(path));
    }
    return value;
  }).finally(() => {
    if (entry.flight === flight) entry.flight = undefined;
  });
  entry.flight = flight;
  // Evict oldest entries across sessions, without retaining credentials indefinitely.
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  return flight;
}
