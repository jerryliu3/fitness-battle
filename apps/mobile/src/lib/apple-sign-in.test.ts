import { describe, expect, it, vi } from "vitest";
import {
  signInWithAppleNative,
  type AppleNativeSignInDeps,
} from "./apple-sign-in-flow";

function deps(overrides: Partial<AppleNativeSignInDeps> = {}): AppleNativeSignInDeps {
  return {
    isAvailable: vi.fn(async () => true),
    createNonce: vi.fn(async () => ({ raw: "raw-nonce", hashed: "hashed-nonce" })),
    signInAsync: vi.fn(async () => ({
      identityToken: "apple-id-token",
      fullName: { givenName: "Alex", familyName: "River" },
    })),
    signInWithIdToken: vi.fn(async () => ({})),
    maybeSetDisplayName: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("signInWithAppleNative", () => {
  it("exchanges the Apple ID token and stores the display name", async () => {
    const signInWithIdToken = vi.fn(async () => ({}));
    const maybeSetDisplayName = vi.fn(async () => undefined);
    const result = await signInWithAppleNative(
      deps({ signInWithIdToken, maybeSetDisplayName }),
    );
    expect(result).toEqual({});
    expect(signInWithIdToken).toHaveBeenCalledWith("apple-id-token", "raw-nonce");
    expect(maybeSetDisplayName).toHaveBeenCalledWith("Alex River");
  });

  it("returns cancelled when the user dismisses the sheet", async () => {
    const result = await signInWithAppleNative(
      deps({
        signInAsync: vi.fn(async () => ({ identityToken: null, canceled: true })),
      }),
    );
    expect(result).toEqual({ cancelled: true });
  });
});
