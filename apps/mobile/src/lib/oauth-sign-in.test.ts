import { describe, expect, it, vi } from "vitest";
import {
  authCodeFromOAuthReturnUrl,
  parseOAuthReturnUrl,
  signInWithProviderOAuth,
  type ProviderOAuthDeps,
} from "./oauth-sign-in";

describe("authCodeFromOAuthReturnUrl", () => {
  it("reads code from query string", () => {
    expect(
      authCodeFromOAuthReturnUrl("overtaek://auth/callback?code=abc123"),
    ).toBe("abc123");
  });

  it("reads code from hash fragment", () => {
    expect(
      authCodeFromOAuthReturnUrl("overtaek://auth/callback#code=hash-code"),
    ).toBe("hash-code");
  });

  it("reads implicit access_token and refresh_token from hash fragment", () => {
    expect(
      parseOAuthReturnUrl(
        "overtaek://auth/callback#access_token=tok-1&refresh_token=ref-2&token_type=bearer",
      ),
    ).toEqual({
      code: null,
      idToken: null,
      accessToken: "tok-1",
      refreshToken: "ref-2",
      error: null,
    });
  });

  it("reads OIDC id_token from hash fragment", () => {
    expect(
      parseOAuthReturnUrl("overtaek://auth/callback#id_token=google-jwt"),
    ).toEqual({
      code: null,
      idToken: "google-jwt",
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  });
});

function deps(overrides: Partial<ProviderOAuthDeps> = {}): ProviderOAuthDeps {
  return {
    getRedirectUri: () => "overtaek://auth/callback",
    startOAuth: vi.fn(async () => ({ url: "https://auth.example/authorize" })),
    openAuthSession: vi.fn(async () => ({
      type: "success",
      url: "overtaek://auth/callback?code=session-code",
    })),
    exchangeCodeForSession: vi.fn(async () => ({})),
    signInWithIdToken: vi.fn(async () => ({})),
    setSession: vi.fn(async () => ({})),
    ...overrides,
  };
}

describe("signInWithProviderOAuth", () => {
  it("exchanges a direct Google OIDC id_token with its raw nonce", async () => {
    const signInWithIdToken = vi.fn(async () => ({}));
    const result = await signInWithProviderOAuth(
      "google",
      deps({
        createGoogleOAuthUrl: vi.fn(async () => ({
          url: "https://accounts.google.com/o/oauth2/v2/auth",
          rawNonce: "raw-nonce-1",
        })),
        openAuthSession: vi.fn(async () => ({
          type: "success",
          url: "overtaek://auth/callback#id_token=google-id-token",
        })),
        signInWithIdToken,
      }),
    );
    expect(result).toEqual({});
    expect(signInWithIdToken).toHaveBeenCalledWith(
      "google",
      "google-id-token",
      "raw-nonce-1",
    );
  });
  it("exchanges a successful session code", async () => {
    const exchange = vi.fn(async () => ({}));
    const result = await signInWithProviderOAuth(
      "google",
      deps({ exchangeCodeForSession: exchange }),
    );
    expect(result).toEqual({});
    expect(exchange).toHaveBeenCalledWith("session-code");
  });

  it("sets session when implicit tokens are returned in the hash", async () => {
    const setSession = vi.fn(async () => ({}));
    const result = await signInWithProviderOAuth(
      "google",
      deps({
        openAuthSession: vi.fn(async () => ({
          type: "success",
          url: "overtaek://auth/callback#access_token=acc-1&refresh_token=ref-1",
        })),
        setSession,
      }),
    );
    expect(result).toEqual({});
    expect(setSession).toHaveBeenCalledWith("acc-1", "ref-1");
  });

  it("recovers late Android deep links delivered via onAppUrl after dismiss", async () => {
    const exchange = vi.fn(async () => ({}));
    const result = await signInWithProviderOAuth(
      "google",
      deps({
        exchangeCodeForSession: exchange,
        returnUrlWaitMs: 50,
        onAppUrl: (handler) => {
          setTimeout(() => {
            handler("overtaek://auth/callback?code=late-android-code");
          }, 5);
          return () => {};
        },
        openAuthSession: vi.fn(async () => ({ type: "dismiss" })),
      }),
    );
    expect(result).toEqual({});
    expect(exchange).toHaveBeenCalledWith("late-android-code");
  });

  it("reports cancellation", async () => {
    const result = await signInWithProviderOAuth(
      "google",
      deps({
        openAuthSession: vi.fn(async () => ({ type: "cancel" })),
      }),
    );
    expect(result).toEqual({ cancelled: true });
  });

  it("surfaces start errors", async () => {
    const result = await signInWithProviderOAuth(
      "google",
      deps({
        startOAuth: vi.fn(async () => ({ error: "Provider disabled" })),
      }),
    );
    expect(result).toEqual({ error: "Provider disabled" });
  });

  it("surfaces callback URL OAuth errors", async () => {
    const result = await signInWithProviderOAuth(
      "apple",
      deps({
        openAuthSession: vi.fn(async () => ({
          type: "success",
          url: "overtaek://auth/callback?error=access_denied&error_description=User+cancelled+login",
        })),
      }),
    );
    expect(result).toEqual({ error: "User cancelled login" });
  });
});
