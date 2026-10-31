import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { mobileEnv } from "./env";

// Expo statically renders routes in Node, where AsyncStorage's web adapter
// cannot access localStorage. Native must still persist even without window.
const persistSession = Platform.OS !== "web" || typeof window !== "undefined";

export const supabase = createClient(
  mobileEnv.supabaseUrl,
  mobileEnv.supabaseAnonKey,
  {
    auth: {
      storage: persistSession ? AsyncStorage : undefined,
      autoRefreshToken: persistSession,
      persistSession,
      detectSessionInUrl: false,
    },
  },
);

// Instruct Supabase Auth to stop background refresh timers while suspended
// on mobile native, preventing stalled TCP connections and lock deadlocks on resume.
if (Platform.OS !== "web" && typeof AppState?.addEventListener === "function") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      if (typeof supabase.auth?.startAutoRefresh === "function") {
        void supabase.auth.startAutoRefresh();
      }
    } else {
      if (typeof supabase.auth?.stopAutoRefresh === "function") {
        void supabase.auth.stopAutoRefresh();
      }
    }
  });
}
