import type { SupabaseClient } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";

export type AppleNativeSignInDeps = {
  isAvailable: () => Promise<boolean>;
  createNonce: () => Promise<{ raw: string; hashed: string }>;
  signInAsync: (hashedNonce: string) => Promise<{
    identityToken: string | null;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    canceled?: boolean;
  }>;
  signInWithIdToken: (token: string, rawNonce: string) => Promise<{ error?: string | null }>;
  maybeSetDisplayName: (name: string) => Promise<void>;
};

export async function signInWithAppleNative(
  deps: AppleNativeSignInDeps,
): Promise<{ error?: string; cancelled?: boolean }> {
  if (!(await deps.isAvailable())) {
    return { error: "Apple sign-in is not available on this device." };
  }

  const { raw, hashed } = await deps.createNonce();
  const credential = await deps.signInAsync(hashed);
  if (credential.canceled) return { cancelled: true };

  const token = credential.identityToken;
  if (!token) return { error: "Apple did not return a sign-in token." };

  const { error } = await deps.signInWithIdToken(token, raw);
  if (error) return { error };

  const given = credential.fullName?.givenName?.trim();
  const family = credential.fullName?.familyName?.trim();
  const displayName = [given, family].filter(Boolean).join(" ").trim();
  if (displayName) await deps.maybeSetDisplayName(displayName);

  return {};
}

export async function createAppleSignInNonce(): Promise<{ raw: string; hashed: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require("expo-crypto") as typeof import("expo-crypto");
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw,
  );
  return { raw, hashed };
}

export function supabaseAppleNativeDeps(client: SupabaseClient): AppleNativeSignInDeps {
  return {
    isAvailable: () => AppleAuthentication.isAvailableAsync(),
    createNonce: createAppleSignInNonce,
    signInAsync: async (hashedNonce) => {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        return {
          identityToken: credential.identityToken,
          fullName: credential.fullName,
        };
      } catch (error) {
        const code =
          error instanceof Error && "code" in error
            ? (error as { code?: string }).code
            : undefined;
        if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") {
          return { identityToken: null, canceled: true };
        }
        throw error;
      }
    },
    signInWithIdToken: async (token, rawNonce) => {
      const { error } = await client.auth.signInWithIdToken({
        provider: "apple",
        token,
        nonce: rawNonce,
      });
      return { error: error?.message ?? null };
    },
    maybeSetDisplayName: async (name) => {
      const trimmed = name.trim().slice(0, 80);
      if (!trimmed) return;
      const { data } = await client.auth.updateUser({
        data: { display_name: trimmed, full_name: trimmed },
      });
      if (data.user?.id) {
        await client
          .from("profiles")
          .update({ display_name: trimmed })
          .eq("id", data.user.id);
      }
    },
  };
}
