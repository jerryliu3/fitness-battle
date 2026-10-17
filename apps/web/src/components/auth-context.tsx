"use client";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";
import { hashString } from "@fitness-battle/shared";
import { markBootSplashSeen } from "@/shell/boot-gate";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  /** Require auth for an action; returns false if the user must sign in first. */
  requireAuth: () => boolean;
}

const AuthContext = createContext<AuthApi | null>(null);

function readDemoUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.email) return null;
    return { ...parsed, mode: "demo" };
  } catch {
    return null;
  }
}

function writeDemoUser(user: AuthUser | null) {
  if (user) localStorage.setItem(DEMO_KEY, JSON.stringify(user));
  else localStorage.removeItem(DEMO_KEY);
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
  const { configured } = getSupabaseConfig();
  const demoMode = webEnv.useDemoData || !configured;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (demoMode) {
        if (!cancelled) {
          setUser(readDemoUser());
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
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
        writeDemoUser(next);
        setUser(next);
        markBootSplashSeen();
        return {};
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      markBootSplashSeen();
      return {};
    },
    [demoMode],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (demoMode) {
        if (!input.email.trim() || input.password.length < 6) {
          return {
            error: "Enter an email and a password (6+ characters).",
          };
        }
        const next = demoUserFromEmail(
          input.email.trim().toLowerCase(),
          input.displayName,
        );
        writeDemoUser(next);
        setUser(next);
        markBootSplashSeen();
        return {};
      }
      const supabase = createClient();
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
      markBootSplashSeen();
      if (!data.session) return { needsEmailConfirm: true };
      return {};
    },
    [demoMode],
  );

  const signOut = useCallback(async () => {
    if (demoMode) {
      writeDemoUser(null);
      setUser(null);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, [demoMode]);

  const requireAuth = useCallback(() => Boolean(user), [user]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      demoMode,
      signIn,
      signUp,
      signOut,
      requireAuth,
    }),
    [user, loading, demoMode, signIn, signUp, signOut, requireAuth],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
