/** Device-local bookmarks contain IDs only; display data always comes from public reads. */
export const RACE_FAVORITES_KEY = "overtaek:race-favorites:v1";
export function raceResultIds(value: unknown): number[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0))].slice(0, 100) : [];
}
type Snapshot = { ids: number[]; ready: boolean; busy: boolean; error: string };
export function createRaceFavorites(storage: { read(): Promise<string | null>; write(value: string): Promise<void> }) {
  let state: Snapshot = { ids: [], ready: false, busy: false, error: "" };
  const initial = state;
  const listeners = new Set<() => void>();
  function publish(next: Snapshot) { state = next; listeners.forEach(listener => listener()); }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => state,
    serverSnapshot: () => initial,
    async load() {
      if (state.ready || state.busy) return;
      publish({ ...state, busy: true, error: "" });
      try {
        const raw = await storage.read();
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("invalid favorites");
        publish({ ids: raceResultIds(parsed), ready: true, busy: false, error: "" });
      } catch { publish({ ...state, busy: false, error: "Saved results could not be loaded. Please retry." }); }
    },
    async toggle(id: number) {
      if (!state.ready || state.busy || !raceResultIds([id]).length) return;
      const previous = state.ids;
      if (!previous.includes(id) && previous.length >= 100) {
        publish({ ...state, error: "You can save up to 100 results. Remove one to save another." }); return;
      }
      const ids = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
      publish({ ids, ready: true, busy: true, error: "" });
      try { await storage.write(JSON.stringify(ids)); publish({ ids, ready: true, busy: false, error: "" }); }
      catch { publish({ ids: previous, ready: true, busy: false, error: "Changes could not be saved. Please retry." }); }
    },
  };
}
