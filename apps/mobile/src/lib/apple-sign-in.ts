import type { SupabaseClient } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  signInWithAppleNative,
  type AppleNativeSignInDeps,
} from "./apple-sign-in-flow";

export { signInWithAppleNative, type AppleNativeSignInDeps } from "./apple-sign-in-flow";

export async function createAppleSignInNonce(): Promise<{ raw: string; hashed: string }> {
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
