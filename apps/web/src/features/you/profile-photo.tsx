"use client";
import { useEffect, useRef, useState } from "react";
import { PERSON_ICON_PATH, type CompeteState } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { createClient } from "@/lib/supabase/client";
import { uploadWebProfileAvatar, removeWebProfileAvatar } from "@/lib/profile/avatar-upload";
import { Sheet } from "@/ui/sheet";

/** Shared by Athlete and onboarding; all storage writes use the existing avatar helpers. */
export function ProfilePhoto({ state, email }: { state: CompeteState; email?: string | null }) {
  const { user } = useAuth();
  const { dispatch } = useCompete();
  const [open, setOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flight = useRef(false);
  const owner = useRef({ id: user?.id });
  if (owner.current.id !== user?.id) owner.current = { id: user?.id };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function onAvatarChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (flight.current) return;
    flight.current = true;
    const account = owner.current;
    const isCurrent = () => mounted.current && owner.current === account;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!isCurrent() || (user && user.id !== account.id)) return;
      const newUrl = await uploadWebProfileAvatar({
        file,
        userId: user?.id,
        previousAvatarUrl: state.avatarUrl,
        supabase,
        // Signed-in athletes (email present) must use storage — never data URLs.
        requireStorage: Boolean(email),
      });
      if (isCurrent()) dispatch({ type: "set-avatar", avatarUrl: newUrl, accountId: account.id });
    } catch (err) {
      if (isCurrent()) setAvatarError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      flight.current = false;
      if (isCurrent()) setAvatarBusy(false);
      if (isCurrent() && fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemovePhoto() {
    if (flight.current) return;
    flight.current = true;
    const account = owner.current;
    const isCurrent = () => mounted.current && owner.current === account;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!isCurrent() || (user && user.id !== account.id)) return;
      await removeWebProfileAvatar({
        userId: user?.id,
        previousAvatarUrl: state.avatarUrl,
        supabase,
      });
      if (isCurrent()) dispatch({ type: "set-avatar", avatarUrl: null, accountId: account.id });
    } catch (err) {
      if (isCurrent()) setAvatarError(
        err instanceof Error ? err.message : "Failed to remove photo.",
      );
    } finally {
      flight.current = false;
      if (isCurrent()) setAvatarBusy(false);
    }
  }

  return <div className="club-profile-photo">
    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onAvatarChosen} />
    <button type="button" className="focus-portrait" aria-label="Profile photo options" disabled={avatarBusy} onClick={() => setOpen(true)}>
      {state.avatarUrl ? <img src={state.avatarUrl} alt="" className="focus-portrait-img" /> :
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PERSON_ICON_PATH} /></svg>}
    </button>
    {avatarError && <p role="alert" className="fb-error">{avatarError}</p>}
    <Sheet open={open} title="Profile photo" body="" onClose={() => setOpen(false)}>
      <button type="button" className="fb-btn" disabled={avatarBusy} onClick={() => { setOpen(false); fileInputRef.current?.click(); }}>Choose photo</button>
      {state.avatarUrl && <button type="button" className="fb-btn-line" disabled={avatarBusy} onClick={() => { setOpen(false); void onRemovePhoto(); }}>Delete photo</button>}
      <button type="button" className="fb-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
    </Sheet>
  </div>;
}
