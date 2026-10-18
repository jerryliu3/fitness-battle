"use client";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";
import { hashString } from "@fitness-battle/shared";
import { markBootSplashSeen } from "@/shell/boot-gate";
import {
  DEMO_USER_COOKIE,
  parseDemoUserFromCookie,
  serializeDemoUserCookie,
} from "@/lib/auth/design-access";
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
  createdAt?: string;
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

function writeDemoCookie(user: AuthUser | null) {
  if (typeof document === "undefined") return;
  if (user) {
    const serialized = serializeDemoUserCookie(user);
    document.cookie = `${DEMO_USER_COOKIE}=${serialized}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = `${DEMO_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

function readDemoCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${DEMO_USER_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=").slice(1).join("=");
  const parsed = parseDemoUserFromCookie(value);
  if (!parsed) return null;
  return {
    id: parsed.id,
    email: parsed.email,
    displayName: parsed.displayName ?? parsed.email.split("@")[0] ?? "Athlete",
    mode: "demo",
  };
}

function readDemoUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed?.id && parsed?.email) {
        const u: AuthUser = { ...parsed, mode: "demo" };
        writeDemoCookie(u);
        return u;
      }
    } catch {
      // Ignore malformed localStorage and try cookie fallback
    }
  }
  const fromCookie = readDemoCookie();
  if (fromCookie) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(fromCookie));
    } catch {
      // Ignore localStorage errors
    }
    return fromCookie;
  }
  return null;
}

function writeDemoUser(user: AuthUser | null) {
  if (user) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(user));
    } catch {
      // Ignore localStorage errors
    }
  } else {
    try {
      localStorage.removeItem(DEMO_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }
  writeDemoCookie(user);
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
          createdAt: sessionUser.created_at,
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
          createdAt: next.created_at,
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
