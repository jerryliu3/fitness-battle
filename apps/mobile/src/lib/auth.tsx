import { archiveLegacyDemo } from "./legacy-demo";
import {
  accountDataOrigin,
  changeAccountPassword,
  GUEST_OAUTH_SIGNUP_PENDING,
  GUEST_SIGNUP_PENDING_KEY,
  hashString,
  isSupabaseConfigured,
  resolveAuthDisplayName,
} from "@fitness-battle/shared";
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
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  signInWithAppleNative,
  supabaseAppleNativeDeps,
} from "./apple-sign-in";
import { mobileEnv } from "./env";
import {
  signInWithProviderOAuth,
  supabaseProviderOAuthDeps,
} from "./oauth-sign-in";
import { supabase } from "./supabase";

const DEMO_KEY = "fb-demo-auth-v1";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  mode: "supabase" | "demo";
  createdAt?: string;
  dataOrigin?: "synthetic" | "recorded";
};

type AuthApi = {
  user: AuthUser | null;
  loading: boolean;
  offlineMode: boolean;
  legacyBackup: string | null;
  accessToken: string | null;
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
  signInWithGoogle: () => Promise<{ error?: string; cancelled?: boolean }>;
  signInWithApple: () => Promise<{ error?: string; cancelled?: boolean }>;
};

const AuthContext = createContext<AuthApi | null>(null);

function demoUserFromEmail(email: string, displayName?: string): AuthUser {
  const local = email.split("@")[0] || "Athlete";
  return {
    id: `demo-${hashString(email).toString(16)}`,
    email,
    displayName: displayName?.trim() || local,
    mode: "demo",
    dataOrigin: "synthetic",
  };
}

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

function userFromSession(sessionUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}): AuthUser {
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    displayName: resolveAuthDisplayName(
      sessionUser.user_metadata,
      sessionUser.email,
    ),
    mode: "supabase",
    dataOrigin: accountDataOrigin(sessionUser.id),
    createdAt: sessionUser.created_at,
  };
}

async function bindPendingOAuthSignupEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;
  try {
    const pending = await AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY);
    if (pending === GUEST_OAUTH_SIGNUP_PENDING) {
      await AsyncStorage.setItem(GUEST_SIGNUP_PENDING_KEY, normalized);
    }
  } catch {
    // Ignore AsyncStorage read/write failures
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const offlineMode = !isSupabaseConfigured(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [legacyBackup, setLegacyBackup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (offlineMode) {
        const demo = await readDemoUser();
        if (!cancelled) {
          setUser(demo);
          setAccessToken(null);
          setLoading(false);
        }
        return;
      }

      try { setLegacyBackup(await archiveLegacyDemo()); }
      catch { setLegacyBackup(null); setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      if (session?.user) {
        await bindPendingOAuthSignupEmail(session.user.email);
        if (cancelled) return;
        setUser(userFromSession(session.user));
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!nextSession?.user) {
            setUser(null);
            setAccessToken(null);
            return;
          }
          void bindPendingOAuthSignupEmail(nextSession.user.email).finally(() => {
            if (cancelled) return;
            setUser(userFromSession(nextSession.user));
            setAccessToken(nextSession.access_token);
          });
        },
      );
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
        const normalized = email.trim().toLowerCase();
        const existing = await readDemoUser();
        const next =
          existing?.email === normalized
            ? existing
            : demoUserFromEmail(normalized);
        await writeDemoUser(next);
        setUser(next);
        setAccessToken(null);
        return {};
      }
      try { setLegacyBackup(await archiveLegacyDemo()); }
      catch { return { error: "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact." }; }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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
          return { error: "Enter an email and a password (6+ characters)." };
        }
        const next = demoUserFromEmail(
          input.email.trim().toLowerCase(),
          input.displayName,
        );
        await writeDemoUser(next);
        setUser(next);
        setAccessToken(null);
        return {};
      }
      try { setLegacyBackup(await archiveLegacyDemo()); }
      catch { return { error: "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact." }; }
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            display_name:
              input.displayName.trim() || input.email.trim().split("@")[0],
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
      await writeDemoUser(null);
      setUser(null);
      setAccessToken(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  }, [offlineMode]);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      confirmPassword: string,
    ) =>
      changeAccountPassword(
        offlineMode || !user || user.mode === "demo"
          ? null
          : {
              signInWithPassword: (creds) =>
                supabase.auth.signInWithPassword(creds),
              updateUser: (attrs) => supabase.auth.updateUser(attrs),
            },
        { user, offlineMode, currentPassword, newPassword, confirmPassword },
      ),
    [offlineMode, user],
  );

  const prepareLiveSignIn = useCallback(async (): Promise<{ error?: string }> => {
    if (offlineMode) {
      return {
        error:
          "Google and Apple sign-in require a configured Supabase project. Use email sign-in in demo mode.",
      };
    }
    try {
      setLegacyBackup(await archiveLegacyDemo());
    } catch {
      return {
        error:
          "Your on-device backup could not be saved. Free device storage and try again; your existing data is intact.",
      };
    }
    return {};
  }, [offlineMode]);

  const finalizeLiveSignIn = useCallback(
    async (result: { error?: string; cancelled?: boolean }) => {
      if (!result.error && !result.cancelled) {
        const { data } = await supabase.auth.getSession();
        await bindPendingOAuthSignupEmail(data.session?.user?.email);
      }
      return result;
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const gate = await prepareLiveSignIn();
    if (gate.error) return gate;
    return finalizeLiveSignIn(
      await signInWithProviderOAuth("google", supabaseProviderOAuthDeps(supabase)),
    );
  }, [prepareLiveSignIn, finalizeLiveSignIn]);

  const signInWithApple = useCallback(async () => {
    const gate = await prepareLiveSignIn();
    if (gate.error) return gate;

    if (Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync())) {
      return finalizeLiveSignIn(
        await signInWithAppleNative(supabaseAppleNativeDeps(supabase)),
      );
    }
    return finalizeLiveSignIn(
      await signInWithProviderOAuth("apple", supabaseProviderOAuthDeps(supabase)),
    );
  }, [prepareLiveSignIn, finalizeLiveSignIn]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      offlineMode,
      legacyBackup,
      accessToken,
      signIn,
      signUp,
      signOut,
      changePassword,
      signInWithGoogle,
      signInWithApple,
    }),
    [
      user,
      loading,
      offlineMode,
      legacyBackup,
      accessToken,
      signIn,
      signUp,
      signOut,
      changePassword,
      signInWithGoogle,
      signInWithApple,
    ],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
