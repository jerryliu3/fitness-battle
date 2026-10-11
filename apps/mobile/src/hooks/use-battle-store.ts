import { useSyncExternalStore } from "react";
import { battleStore } from "../store/battle-store";

export function useBattleStore() {
  return useSyncExternalStore(
    battleStore.subscribe,
    () => battleStore,
    () => battleStore,
  );
}
