import { describe, expect, it, vi } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  changeAccountPassword,
  validatePasswordChange,
} from "./password-reset";

describe("validatePasswordChange", () => {
  it("requires the current password", () => {
    expect(
      validatePasswordChange({
        currentPassword: "",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toBe("Enter your current password.");
  });

  it("enforces the minimum password length", () => {
    expect(
      validatePasswordChange({
        currentPassword: "old-password",
        newPassword: "short",
        confirmPassword: "short",
      }),
    ).toBe(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  });

  it("requires matching confirmation", () => {
    expect(
      validatePasswordChange({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "other-password",
      }),
    ).toBe("New passwords do not match.");
  });

  it("rejects reusing the current password", () => {
    expect(
      validatePasswordChange({
        currentPassword: "same-password",
        newPassword: "same-password",
        confirmPassword: "same-password",
      }),
    ).toBe("New password must be different from your current password.");
  });

  it("accepts a valid password change", () => {
    expect(
      validatePasswordChange({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toBeNull();
  });
});

describe("changeAccountPassword", () => {
  const liveUser = { email: "athlete@example.com", mode: "supabase" as const };

  it("requires a signed-in user with an email", async () => {
    const client = {
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
    };
    expect(
      await changeAccountPassword(client, {
        user: null,
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Sign in to reset your password." });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects offline or demo accounts", async () => {
    const client = {
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
    };
    expect(
      await changeAccountPassword(client, {
        user: { email: "athlete@example.com", mode: "demo" },
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Password reset requires a live signed-in account." });
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: true,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Password reset requires a live signed-in account." });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
  });

  it("stops on validation failure without calling auth", async () => {
    const client = {
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
    };
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "mismatch",
      }),
    ).toEqual({ error: "New passwords do not match." });
    expect(client.signInWithPassword).not.toHaveBeenCalled();
    expect(client.updateUser).not.toHaveBeenCalled();
  });

  it("returns a friendly error when current password verification fails", async () => {
    const client = {
      signInWithPassword: vi.fn(async () => ({
        error: { message: "Invalid login credentials" },
      })),
      updateUser: vi.fn(),
    };
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: false,
        currentPassword: "wrong-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Current password is incorrect." });
    expect(client.updateUser).not.toHaveBeenCalled();
  });

  it("surfaces updateUser failures", async () => {
    const client = {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({
        error: { message: "Password is too weak." },
      })),
    };
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Password is too weak." });
  });

  it("verifies current password then updates to the new password", async () => {
    const client = {
      signInWithPassword: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
    };
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({});
    expect(client.signInWithPassword).toHaveBeenCalledWith({
      email: "athlete@example.com",
      password: "old-password",
    });
    expect(client.updateUser).toHaveBeenCalledWith({
      password: "new-password",
    });
  });

  it("handles unexpected thrown errors cleanly", async () => {
    const client = {
      signInWithPassword: vi.fn(async () => {
        throw new Error("Network request failed");
      }),
      updateUser: vi.fn(),
    };
    expect(
      await changeAccountPassword(client, {
        user: liveUser,
        offlineMode: false,
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ error: "Network request failed" });
  });
});
