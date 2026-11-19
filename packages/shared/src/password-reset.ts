export const MIN_PASSWORD_LENGTH = 6;

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const EMPTY_PASSWORD_DRAFT: PasswordChangeInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const PASSWORD_FIELDS = [
  {
    key: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
    textContentType: "password",
    minLength: undefined,
  },
  {
    key: "newPassword",
    label: "New password",
    autoComplete: "new-password",
    textContentType: "newPassword",
    minLength: MIN_PASSWORD_LENGTH,
  },
  {
    key: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
    textContentType: "newPassword",
    minLength: MIN_PASSWORD_LENGTH,
  },
] as const;

export interface PasswordChangeAuthClient {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ error: { message?: string } | null }>;
  updateUser(attributes: {
    password: string;
  }): Promise<{ error: { message?: string } | null }>;
}

export interface AccountPasswordChangeParams extends PasswordChangeInput {
  user: { email?: string | null; mode?: "supabase" | "demo" } | null;
  offlineMode: boolean;
}

/** Validate current, new, and confirmation passwords for a signed-in reset. */
export function validatePasswordChange(
  input: PasswordChangeInput,
): string | null {
  if (!input.currentPassword) {
    return "Enter your current password.";
  }
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (input.newPassword !== input.confirmPassword) {
    return "New passwords do not match.";
  }
  if (input.newPassword === input.currentPassword) {
    return "New password must be different from your current password.";
  }
  return null;
}

/** Verify the current password and update to the new password on a live account. */
export async function changeAccountPassword(
  client: PasswordChangeAuthClient | null,
  params: AccountPasswordChangeParams,
): Promise<{ error?: string }> {
  if (!params.user?.email) {
    return { error: "Sign in to reset your password." };
  }
  if (params.offlineMode || params.user.mode === "demo" || !client) {
    return { error: "Password reset requires a live signed-in account." };
  }

  const validationError = validatePasswordChange(params);
  if (validationError) {
    return { error: validationError };
  }

  try {
    const { error: verifyError } = await client.signInWithPassword({
      email: params.user.email,
      password: params.currentPassword,
    });
    if (verifyError) {
      const message = verifyError.message ?? "";
      if (/invalid login credentials|invalid credentials/i.test(message)) {
        return { error: "Current password is incorrect." };
      }
      return {
        error: message || "Could not verify your current password.",
      };
    }

    const { error: updateError } = await client.updateUser({
      password: params.newPassword,
    });
    if (updateError) {
      return {
        error:
          updateError.message || "Could not update password. Please try again.",
      };
    }

    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not update password. Please try again.",
    };
  }
}
