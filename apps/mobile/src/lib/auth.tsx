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

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  mode: "supabase" | "demo";
};

type AuthApi = {
  user: AuthUser | null;
  loading: boolean;
  demoMode: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

function demoUserFromEmail(email: string, displayName?: string): AuthUser {
  const local = email.split("@")[0] || "Athlete";
  return {
    id: `demo-${hashString(email).toString(16)}`,
    email,
    displayName: displayName?.trim() || local,
    mode: "demo",
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
}): AuthUser {
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    displayName:
      (sessionUser.user_metadata?.display_name as string | undefined) ??
      sessionUser.email?.split("@")[0] ??
      "Athlete",
    mode: "supabase",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = mobileEnv.useDemoData;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (demoMode) {
        const demo = await readDemoUser();
        if (!cancelled) {
          setUser(demo);
          setAccessToken(null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      if (session?.user) {
        setUser(userFromSession(session.user));
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!nextSession?.user) {
          setUser(null);
          setAccessToken(null);
          return;
        }
        setUser(userFromSession(nextSession.user));
        setAccessToken(nextSession.access_token);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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
        setAccessToken(null);
        return {};
      }
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
    [demoMode],
  );

  const signOut = useCallback(async () => {
    if (demoMode) {
      await writeDemoUser(null);
      setUser(null);
      setAccessToken(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  }, [demoMode]);

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      demoMode,
      accessToken,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, demoMode, accessToken, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
