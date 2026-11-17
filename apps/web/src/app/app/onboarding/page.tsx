"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  detectDeviceTimeZone, guestIntroForAccount, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  nextDailyWaveWindowAt, waveTimeLabel, SPORTS, type ProfileGender, type SportId, type UnitSystem,
  parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, onboardingWeeklyVolumeUnit, type OnboardingWeeklyVolumes,
} from "@fitness-battle/shared";
import { TrackerConnections } from "@/features/you/you-route";
import { CountryCombobox } from "@/ui/country-combobox";
import { TimezoneCombobox } from "@/ui/timezone-combobox";
import { BackButton } from "@/ui/back-button";
import { AppHeading, AppParagraph } from "@/ui/section";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { OnboardingUnits } from "@/features/club/onboarding-units";
import { resolvePostOnboardingPath } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/client";
import { uploadWebProfileAvatar } from "@/lib/profile/avatar-upload";
import { EventRegistration } from "@/features/arena/event-registration";
import "@/features/arena/event-home.css";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import "@/features/club/onboarding.css";

const titles = ["Almost there! Final details", "Bring your training along.", "Your starting line is here."];
function Setup({ preview }: { preview: boolean }) {
  const { state, dispatch, loadStatus } = useCompete();
  const { user, offlineMode } = useAuth();
  const router = useRouter(), params = useSearchParams();
  const finished = useRef(false), top = useRef<HTMLElement>(null);
  const key = `onboarding-draft:v7:${user?.id ?? "guest"}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState<string | null>(null);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => () => { owner.current = undefined; }, []);
  const [name, setName] = useState(""), [city, setCity] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [countryCode, setCountryCode] = useState("");
  const [sport, setSport] = useState<SportId>("running");
  const [weeklyVolume, setWeeklyVolume] = useState<OnboardingWeeklyVolumes>({});
  const [units, setUnits] = useState<UnitSystem>("us");
  const [timezone, setTimezone] = useState(() => detectDeviceTimeZone());
  const [guestImported, setGuestImported] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);
  useEffect(() => {
    if (!state) return;
    let saved: Record<string, unknown> | null = null;
    let pending: string | null = null;
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (!preview && raw && typeof raw === "object") saved = raw as Record<string, unknown>;
      pending = localStorage.getItem(GUEST_SIGNUP_PENDING_KEY);
    } catch {}
    const guest = preview ? null : guestIntroForAccount(readGuestIntroDraft(), pending, user?.email);
    const initialSport = guest?.sport ?? state.primary;
    finished.current = false;
    const savedStep = Math.max(0, Math.min(3, Math.trunc(Number(saved?.step) || 0)));
    setStep(savedStep === 3 && !state.ratings.some(r => r.sport === initialSport && r.optedIn) ? 2 : savedStep);
    setName(typeof saved?.name === "string" ? saved.name : guest?.name || user?.displayName || state.name);
    setCity(typeof saved?.city === "string" ? saved.city : guest?.city ?? state.city ?? "");
    setGender(saved?.gender === "male" || saved?.gender === "female" || saved?.gender === "other" ? saved.gender : state.gender ?? "");
    setCountryCode(typeof saved?.countryCode === "string" ? saved.countryCode : guest?.countryCode ?? state.countryCode ?? "");
    setUnits(saved?.units === "us" || saved?.units === "metric" ? saved.units : state.units);
    setSport(initialSport);
    setWeeklyVolume(parseOnboardingWeeklyVolumes(saved?.weeklyVolume));
    setTimezone(typeof saved?.timezone === "string" ? saved.timezone : detectDeviceTimeZone());
    setGuestImported(Boolean(guest));
    setLoadedKey(key);
  }, [key, preview, user?.email, Boolean(state)]);
  useEffect(() => {
    if (loadedKey !== key || preview) return;
    try { sessionStorage.setItem(key, JSON.stringify({ step, name, city, gender, countryCode, units, timezone, weeklyVolume })); } catch {}
  }, [loadedKey, key, preview, step, name, city, gender, countryCode, units, timezone, weeklyVolume]);
  useEffect(() => {
    if (!preview && state?.onboardingCompleted) router.replace(resolvePostOnboardingPath(params.get("next")));
  }, [preview, state?.onboardingCompleted, params, router]);
  if (!state || loadedKey !== key) return <AppParagraph>Loading setup…</AppParagraph>;
  const sportName = SPORTS.find(item => item.id === sport)!.name;
  const canWrite = loadStatus === "ready" || loadStatus === "local";
  function advance() { setStep(Math.min(2, step + 1)); }
  async function finish() {
    if (preview) { setStep(3); return; }
    if (!user || !state || !canWrite || finished.current) return;
    finished.current = true;
    setSaving(true); setSaveError(null);
    try {
      const guest = guestIntroForAccount(readGuestIntroDraft(), localStorage.getItem(GUEST_SIGNUP_PENDING_KEY), user.email);
      if (guest?.photo) {
        const blob = await (await fetch(guest.photo)).blob();
        const avatarUrl = offlineMode ? guest.photo : await uploadWebProfileAvatar({ file: new File([blob], "athlete.jpg", { type: "image/jpeg" }), userId: user.id, previousAvatarUrl: state.avatarUrl, supabase: createClient(), requireStorage: true });
        if (owner.current !== user.id) return;
        dispatch({ type: "set-avatar", avatarUrl, accountId: user.id });
      }
    } catch (err) {
      finished.current = false;
      setSaveError(err instanceof Error ? err.message : "Could not save your photo. Please try again.");
      return;
    } finally { setSaving(false); }
    if (owner.current !== user.id) return;
    dispatch({ type: "rename", name: name.trim() });
    dispatch({ type: "set-city", city: city.trim() });
    if (gender) dispatch({ type: "set-gender", gender });
    if (countryCode) dispatch({ type: "set-country", countryCode });
    dispatch({ type: "set-units", units });
    dispatch({ type: "set-timezone", timezone });
    const declaredWeeklyVolume = onboardingDeclaredVolume(sport, weeklyVolume[sport], units);
    if (declaredWeeklyVolume !== undefined) dispatch({ type: "declare-effort", sport, declaredWeeklyVolume });
    dispatch({ type: "opt-in", sport, accountId: user.id });
    dispatch({ type: "set-primary", sport });
    setStep(3);
  }
  function complete() {
    if (preview) { router.replace("/app/arena"); return; }
    dispatch({ type: "complete-onboarding" });
    try {
      sessionStorage.removeItem(key);
      if (guestImported) { localStorage.removeItem(GUEST_INTRO_DRAFT_KEY); localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); }
    } catch {}
    router.replace(resolvePostOnboardingPath(params.get("next")));
  }
  return <section ref={top} className="onboarding fb-stack">
    <div className="onboarding-progress" role="img" aria-label={`Setup step ${step + 1} of 4`}>
      {[0, 1, 2, 3].map(i => <span key={i} data-complete={i <= step} />)}
    </div>
    {step < 3 && <AppHeading level={1} role="display">{titles[step]}</AppHeading>}
    {step === 0 && <>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        <label className="fb-field">City (optional)<input value={city} onChange={e => setCity(e.target.value)} maxLength={80} /></label>
        <CountryCombobox label="Country (optional)" value={countryCode} onChange={setCountryCode} />
      </div>
      <label className="fb-field">Gender (optional)<select value={gender} onChange={e => setGender(e.target.value as ProfileGender | "")}>
        <option value="">Gender (optional)</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
      </select></label>
      <TimezoneCombobox value={timezone} onChange={setTimezone} />
      <OnboardingUnits value={units} onChange={setUnits} />
    </>}
    {step === 1 && <>
      <AppParagraph>Connect your tracker to bring your training along. You can also connect later.</AppParagraph>
      {!preview && <TrackerConnections />}
    </>}
    {step === 2 && <>
      <AppParagraph>Your {sportName.toLowerCase()} event registers for the next wave. You can register for more events in the app.</AppParagraph>
      <label className="fb-field">Typical weekly {sportName.toLowerCase()} ({onboardingWeeklyVolumeUnit(sport, units)})
        <input type="number" inputMode="decimal" min="0" step="any" aria-label={`Typical weekly ${sport}`}
          placeholder="Optional · 0 if just starting" value={weeklyVolume[sport] ?? ""}
          onChange={e => setWeeklyVolume(current => ({ ...current, [sport]: e.target.value }))} />
      </label>
      <AppParagraph typographyRole="label">Next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart, timezone)}.</AppParagraph>
    </>}
    {step === 3 && <>
      <AppParagraph>You’re registered for {sportName.toLowerCase()}. You can register for more events in the app.</AppParagraph>
      <EventRegistration state={state} event={sport} registered confirmationOnly busy={false} error="" onClaim={() => {}} onView={complete} />
    </>}
    {saveError && <AppParagraph role="alert">{saveError}</AppParagraph>}
    {step < 3 && <div className="onboarding-actions">
      {step > 0 && <BackButton disabled={saving} onClick={() => setStep(step - 1)} />}
      <button className="fb-btn" type="button" disabled={saving || (step === 2 && !preview && !canWrite)} onClick={() => step < 2 ? advance() : finish()}>
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>}
  </section>;
}
function Entry() {
  const preview = useSearchParams().get("preview") === "1";
  return preview ? <Setup preview /> : <AuthGate reason="Sign in to save your preferences and join your first field."><Setup preview={false} /></AuthGate>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<AppParagraph>Loading setup…</AppParagraph>}><Entry /></Suspense>;
}
