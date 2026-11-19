"use client";
import { archiveLegacyDemo } from "@/lib/auth/legacy-demo";

import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { webEnv } from "@/lib/env";

import {
  accountDataOrigin,
  buildGoogleIdTokenAuthorizeUrl,
  changeAccountPassword,
  findDemoAccount,
  GOOGLE_NONCE_STORAGE_KEY,
  GUEST_OAUTH_SIGNUP_PENDING,
  GUEST_SIGNUP_PENDING_KEY,
  hashString,
  resolveAuthDisplayName,
} from "@fitness-battle/shared";
import {
  DEMO_USER_COOKIE,
  isLocalHost,
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

export type OAuthSignInOptions = {
  next?: string | null;
  from?: "onboarding" | "signup";
};

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
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<{ error?: string }>;
  signInWithGoogle: (options?: OAuthSignInOptions) => Promise<{ error?: string }>;
  signInWithApple: (options?: OAuthSignInOptions) => Promise<{ error?: string }>;
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

function isSupabaseUnreachableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message);
}

function localDemoSignIn(email: string, password: string): { error?: string } {
  if (!email.trim() || password.length < 4) {
    return { error: "Enter an email and a password (4+ characters)." };
  }
  const next = demoUserFromEmail(email.trim().toLowerCase());
  writeDemoUser(next);
  return {};
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

function bindPendingOAuthSignupEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || typeof window === "undefined") return;
  try {
    if (localStorage.getItem(GUEST_SIGNUP_PENDING_KEY) === GUEST_OAUTH_SIGNUP_PENDING) {
      localStorage.setItem(GUEST_SIGNUP_PENDING_KEY, normalized);
    }
  } catch {
    // Ignore localStorage errors
  }
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
        bindPendingOAuthSignupEmail(sessionUser.email);
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? "",
          displayName: resolveAuthDisplayName(
            sessionUser.user_metadata,
            sessionUser.email,
          ),
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
        bindPendingOAuthSignupEmail(next.email);
        setUser((prev) => {
          const nextDisplayName = resolveAuthDisplayName(
            next.user_metadata,
            next.email,
          );
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
      catch { return { error: "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact." }; }
      const supabase = createClient();
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const onLocal =
            typeof window !== "undefined" && isLocalHost(window.location.hostname);
          if (onLocal && isSupabaseUnreachableError(error)) {
            const demo = localDemoSignIn(email, password);
            if (!demo.error) {
              setUser(demoUserFromEmail(email.trim().toLowerCase()));
              return {};
            }
            return demo;
          }
          return { error: error.message };
        }
        return {};
      } catch (err) {
        const onLocal =
          typeof window !== "undefined" && isLocalHost(window.location.hostname);
        if (onLocal && isSupabaseUnreachableError(err)) {
          const demo = localDemoSignIn(email, password);
          if (!demo.error) {
            setUser(demoUserFromEmail(email.trim().toLowerCase()));
            return {};
          }
          return demo;
        }
        return {
          error:
            err instanceof Error
              ? err.message
              : "Could not sign in. Check apps/web/.env.local or use .env.demo for offline login.",
        };
      }
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
      catch { return { error: "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact." }; }
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

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      confirmPassword: string,
    ) => {
      const client =
        offlineMode || !user || user.mode === "demo"
          ? null
          : (() => {
              const supabase = createClient();
              return {
                signInWithPassword: (creds: {
                  email: string;
                  password: string;
                }) => supabase.auth.signInWithPassword(creds),
                updateUser: (attrs: { password: string }) =>
                  supabase.auth.updateUser(attrs),
              };
            })();
      return changeAccountPassword(client, {
        user,
        offlineMode,
        currentPassword,
        newPassword,
        confirmPassword,
      });
    },
    [offlineMode, user],
  );

  const signInWithProvider = useCallback(
    async (
      provider: "google" | "apple",
      options?: OAuthSignInOptions,
    ): Promise<{ error?: string }> => {
      if (offlineMode) {
        return {
          error:
            "Google and Apple sign-in require a configured Supabase project. Use email sign-in in demo mode.",
        };
      }
      try {
        setLegacyBackup(archiveLegacyDemo());
      } catch {
        return {
          error:
            "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact.",
        };
      }
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";

      if (
        provider === "google" &&
        typeof window !== "undefined" &&
        typeof window.crypto?.randomUUID === "function" &&
        typeof window.crypto?.subtle?.digest === "function"
      ) {
        const rawNonce = window.crypto.randomUUID();
        const digest = await window.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(rawNonce),
        );
        const hashedNonce = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        try {
          sessionStorage.setItem(GOOGLE_NONCE_STORAGE_KEY, rawNonce);
        } catch {
          // Ignore sessionStorage errors
        }
        const authorizeUrl = buildGoogleIdTokenAuthorizeUrl({
          clientId: webEnv.googleClientId,
          redirectUri: `${origin}/auth/google`,
          hashedNonce,
          state: {
            next: options?.next ? resolveSafePostLoginPath(options.next) : undefined,
            from: options?.from,
          },
        });
        window.location.assign(authorizeUrl);
        return {};
      }

      const callbackUrl = new URL("/auth/callback", origin);
      if (options?.next) {
        callbackUrl.searchParams.set("next", resolveSafePostLoginPath(options.next));
      }
      if (options?.from) {
        callbackUrl.searchParams.set("from", options.from);
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) return { error: error.message };
      return {};
    },
    [offlineMode],
  );

  const signInWithGoogle = useCallback(
    (options?: OAuthSignInOptions) => signInWithProvider("google", options),
    [signInWithProvider],
  );

  const signInWithApple = useCallback(
    (options?: OAuthSignInOptions) => signInWithProvider("apple", options),
    [signInWithProvider],
  );

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
      changePassword,
      signInWithGoogle,
      signInWithApple,
      requireAuth,
    }),
    [
      user,
      loading,
      offlineMode,
      legacyBackup,
      signIn,
      signUp,
      signOut,
      changePassword,
      signInWithGoogle,
      signInWithApple,
      requireAuth,
    ],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
