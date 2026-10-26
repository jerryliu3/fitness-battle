"use client";
import { archiveLegacyDemo } from "@/lib/auth/legacy-demo";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";

import { accountDataOrigin, hashString, findDemoAccount } from "@fitness-battle/shared";
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
  dataOrigin?: "synthetic" | "recorded";
}

interface AuthApi {
  user: AuthUser | null;
  loading: boolean;
  offlineMode: boolean;
  legacyBackup: string | null;
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
    dataOrigin: "synthetic",
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
  const normalized = email.trim().toLowerCase();
  const demo = findDemoAccount(normalized);
  const local = normalized.split("@")[0] || "Athlete";
  const fallback = demo?.name ?? local;
  return {
    id: demo?.id ?? `demo-${hashString(normalized).toString(16)}`,
    email: normalized,
    displayName: displayName?.trim() || fallback,
    mode: "demo",
    dataOrigin: "synthetic",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { configured } = getSupabaseConfig();
  const offlineMode = !configured;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [legacyBackup, setLegacyBackup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (offlineMode) {
        if (!cancelled) {
          setUser(readDemoUser());
          setLoading(false);
        }
        return;
      }

      // Finish archiving before account state can hydrate under the same seeded UUID.
      try { setLegacyBackup(archiveLegacyDemo()); writeDemoCookie(null); }
      catch { setLegacyBackup(null); setLoading(false); return; }
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
          dataOrigin: accountDataOrigin(sessionUser.id),
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
        setUser((prev) => {
          const nextDisplayName =
            (next.user_metadata?.display_name as string | undefined) ??
            next.email?.split("@")[0] ??
            "Athlete";
          if (
            prev &&
            prev.id === next.id &&
            prev.email === (next.email ?? "") &&
            prev.displayName === nextDisplayName &&
            prev.mode === "supabase"
          ) {
            return prev;
          }
          return {
            id: next.id,
            email: next.email ?? "",
            displayName: nextDisplayName,
            mode: "supabase",
            dataOrigin: accountDataOrigin(next.id),
            createdAt: next.created_at,
          };
        });
      });
      return () => sub.subscription.unsubscribe();
    }

    const cleanup = boot();
    return () => {
      cancelled = true;
      void cleanup.then((fn) => fn?.());
    };
  }, [offlineMode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (offlineMode) {
        if (!email.trim() || password.length < 4) {
          return { error: "Enter an email and a password (4+ characters)." };
        }
        const next = demoUserFromEmail(email.trim().toLowerCase());
        writeDemoUser(next);
        setUser(next);
        return {};
      }
      try { setLegacyBackup(archiveLegacyDemo()); }
      catch { return { error: "Your local demo backup could not be saved. Free device storage and try again; your existing data is intact." }; }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    [offlineMode],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; displayName: string }) => {
      if (offlineMode) {
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
        return {};
      }
      try { setLegacyBackup(archiveLegacyDemo()); }
      catch { return { error: "Your local demo backup could not be saved. Free device storage and try again; your existing data is intact." }; }
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
      if (!data.session) return { needsEmailConfirm: true };
      return {};
    },
    [offlineMode],
  );

  const signOut = useCallback(async () => {
    if (offlineMode) {
      writeDemoUser(null);
      setUser(null);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, [offlineMode]);

  const requireAuth = useCallback(() => Boolean(user), [user]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      offlineMode,
      legacyBackup,
      signIn,
      signUp,
      signOut,
      requireAuth,
    }),
    [user, loading, offlineMode, legacyBackup, signIn, signUp, signOut, requireAuth],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
