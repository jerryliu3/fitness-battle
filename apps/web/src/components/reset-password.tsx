"use client";

import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";
import { AppParagraph } from "@/ui/section";
import { Sheet } from "@/ui/sheet";
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordChange,
} from "@fitness-battle/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function ResetPassword() {
  const { user, offlineMode, changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const flight = useRef(false);
  const mounted = useRef(true);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;

  const live = Boolean(user) && !offlineMode && user?.mode !== "demo";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function clearDraft() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSaved(false);
  }

  useEffect(() => {
    setOpen(false);
    clearDraft();
  }, [user?.id]);

  function openSheet() {
    clearDraft();
    setOpen(true);
  }

  function closeSheet() {
    if (busy) return;
    setOpen(false);
    clearDraft();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current || !user) return;
    const validationError = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (validationError) {
      setError(validationError);
      void playCue("error");
      return;
    }

    const id = user.id;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      if (!mounted.current || ownerRef.current !== id) return;
      if (result.error) {
        setError(result.error);
        void playCue("error");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      void playCue("success");
    } catch (err) {
      if (mounted.current && ownerRef.current === id) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not update password. Please try again.",
        );
        void playCue("error");
      }
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="fb-btn-line" onClick={openSheet}>
        Reset password
      </button>
      <Sheet
        open={open}
        title="Reset password"
        body={
          saved
            ? "Your password has been updated."
            : `Verify your current password, then choose a new password (${MIN_PASSWORD_LENGTH}+ characters).`
        }
        onClose={closeSheet}
      >
        {saved ? (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <AppParagraph
              typographyRole="caption"
              className="fb-note"
              role="status"
              aria-live="polite"
            >
              Password updated. Use your new password the next time you sign in.
            </AppParagraph>
            <button type="button" className="fb-btn" onClick={closeSheet}>
              Done
            </button>
          </div>
        ) : !live ? (
          <AppParagraph
            typographyRole="caption"
            className="fb-note"
            style={{ marginTop: 16 }}
          >
            Sign in with a live account to reset your password.
          </AppParagraph>
        ) : (
          <form
            onSubmit={submit}
            style={{ display: "grid", gap: 12, marginTop: 16 }}
          >
            <label className="fb-field">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="fb-field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="fb-field">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy}
              />
            </label>
            {error ? (
              <AppParagraph
                typographyRole="body"
                className="fb-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </AppParagraph>
            ) : null}
            <button
              type="submit"
              className="fb-btn"
              disabled={
                busy || !currentPassword || !newPassword || !confirmPassword
              }
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}
