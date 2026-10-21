import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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
