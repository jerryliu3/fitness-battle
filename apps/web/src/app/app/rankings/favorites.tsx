"use client";
import { useEffect, useSyncExternalStore } from "react";
import { createRaceFavorites, RACE_FAVORITES_KEY } from "@fitness-battle/shared";
const store = createRaceFavorites({
  read: async () => localStorage.getItem(RACE_FAVORITES_KEY),
  write: async value => localStorage.setItem(RACE_FAVORITES_KEY, value),
});
export function useRaceFavorites() {
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
  useEffect(() => { void store.load(); }, []);
  return {...state, toggle:store.toggle, reload:store.load};
}
export function SaveRaceResult({id}: {id:number}) {
  const saved = useRaceFavorites();
  return <div className="race-save"><button aria-pressed={saved.ids.includes(id)} disabled={!saved.ready || saved.busy} onClick={() => void saved.toggle(id)}>{saved.ids.includes(id) ? "★ Saved" : "☆ Save result"}</button>{saved.error && <p role="alert">{saved.error}</p>}{!saved.ready && saved.error && <button onClick={() => void saved.reload()}>Retry</button>}</div>;
}
