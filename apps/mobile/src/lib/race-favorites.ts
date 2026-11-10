import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import { createRaceFavorites, RACE_FAVORITES_KEY } from "@fitness-battle/shared";
const store = createRaceFavorites({
  read: () => AsyncStorage.getItem(RACE_FAVORITES_KEY),
  write: value => AsyncStorage.setItem(RACE_FAVORITES_KEY, value),
});
export function useRaceFavorites() {
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
  useEffect(() => { void store.load(); }, []);
  return {...state, toggle:store.toggle, reload:store.load};
}
