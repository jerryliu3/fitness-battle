import { hashString } from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";

const DEMO_KEY = "fb-demo-auth-v1";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  mode: "supabase" | "demo";
}

interface AuthApi {
  user: AuthUser | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
  requireAuth: () => boolean;
  accessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthApi | null>(null);

async function readDemoUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(DEMO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.email) return null;
    return { ...parsed, mode: "demo" };
  } catch {
    return null;
  }
}

async function writeDemoUser(user: AuthUser | null) {
  if (user) await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(DEMO_KEY);
}

function demoUserFromEmail(email: string, displayName?: string): AuthUser {
  const local = email.split("@")[0] || "Athlete";
  return {
    id: `demo-${hashString(email).toString(16)}`,
    email,
    displayName: displayName?.trim() || local,
    mode: "demo",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = mobileEnv.useDemoData || !mobileEnv.supabaseConfigured;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (demoMode) {
        const demo = await readDemoUser();
        if (!cancelled) {
          setUser(demo);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const sessionUser = data.user;
      if (sessionUser) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          displayName:
            (sessionUser.user_metadata?.display_name as string | undefined) ??
            sessionUser.email?.split("@")[0] ??
            "Athlete",
          mode: "supabase",
        });
      } else {
        setUser(null);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const next = session?.user;
        if (!next) {
          setUser(null);
          return;
        }
        setUser({
          id: next.id,
          email: next.email ?? "",
          displayName:
            (next.user_metadata?.display_name as string | undefined) ??
            next.email?.split("@")[0] ??
            "Athlete",
          mode: "supabase",
        });
      });
      return () => sub.subscription.unsubscribe();
    }

    const cleanup = boot();
    return () => {
      cancelled = true;
      void cleanup.then((fn) => fn?.());
    };
  }, [demoMode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (demoMode) {
        if (!email.trim() || password.length < 4) {
          return { error: "Enter an email and a password (4+ characters)." };
        }
        const next = demoUserFromEmail(email.trim().toLowerCase());
        await writeDemoUser(next);
        setUser(next);
        return {};
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    [demoMode],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (demoMode) {
        if (!input.email.trim() || input.password.length < 6) {
          return { error: "Enter an email and a password (6+ characters)." };
        }
        const next = demoUserFromEmail(
          input.email.trim().toLowerCase(),
          input.displayName,
        );
        await writeDemoUser(next);
        setUser(next);
        return {};
      }
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            display_name: input.displayName.trim() || input.email.split("@")[0],
          },
        },
      });
      if (error) return { error: error.message };
      if (!data.session) return { needsEmailConfirm: true };
      return {};
    },
    [demoMode],
  );

  const signOut = useCallback(async () => {
    if (demoMode) {
      await writeDemoUser(null);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [demoMode]);

  const requireAuth = useCallback(() => Boolean(user), [user]);

  const accessToken = useCallback(async () => {
    if (demoMode) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [demoMode]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      demoMode,
      signIn,
      signUp,
      signOut,
      requireAuth,
      accessToken,
    }),
    [user, loading, demoMode, signIn, signUp, signOut, requireAuth, accessToken],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
