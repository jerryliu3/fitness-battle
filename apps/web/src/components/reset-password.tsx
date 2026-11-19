"use client";

import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";
import { AppParagraph } from "@/ui/section";
import { Sheet } from "@/ui/sheet";
import {
  EMPTY_PASSWORD_DRAFT,
  MIN_PASSWORD_LENGTH,
  PASSWORD_FIELDS,
  validatePasswordChange,
  type PasswordChangeInput,
} from "@fitness-battle/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function ResetPassword() {
  const { user, offlineMode, changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PasswordChangeInput>(EMPTY_PASSWORD_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const flight = useRef(false);
  const mounted = useRef(true);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;

  const live = Boolean(user) && !offlineMode && user?.mode !== "demo";
  const ready = Boolean(draft.currentPassword && draft.newPassword && draft.confirmPassword);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function clearDraft() {
    setDraft(EMPTY_PASSWORD_DRAFT);
    setError("");
    setSaved(false);
  }

  useEffect(() => {
    setOpen(false);
    clearDraft();
  }, [user?.id]);

  function closeSheet() {
    if (busy) return;
    setOpen(false);
    clearDraft();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (flight.current || !user) return;
    const validationError = validatePasswordChange(draft);
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
      const result = await changePassword(draft.currentPassword, draft.newPassword, draft.confirmPassword);
      if (!mounted.current || ownerRef.current !== id) return;
      if (result.error) {
        setError(result.error);
        void playCue("error");
        return;
      }
      setDraft(EMPTY_PASSWORD_DRAFT);
      setSaved(true);
      void playCue("success");
    } catch (err) {
      if (mounted.current && ownerRef.current === id) {
        setError(err instanceof Error ? err.message : "Could not update password. Please try again.");
        void playCue("error");
      }
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="fb-btn-line" onClick={() => { clearDraft(); setOpen(true); }}>
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
            <AppParagraph typographyRole="caption" className="fb-note" role="status" aria-live="polite">
              Password updated. Use your new password the next time you sign in.
            </AppParagraph>
            <button type="button" className="fb-btn" onClick={closeSheet}>Done</button>
          </div>
        ) : !live ? (
          <AppParagraph typographyRole="caption" className="fb-note" style={{ marginTop: 16 }}>
            Sign in with a live account to reset your password.
          </AppParagraph>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {PASSWORD_FIELDS.map((field) => (
              <label key={field.key} className="fb-field">
                {field.label}
                <input
                  type="password"
                  autoComplete={field.autoComplete}
                  minLength={field.minLength}
                  required
                  value={draft[field.key]}
                  onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  disabled={busy}
                />
              </label>
            ))}
            {error ? (
              <AppParagraph typographyRole="body" className="fb-error" role="alert" aria-live="assertive">
                {error}
              </AppParagraph>
            ) : null}
            <button type="submit" className="fb-btn" disabled={busy || !ready}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}
