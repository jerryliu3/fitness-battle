import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
let enabled = false;
let preferenceLoaded = false;
const listeners = new Set<() => void>();
const preferenceKey = "overtaek:haptics:v1";
void AsyncStorage.getItem(preferenceKey).then(value => {
  if (preferenceLoaded) return;
  enabled = value !== "off"; preferenceLoaded = true;
  listeners.forEach(listener => listener());
}).catch(() => { preferenceLoaded = true; });
export function useHapticsEnabled() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => enabled, () => false);
}
export function setHapticsEnabled(value: boolean) {
  preferenceLoaded = true; enabled = value;
  listeners.forEach(listener => listener());
  void AsyncStorage.setItem(preferenceKey, value ? "on" : "off").catch(() => {});
}

export const hapticsEnabled = () => enabled;
export const subscribeHaptics = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
